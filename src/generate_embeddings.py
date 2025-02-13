from sentence_transformers import SentenceTransformer
import numpy as np
from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data
import json

import faiss


embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

dimension = 384  # The dimension of the embeddings (from SentenceTransformer)
index = faiss.IndexFlatIP(dimension)

index_filename="faiss_index.index"

def generate_embeddings(papers):

    embeddings=[]

    for paper in papers:
        abstract = paper["abstract"]
        embedding = embedding_model.encode(abstract)
        #paper["embedding"] = embedding.tolist() 
        embeddings.append(embedding)
    
    embeddings = np.array(embeddings)
    index.add(embeddings)

    faiss.write_index(index,index_filename)
    print(f"FAISS index saved to {index_filename}")

    return papers