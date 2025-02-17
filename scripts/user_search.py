from src.load_index import load_index
from src.search import search
from src.rebuild_faiss import needs_rebuild, rebuild_faiss
import sys
import os


FAISS_INDEX_PATH = "faiss_index.index"


def user_search(query, index):

    if not index:
        print("ERROR: FAISS index is not loaded")
        return []  
    
    print(f"Using preloaded FAISS index. Total vectors: {index.ntotal}") 

    results = search(query, index)

    print(f"View results: '{results}'")

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