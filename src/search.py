import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import json
from supabase_client import supabase 


model = SentenceTransformer("all-MiniLM-L6-v2")
dimension = 384

def search(query, index, k=2):

    #convert the query into embeddings
    query_embedding = model.encode(query).astype("float32")

    # Perform the search to get the top k most similar vectors
    D, I = index.search(np.array([query_embedding]), k)  # D = distances, I = indices

    if I[0][0] == -1:  # FAISS returns -1 if no results
            print("No matching papers found.")
            return []
    
    print("Indices are ",I)

     #Fetch metadata from Supabase based on `faiss_id`
    results = []
    for idx in I[0]:
        response = supabase.table("papers").select("title", "authors", "abstract", "link").eq("faiss_id", idx).execute()
        if response.data:
            results.append(response.data[0])  # Append the first match

    return results