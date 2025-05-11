import json
import faiss
import numpy as np
from supabase_client import supabase
import os
from src.config import FAISS_INDEX_FILENAME

index_filename = FAISS_INDEX_FILENAME
dimension = 1536 

def fetch_embeddings_from_supabase(batch_size=1000):
    """
    Fetch embeddings and their corresponding faiss_id from Supabase in batches
    to avoid overloading the server.
    """
    embeddings = []
    faiss_ids = []
    offset = 0

    while True:
        response = (
            supabase
            .table("new_papers")
            .select("faiss_id", "embedding")
            .order("faiss_id")
            .range(offset, offset + batch_size - 1)
            .execute()
        )

        batch_data = response.data
        if not batch_data:
            break  # No more data

        for row in batch_data:
            if row["embedding"]:
                try:
                    embedding = json.loads(row["embedding"]) if isinstance(row["embedding"], str) else row["embedding"]
                    embeddings.append(embedding)
                    faiss_ids.append(row["faiss_id"])
                except json.JSONDecodeError:
                    print(f"Error decoding embedding for faiss_id {row['faiss_id']}")
                    continue

        offset += batch_size

    if not embeddings:
        print("No embeddings found in Supabase.")
        return None, None

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
            return False
        else:
            print(f"FAISS index contains {index.ntotal} vectors, but Supabase has {len(embeddings)} embeddings. Rebuild required.")
            return True
    except Exception as e:
        print(f"Error loading FAISS index: {e}. Rebuild required.")
        return True


def quantize_faiss_index(embeddings, filename, nlist=100, m=8, bits=6):
    """
    Builds and saves a quantized FAISS index using IVFPQ to reduce file size.
    """
    print(f"Quantizing index with nlist={nlist}, m={m}, bits={bits}...")

    quantizer = faiss.IndexFlatL2(embeddings.shape[1])
    index = faiss.IndexIVFPQ(quantizer, embeddings.shape[1], nlist, m, bits)

    index.train(embeddings)
    index.add(embeddings)

    faiss.write_index(index, filename)

    print(f"Quantized FAISS index saved to {filename}")
    print(f"Quantized index contains {index.ntotal} embeddings")


def rebuild_faiss(quantize=False):
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

    if quantize:
        quantize_faiss_index(embeddings, index_filename)
    else:
        index = faiss.IndexFlatIP(dimension)
        index.add(embeddings)
        faiss.write_index(index, index_filename)
        print(f"FAISS index saved (unquantized) to {index_filename}")
        print(f"Index contains {index.ntotal} embeddings")


# if __name__ == "__main__":
#     rebuild_faiss()

