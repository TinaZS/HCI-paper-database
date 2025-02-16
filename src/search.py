import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from src.supabase_client import supabase  # Supabase integration

model = SentenceTransformer("all-MiniLM-L6-v2")
dimension = 384

def search(query, index, k=5):
    """Converts a text query to an embedding, searches FAISS, and fetches metadata from Supabase."""

    # ✅ Convert user query to 384D embedding
    query_embedding = model.encode(query).astype("float32").reshape(1, -1)

    # ✅ Perform FAISS search
    distances, indices = index.search(query_embedding, k)

    if indices[0][0] == -1:  # FAISS returns -1 if no results
        print("No matching papers found.")
        return []

    print("🔍 FAISS found indices:", indices.tolist())

    # ✅ Fetch metadata for found papers from Supabase
    results = []
    for idx in indices[0]:
        response = supabase.table("new_papers").select("title", "authors", "abstract", "link").eq("faiss_id", idx).execute()
        
        if response.data:
            results.append(response.data[0])  # Append the first match

    return results