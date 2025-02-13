import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import json

model = SentenceTransformer("all-MiniLM-L6-v2")
dimension = 384

def search(query, index, k=2, metadata_filename="papers_with_embeddings.json"):

    #convert the query into embeddings
    query_embedding = model.encode(query).astype("float32")

    # Perform the search to get the top k most similar vectors
    D, I = index.search(np.array([query_embedding]), k)  # D = distances, I = indices

    print("Indices are ",I)

    #retrieve the previously stored metadata
    with open(metadata_filename, "r") as f:
        metadata = json.load(f)

    results = []
    for idx in I[0]:
        if idx < len(metadata):  # Ensure the index is valid in the list
            results.append(metadata[idx])  # Append the metadata dictionary for this index
        else:
            print(f"Metadata not found for index {idx}")

    return results