from src.load_index import load_index
from src.search import search
from src.rebuild_faiss import needs_rebuild, rebuild_faiss
import sys
import os
import time


FAISS_INDEX_PATH = "faiss_index.index"


def user_search(query, index, model):
 
    if not index:
        print("ERROR: FAISS index is not loaded")
        return []  
    
    print(f"Using preloaded FAISS index. Total vectors: {index.ntotal}") 

    start_time = time.time()  # Start timing for search
    start_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_time)) + f".{int((start_time % 1) * 1000):03d}"
    print(f"Timestamp at search start: {start_timestamp}")

    results = search(query, index, model)

    end_time = time.time()  # Calculate search time
    end_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_time)) + f".{int(((end_time) % 1) * 1000):03d}"
    print(f"Timestamp at search end: {end_timestamp}")

    print(f"Returning {len(results)} results for query: '{query}'")

    if not results:
        print(f"No results found for '{query}'")

    return [
        {
            "title": result["title"],
            "abstract": result.get("abstract", "No abstract available"),
            "datePublished": result.get("published_date", "Unknown"),
            "link": result["link"],
        }
        for result in results
    ]