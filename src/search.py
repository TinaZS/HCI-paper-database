import faiss
import numpy as np
from supabase_client import supabase 
import time



def search(query, index, model, k):
    """Converts a text query to an embedding, searches FAISS, and fetches metadata from Supabase."""

    first_time=time.time()
    first_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(first_time)) + f".{int((first_time % 1) * 1000):03d}"
    print(f"Timestamp at start of inner search function: {first_timestamp}")

    query_embedding = model.encode(query).astype("float32").reshape(1, -1)

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