from openai import AzureOpenAI
import os
import numpy as np
import faiss
from supabase_client import supabase
from src.config import FAISS_INDEX_FILENAME
from dotenv import load_dotenv

load_dotenv()
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")


index_filename = FAISS_INDEX_FILENAME

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version="2023-05-15"  # Ensure correct version
)

def get_openai_embedding(text):
    """Fetch embeddings from Azure OpenAI using the new API."""
    response = client.embeddings.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
        input=text
    )
    return np.array(response.data[0].embedding, dtype="float32").tolist()

def generate_and_store_embeddings(papers):
    """
    1. Generates embeddings for the new papers 
    2. Stores metadata + embeddings in Supabase
    """
    
    if not papers:
        print("No new papers to process")
        return
    

    seen_titles = set()
    unique_papers = []
    
    for paper in papers:
        if paper["title"] not in seen_titles:  
            unique_papers.append(paper)
            seen_titles.add(paper["title"])  

    if not unique_papers:
        print("No new unique papers to insert.")
        return
    
    index = faiss.read_index(index_filename)
    print(f"Loaded existing FAISS index from {index_filename}, current size: {index.ntotal}")
    
    embeddings = []
    start_faiss_id = index.ntotal

    for i, paper in enumerate(unique_papers):
        embedding = get_openai_embedding(paper["abstract"])
        paper["embedding"] = embedding
        paper["embedding_status"] = True
        paper["faiss_id"] = start_faiss_id + i
        embeddings.append(embedding)

    response = supabase.table("new_papers").insert(unique_papers).execute()
    if response.data:
        print(f"Stored {len(unique_papers)} new papers in Supabase")
    else:
        print("Error inserting papers into Supabase")


    if embeddings:
        index.add(np.array(embeddings, dtype="float32"))
        print(f"Added {len(embeddings)} new embeddings to FAISS")
        faiss.write_index(index, index_filename)


