import json
import faiss
import numpy as np
from supabase_client import supabase
import os
from src.config import FAISS_INDEX_FILENAME


index_filename = FAISS_INDEX_FILENAME
dimension = 1536 


def fetch_embeddings_from_supabase():
    """
    Fetch all embeddings and their corresponding faiss_id from Supabase.
    """
    response = supabase.table("new_papers").select("faiss_id", "embedding").order("faiss_id").execute()

    if not response.data:
        print("No embeddings found in Supabase.")
        return None, None

    embeddings = []
    faiss_ids = []

    for row in response.data:
        if row["embedding"]:  # Ensure embedding exists
            try:
                embedding = json.loads(row["embedding"]) if isinstance(row["embedding"], str) else row["embedding"]
                embeddings.append(embedding)
                faiss_ids.append(row["faiss_id"])
            except json.JSONDecodeError:
                print(f"Error decoding embedding for faiss_id {row['faiss_id']}")
                continue  # Skip malformed embeddings

    return np.array(embeddings, dtype="float32"), faiss_ids


def needs_rebuild():
    """
    Checks if the FAISS index exists and whether the number of vectors matches the number of embeddings in Supabase.
    """
    embeddings, faiss_ids = fetch_embeddings_from_supabase()


    
        
    if not os.path.exists(index_filename):
        print("FAISS index file not found. Rebuild required.")
        return True
    

    try:
        index = faiss.read_index(index_filename)
        if index.ntotal == len(embeddings):
            return False  # FAISS is correctly configured
        else:
            print(f"FAISS index contains {index.ntotal} vectors, but Supabase has {len(embeddings)} embeddings. Rebuild required.")
            return True
    except Exception as e:
        print(f"Error loading FAISS index: {e}. Rebuild required.")
        return True


def rebuild_faiss():
    """
    Rebuild the FAISS index from Supabase embeddings.
    """
    embeddings, faiss_ids = fetch_embeddings_from_supabase()

    if embeddings is None or len(embeddings) == 0:
        print("No embeddings available to rebuild FAISS.")

        index = faiss.IndexFlatIP(dimension)
        faiss.write_index(index, index_filename)

        return


    print(f"Rebuilding FAISS with {len(embeddings)} embeddings...")

    # Initialize FAISS index
    index = faiss.IndexFlatIP(dimension)

    # Add embeddings to the FAISS index
    index.add(embeddings)

    # Save the new FAISS index
    faiss.write_index(index, index_filename)
    
    print(f"FAISS index successfully rebuilt and saved as {index_filename}")
    print(f"Faiss index currently at {index.ntotal} embeddings")
