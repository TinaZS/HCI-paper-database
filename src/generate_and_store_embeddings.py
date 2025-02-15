from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
from supabase_client import supabase
from src.config import FAISS_INDEX_FILENAME, FAISS_DIMENSION 


index_filename = FAISS_INDEX_FILENAME
embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
dimension = FAISS_DIMENSION

try:
    index = faiss.read_index(index_filename)
    print(f"Loaded existing FAISS index from {index_filename}, current size: {index.ntotal}")
except:
    print("No FAISS index found. Creating a new FAISS index...")
    index = faiss.IndexFlatIP(dimension)
    faiss.write_index(index, index_filename)


def generate_and_store_embeddings(papers):
    """
    1. Generates embeddings for the new papers 
    2. Stores metadata + embeddings in Supabase
    """
    
    if not papers:
        print("No new papers to process")
        return

    embeddings = []
    start_faiss_id = index.ntotal  #We use this to track the starting FAISS ID for new papers

    for i, paper in enumerate(papers):
        embedding = embedding_model.encode(paper["abstract"]).astype("float32").tolist()
        paper["embedding"] = embedding
        paper["embedding_status"] = True #Keeping here for debugging purposes, can delete
        paper["faiss_id"] = start_faiss_id + i  #We calculate Faiss ID here
        embeddings.append(embedding)

    #We store metadata and embeddings in Supabase
    response = supabase.table("papers").insert(papers).execute()
    if response.data:
        print(f"Stored {len(papers)} new papers in Supabase")
    else:
        print("Error inserting papers into Supabase")

    #adding new embeddings to faiss
    if embeddings:
        index.add(np.array(embeddings, dtype="float32"))
        print(f"Added {len(embeddings)} new embeddings to FAISS")
        faiss.write_index(index, index_filename)


    #update faiss_id in Supabase
    for paper in papers:
        supabase.table("papers").update({"faiss_id": paper["faiss_id"]}).eq("title", paper["title"]).execute()
