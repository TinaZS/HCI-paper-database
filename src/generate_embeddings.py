from sentence_transformers import SentenceTransformer
import numpy as np
from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data
import json
import os

import faiss


embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
dimension = 384  # The dimension of the embeddings (from SentenceTransformer)

index_filename="faiss_index.index"

def generate_embeddings(papers):

    if papers:

        # Check if the index file exists
        if os.path.exists(index_filename):
            index = faiss.read_index(index_filename)
            print(f"Loaded existing FAISS index from {index_filename}")
        else:
            index = faiss.IndexFlatIP(dimension)
            print("Created a new FAISS index")

        embeddings=[]

        for paper in papers:
            abstract = paper["abstract"]
            embedding = embedding_model.encode(abstract)
            #paper["embedding"] = embedding.tolist() 
            embeddings.append(embedding)
        
        if embeddings:
            embeddings = np.array(embeddings)
            index.add(embeddings)

        faiss.write_index(index,index_filename)
        print(f"FAISS index saved to {index_filename}")
    
    return papers