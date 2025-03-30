import faiss
import numpy as np
from supabase_client import supabase 
import time
import openai
import os
from dotenv import load_dotenv
import sys

from src.construct_profile import construct_user_profile

load_dotenv()

# Azure OpenAI Configuration from .env
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = "2023-05-15"



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


    embedding = np.array(response.data[0].embedding, dtype=np.float32)  # Ensure FAISS-compatible float32 format

    #take out this statement later
    assert embedding.shape[0] == 1536, f"Unexpected embedding dimension: {embedding.shape[0]}"

    return embedding.reshape(1, -1)  

#add user id as an input to search
def search(query, index, k=6, embedState=False,topic="",user_id=""):
    """Converts a text query to an embedding, searches FAISS, and fetches metadata from Supabase."""
    
    first_time=time.time()
    first_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(first_time)) + f".{int((first_time % 1) * 1000):03d}"
    print(f"Timestamp at start of inner search function: {first_timestamp}")

    # 🚫 Skip personalization for guest users
    if user_id:
        print("🔐 Logged-in user – attempting to personalize")

        response = (
            supabase
            .table("likes")
            .select("paper_id, reaction_type,created_at, new_papers(title, authors, abstract, published_date, link, categories, embedding)")
            .eq("user_id", user_id)
            .eq("reaction_type", "like")
            .execute()
        )

        if response.data:
            print(f"✅ {len(response.data)} liked papers found for user {user_id}")
            papers = [
                {
                    "paper_id": row["paper_id"],
                    "created_at": row["created_at"],
                    "embedding": row["new_papers"]["embedding"]
                }
                for row in response.data
            ]

            user_profile_embeddings = construct_user_profile(papers)

            if not embedState:
                query_embedding = get_openai_embedding(query)
            else:
                query_embedding = np.array(query).reshape(1, -1)

            # ✨ Blend current query and user profile
            query_factor = 0.9
            historical_factor = 0.1
            query_embedding = query_factor * query_embedding + historical_factor * user_profile_embeddings

        else:
            print("⚠️ No liked papers for personalization. Falling back to regular search.")
            query_embedding = get_openai_embedding(query) if not embedState else np.array(query).reshape(1, -1)
    else:
        print("🙈 Guest user: skipping personalization.")
        query_embedding = get_openai_embedding(query) if not embedState else np.array(query).reshape(1, -1)

    #return None

    embedding_time=time.time()
    embedding_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(embedding_time)) + f".{int((embedding_time % 1) * 1000):03d}"
    print(f"Timestamp at middle of inner search function: {embedding_timestamp}")

    results = []
    attempt_size = 5 * k  # Always over-fetch, topic or not
    max_attempts = 5  # Limit retries to prevent infinite loops
    attempt_count = 0

    while len(results) < k and attempt_count < max_attempts:
        # Step 2: Search FAISS with larger search pool if needed
        distances, indices = index.search(query_embedding, attempt_size)
        
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