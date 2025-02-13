import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import json

def load_index(index_filename):
    try:
        index = faiss.read_index(index_filename)
        print(f"FAISS index loaded from {index_filename}")
        return index
    except Exception as e:
        print(f"Error loading FAISS index: {e}")
        return None