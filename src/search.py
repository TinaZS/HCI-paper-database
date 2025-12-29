import faiss
import numpy as np
from supabase_client import supabase 
import time
import openai
import os
from dotenv import load_dotenv
import sys

from src.construct_profile import construct_user_profile
from concurrent.futures import ThreadPoolExecutor
import zlib
import base64
from qdrant_client.models import Filter, FieldCondition, MatchValue

load_dotenv()

# Azure OpenAI Configuration from .env
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = "2023-05-15"
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "papers")



client = openai.AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION
)


def get_openai_embedding(text):
    """Get embedding from Azure OpenAI using full 1536 dimensions."""
    response = client.embeddings.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        input=text,
        encoding_format="float" 
    )

    print(f'Azure open ai deployment name: {AZURE_OPENAI_DEPLOYMENT}')

    embedding = np.array(response.data[0].embedding, dtype=np.float32)  # Ensure float32 format

    #take out this statement later
    assert embedding.shape[0] == 1536, f"Unexpected embedding dimension: {embedding.shape[0]}"

    return embedding.reshape(1, -1)  


def qdrant_search_all_shards(query_embedding, clients, k=6, topic=""):
    """Search all Qdrant shards and merge results."""
    all_hits = []
    vector = query_embedding.flatten().tolist()
    
    # Filter for topic if provided (Qdrant filter)
    qdrant_filter = None
    if topic:
        qdrant_filter = Filter(
            must=[
                FieldCondition(
                    key="categories",
                    match=MatchValue(value=topic)
                )
            ]
        )

    for idx, client in enumerate(clients):
        shard_start = time.perf_counter()
        try:
            # Use query_points (recommended API for 1.10+)
            results = client.query_points(
                collection_name=QDRANT_COLLECTION,
                query=vector,
                query_filter=qdrant_filter,
                limit=k,
                with_payload=True,
                with_vectors=False
            ).points
            shard_q_done = time.perf_counter()
            
            for hit in results:
                paper = hit.payload
                paper["similarity_score"] = hit.score
                # paper["embedding"] = hit.vector # No longer needed for frontend display
                
                # Decompress abstract if it was stored compressed
                if paper.get("compressed"):
                    try:
                        compressed_data = base64.b64decode(paper["abstract"])
                        paper["abstract"] = zlib.decompress(compressed_data).decode('utf-8')
                    except Exception as e:
                        print(f"⚠️ Decompression error: {e}")

                # Defensive formatting for frontend
                cats = paper.get("categories", [])
                paper["categories"] = cats.split() if isinstance(cats, str) else cats
                
                # Map standardized keys for frontend consistency
                if "published" in paper:
                    paper["published_date"] = paper["published"]
                # If published_date already exists from Qdrant shard, keep it
                
                all_hits.append(paper)
            
            shard_total = time.perf_counter() - shard_start
            q_time = shard_q_done - shard_start
            print(f"   ⏱️ Shard {idx+1} Total: {shard_total*1000:.2f}ms (Qdrant: {q_time*1000:.2f}ms, Processing: {(shard_total-q_time)*1000:.2f}ms)")

        except Exception as e:
            print(f"⚠️ Error searching Qdrant shard: {e}")

    # Merge and sort by score
    all_hits = sorted(all_hits, key=lambda x: x["similarity_score"], reverse=True)
    return all_hits[:k]


