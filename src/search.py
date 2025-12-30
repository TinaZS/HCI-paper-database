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


def hydrate_papers(client, point_ids):
    """Fetch full payload for specific IDs from a single shard."""
    if not point_ids: return []
    try:
        results = client.retrieve(
            collection_name=QDRANT_COLLECTION,
            ids=point_ids,
            with_payload=True,
            with_vectors=True
        )
        return results
    except Exception as e:
        print(f"⚠️ Hydration error: {e}")
        return []

def qdrant_search_parallel(query_embedding, clients, k=6, topic=""):
    """
    Search all shards in parallel using ID-First strategy.
    1. Broadcast ID-only query to all shards (Parallel)
    2. Merge scores locally
    3. Hydrate only the top K winners (Parallel)
    """
    vector = query_embedding.flatten().tolist()
    
    # Filter setup
    qdrant_filter = None
    if topic:
        qdrant_filter = Filter(
            must=[FieldCondition(key="categories", match=MatchValue(value=topic))]
        )

    # --- Step 1: Parallel ID Search (Lightweight) ---
    all_scored_points = []
    
    def search_shard_ids(idx, client):
        start = time.perf_counter()
        try:
            res = client.query_points(
                collection_name=QDRANT_COLLECTION,
                query=vector,
                query_filter=qdrant_filter,
                limit=k,
                with_payload=False, # ID & Score only
                with_vectors=False
            ).points
            dur = (time.perf_counter() - start) * 1000
            print(f"   ⚡ Shard {idx+1} ID-Search: {dur:.2f}ms")
            return [(hit.id, hit.score, idx) for hit in res]
        except Exception as e:
            print(f"⚠️ Error querying Shard {idx+1}: {e}")
            return []

    with ThreadPoolExecutor() as executor:
        # Launch all searches
        futures = [executor.submit(search_shard_ids, i, c) for i, c in enumerate(clients)]
        for future in futures:
            all_scored_points.extend(future.result())

    # --- Step 2: Global Merge & Sort ---
    # Sort by score descending and take top K
    all_scored_points.sort(key=lambda x: x[1], reverse=True)
    top_winners = all_scored_points[:k]

    # --- Step 3: Hydrate Winners ---
    # Group IDs by shard to minimize calls
    shard_map = {}
    for pid, score, shard_idx in top_winners:
        if shard_idx not in shard_map: shard_map[shard_idx] = []
        shard_map[shard_idx].append(pid)

    final_results = []
    
    # Fetch payloads (Can also be parallelized if needed, but usually fast enough sequentially for <10 items)
    for shard_idx, pids in shard_map.items():
        client = clients[shard_idx]
        hydrated_points = hydrate_papers(client, pids)
        
        # Map back to result format
        for point in hydrated_points:
            paper = point.payload
            if point.vector is None:
                print(f"⚠️ Warning: Point {point.id} has no-vector data in Qdrant (with_vectors=True)")
            paper["embedding"] = point.vector # Store vector for "Find Similar" logic
            # Reinject the score (retrieve() doesn't return score, we have it from step 1)
            # Find original score
            original_score = next(s for p, s, i in top_winners if p == point.id)
            paper["similarity_score"] = original_score

            # Decompress
            if paper.get("compressed"):
                try:
                    compressed_data = base64.b64decode(paper["abstract"])
                    paper["abstract"] = zlib.decompress(compressed_data).decode('utf-8')
                except Exception as e:
                    print(f"⚠️ Decompression error: {e}")

            # Formatting
            cats = paper.get("categories", [])
            paper["categories"] = cats.split() if isinstance(cats, str) else cats
            
            # Ensure authors is a list
            authors = paper.get("authors", [])
            if isinstance(authors, str):
                if authors.startswith("[") and authors.endswith("]"):
                    import ast
                    try:
                        paper["authors"] = ast.literal_eval(authors)
                    except:
                        paper["authors"] = [authors]
                else:
                    paper["authors"] = [authors]
            
            if "published" in paper:
                paper["published_date"] = paper["published"]
            
            final_results.append(paper)

    # Re-sort final results because hydration order might differ
    final_results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return final_results


#add user id as an input to search
def search(query, index, k=6, embedState=False,topic="",user_id="", qdrant_clients=None, session_id=None):
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
            print(f"🔐 Logged-in user – attempting to personalize (Session: {session_id})")
            
            def fetch_signals_and_build_profile(uid, sid):
                start = time.perf_counter()
                try:
                    # A. Fetch User Events (Implicit + Explicit)
                    events = supabase.table("user_events").select("*").eq("user_id", uid).execute()
                    if not events.data: 
                        return None, (time.perf_counter() - start)

                    # B. Fetch Embeddings for unique papers in history
                    paper_ids = list(set(e["paper_id"] for e in events.data))
                    if not paper_ids: return None, (time.perf_counter() - start)
                    
                    # Safe batching could be added here if > 100 ids
                    embed_res = supabase.table("new_papers").select("paper_id, embedding").in_("paper_id", paper_ids).execute()
                    embedding_map = {p["paper_id"]: p["embedding"] for p in embed_res.data}

                    # C. Merge Event Metadata with Embeddings
                    profile_inputs = []
                    for event in events.data:
                        pid = event["paper_id"]
                        if pid in embedding_map:
                            profile_inputs.append({
                                "embedding": embedding_map[pid],
                                "created_at": event["created_at"],
                                "weight": event["weight"], # This comes from the DB now
                                "session_id": event.get("session_id")
                            })
                    
                    if not profile_inputs: return None, (time.perf_counter() - start)

                    # D. Build Weighted Vector
                    vector = construct_user_profile(profile_inputs, current_session_id=sid)
                    return vector, (time.perf_counter() - start)
                    
                except Exception as e:
                    print(f"⚠️ Personalization error: {e}")
                    return None, 0

            sb_future = executor.submit(fetch_signals_and_build_profile, user_id, session_id)

        # Wait for Azure
        emb_start_perf = time.perf_counter()
        if az_future:
            query_embedding = az_future.result()
            print(f"   ⏱️ Azure Embedding (Async wait): {(time.perf_counter() - emb_start_perf)*1000:.2f}ms")
        else:
            query_embedding = np.array(query).reshape(1, -1)

        # Wait for Supabase & Process Personalization
        if sb_future:
            user_profile_vector, sb_time = sb_future.result()
            print(f"   ⏱️ Signal Processing & Profile Build: {sb_time*1000:.2f}ms")
            
            if user_profile_vector is not None:
                print(f"✅ User profile built successfully.")
                # ✨ Blend current query and user profile
                # We can tune this alpha. 0.15 is safer for "Implicit" signals than 0.1
                query_embedding = 0.85 * query_embedding + 0.15 * user_profile_vector
            else:
                print("⚠️ No signals found or error building profile. Using raw query.")
        else:
            print("Guest user: skipping personalization.")

    #return None

    embedding_time=time.time()
    embedding_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(embedding_time)) + f".{int((embedding_time % 1) * 1000):03d}"
    print(f"Timestamp at middle of inner search function: {embedding_timestamp}")

    # --- Qdrant Path ---
    if qdrant_clients:
        print(f"🌐 Searching Qdrant collection '{QDRANT_COLLECTION}' across {len(qdrant_clients)} shards")
        results = qdrant_search_parallel(query_embedding, qdrant_clients, k, topic)
        
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