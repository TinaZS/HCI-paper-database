from sentence_transformers import SentenceTransformer
import numpy as np
from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data
import json


embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def generate_embeddings(papers):

    for paper in papers:
        abstract = paper["abstract"]
        embedding = embedding_model.encode(abstract)
        paper["embedding"] = embedding.tolist() 

    return papers