#add user id as an input to search
def search(query, index, k=6, embedState=False,topic="",user_id="", qdrant_clients=None):
    """
    Search using either FAISS (if index provided) or Qdrant (if qdrant_clients provided).
    Converts a text query to an embedding and fetches results.
    """
    
    first_time=time.time()
    first_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(first_time)) + f".{int((first_time % 1) * 1000):03d}"
    print(f"Timestamp at start of inner search function: {first_timestamp}")

    # --- Parallel Fetch Phase ---
    with ThreadPoolExecutor() as executor:
        # 1. Start Azure Embedding
        az_future = executor.submit(get_openai_embedding, query) if not embedState else None
        
        # 2. Start Supabase Personalization (if logged in)
        sb_future = None
        if user_id:
            print("🔐 Logged-in user – attempting to personalize")
            def fetch_likes(uid):
                sb_start = time.perf_counter()
                res = supabase.table("likes").select("paper_id, reaction_type,created_at, new_papers(title, authors, abstract, published_date, link, categories, embedding)").eq("user_id", uid).eq("reaction_type", "like").execute()
                return res, time.perf_counter() - sb_start
            sb_future = executor.submit(fetch_likes, user_id)

        # Wait for Azure
        emb_start_perf = time.perf_counter()
        if az_future:
            query_embedding = az_future.result()
            print(f"   ⏱️ Azure Embedding (Async wait): {(time.perf_counter() - emb_start_perf)*1000:.2f}ms")
        else:
            query_embedding = np.array(query).reshape(1, -1)

        # Wait for Supabase & Process Personalization
        if sb_future:
            response, sb_time = sb_future.result()
            print(f"   ⏱️ Supabase Likes Fetch (Async wait): {sb_time*1000:.2f}ms")
            
            if response.data:
                print(f"✅ {len(response.data)} liked papers found for user {user_id}")
                perf_profile_start = time.perf_counter()
                papers = [
                    {
                        "paper_id": row["paper_id"],
                        "created_at": row["created_at"],
                        "embedding": row["new_papers"]["embedding"]
                    }
                    for row in response.data
                ]
                user_profile_embeddings = construct_user_profile(papers)
                print(f"   ⏱️ Personalization Profile Build: {(time.perf_counter() - perf_profile_start)*1000:.2f}ms")
                
                # ✨ Blend current query and user profile
                query_embedding = 0.9 * query_embedding + 0.1 * user_profile_embeddings
            else:
                print("⚠️ No liked papers found. Continuing with regular search.")
        else:
            print("Guest user: skipping personalization.")

    #return None

    embedding_time=time.time()
    embedding_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(embedding_time)) + f".{int((embedding_time % 1) * 1000):03d}"
    print(f"Timestamp at middle of inner search function: {embedding_timestamp}")

    # --- Qdrant Path ---
    if qdrant_clients:
        print(f"🌐 Searching Qdrant collection '{QDRANT_COLLECTION}' across {len(qdrant_clients)} shards")
        results = qdrant_search_all_shards(query_embedding, qdrant_clients, k, topic)
        
        for result in results:
            result["similarity_score"] = round(result["similarity_score"], 2)
        
        return results

    # --- Legacy FAISS Path ---
    results = []
    attempt_size = 5 * k  # Always over-fetch, topic or not
    max_attempts = 5  # Limit retries to prevent infinite loops
    attempt_count = 0

    while len(results) < k and attempt_count < max_attempts:
        # Step 2: Search FAISS with larger search pool if needed
        distances, indices = index.search(query_embedding.astype(np.float32), attempt_size)
        
        if indices[0][0] == -1:
            print("No matching papers found.")
            return []
        
        faiss_ids = [int(idx) for idx in indices[0] if idx != -1]  # Remove -1 results

        # Step 3: Fetch metadata from Supabase
        response = supabase.table("new_papers") \
            .select("faiss_id", "paper_id", "title", "authors", "abstract", "link", "published_date", "categories", "embedding") \
            .in_("faiss_id", faiss_ids) \
            .execute()
        
        if not response.data:
            break

        # Step 4: Filter based on topic AFTER fetching from Supabase
        filtered_results = []
        scores_dict = {indices[0][i]: distances[0][i] for i in range(len(distances[0]))}

        for paper in response.data:
            faiss_id = paper["faiss_id"]
            if faiss_id in scores_dict:
                paper["similarity_score"] = float(scores_dict[faiss_id])

            if topic:
                # Check if topic is part of the categories list
                if topic in paper.get("categories", []):
                    filtered_results.append(paper)

            else:
                filtered_results.append(paper)

            # Remove FAISS IDs from response
            del paper["faiss_id"]

        # Step 5: Merge filtered results and check if enough are found
        results.extend(filtered_results)

        # If we have enough valid results, stop searching
        if len(results) >= k:
            break

        # Step 6: If not enough results, increase the search pool and retry
        attempt_size *= 2
        attempt_count += 1
        print("Attempt size is ",attempt_size)
        print("Attempt count is ",attempt_count)
    
    
    # Sorting the results by similarity_score in descending order
    results = sorted(results, key=lambda x: x['similarity_score'], reverse=True)

    for result in results:
        result["similarity_score"] = round(result["similarity_score"],2)
    
    results=results[:k]

    return results