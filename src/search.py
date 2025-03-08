import faiss
import numpy as np
from supabase_client import supabase 
import time
import openai
import os
from dotenv import load_dotenv

load_dotenv()

# Azure OpenAI Configuration from .env
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = "2025-02-01-preview"

def normalize_l2(x):
    """Normalize an embedding using L2 norm."""
    x = np.array(x)
    norm = np.linalg.norm(x)
    return x if norm == 0 else x / norm

def get_openai_embedding(text):
    """Get the embedding for a given text using Azure OpenAI with dimension reduction to 384."""
    response = openai.Embedding.create(
        input=text,
        engine=AZURE_OPENAI_DEPLOYMENT,
        api_key=AZURE_OPENAI_API_KEY,
        base_url=AZURE_OPENAI_ENDPOINT,
        api_version=AZURE_OPENAI_API_VERSION,
        encoding_format="float",  # Ensure output is float format
        dimensions=384  # Reduce the embedding size to 384
    )

    embedding = np.array(response["data"][0]["embedding"], dtype=np.float32)

    # Ensure embedding is 384-dimensional and normalize it
    assert embedding.shape[0] == 384, f"Unexpected embedding dimension: {embedding.shape[0]}"
    return normalize_l2(embedding).reshape(1, -1)


def search(query, index, model, k):
    """Converts a text query to an embedding, searches FAISS, and fetches metadata from Supabase."""

    first_time=time.time()
    first_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(first_time)) + f".{int((first_time % 1) * 1000):03d}"
    print(f"Timestamp at start of inner search function: {first_timestamp}")

    query_embedding = get_openai_embedding(query)

    embedding_time=time.time()
    embedding_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(embedding_time)) + f".{int((embedding_time % 1) * 1000):03d}"
    print(f"Timestamp at middle of inner search function: {embedding_timestamp}")

    distances, indices = index.search(query_embedding, k)

    similarity_scores = []
    for distance in distances[0]:
        # For L2 distance
        similarity_score = 1 / (1 + distance)  # Inverse of distance
        similarity_scores.append(similarity_score)
    print(similarity_scores)

    postquery_time=time.time()
    postquery_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(postquery_time)) + f".{int((postquery_time % 1) * 1000):03d}"
    print(f"Timestamp at middle of inner search function: {postquery_timestamp}")

    if indices[0][0] == -1:  # FAISS returns -1 if no results
        print("No matching papers found.")
        return []

        # Extract FAISS indices as a list
    faiss_ids = [int(idx) for idx in indices[0]]  # Ensure IDs are in list format

    # Perform a single batch query to Supabase
    response = supabase.table("new_papers") \
        .select("title", "authors", "abstract", "link", "published_date") \
        .in_("faiss_id", faiss_ids) \
        .execute()
    
    postsupabase_time=time.time()
    postsupabase_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(postsupabase_time)) + f".{int((postsupabase_time % 1) * 1000):03d}"
    print(f"Timestamp at end of inner search function: {postsupabase_timestamp}")

    # Extract results (handle empty responses)
    results = response.data if response.data else []

    return results