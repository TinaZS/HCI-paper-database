from src.search import search
import time


FAISS_INDEX_PATH = "faiss_index.index"

#add user query as an input to search
def user_search(query, index, numPapers, embedState, topic, user_id, qdrant_clients=None, session_id=None):
 
    if not index and not qdrant_clients:
        print("ERROR: No search index (FAISS or Qdrant) available")
        return []  
    
    if qdrant_clients:
        print(f"Using Qdrant optimization. Total shards: {len(qdrant_clients)}")
    else:
        print(f"Using preloaded FAISS index. Total vectors: {index.ntotal}") 
        
    print(f"User ID is: {user_id if user_id else 'Guest'}")


    start_time = time.time()
    start_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_time)) + f".{int((start_time % 1) * 1000):03d}"
    print(f"Timestamp at search start: {start_timestamp}")

    print(f"Numpapers is {numPapers}")
    # Pass qdrant_clients to the search function
    results = search(query, index, numPapers, embedState, topic, user_id, qdrant_clients=qdrant_clients, session_id=session_id)
    print(f"LenResult is {len(results)}")

    end_time = time.time()
    end_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_time)) + f".{int(((end_time) % 1) * 1000):03d}"
    print(f"Timestamp at search end: {end_timestamp}")

    print(f"Returning {len(results)} results for query: '{query}'")

    if not results:
        print(f"No results found for '{query}'")

    return [
        {
            "paper_id": result.get("paper_id", ""),
            "qdrant_id": result.get("qdrant_id"), # NEW: Include the Qdrant ID
            "title": result.get("title", "No Title"),
            "authors": result.get("authors", []),
            "abstract": result.get("abstract", "No abstract available"),
            "datePublished": result.get("published_date", "Unknown"),
            "link": result.get("link", "#"),
            "similarity_score": result.get("similarity_score", 0),
            "categories": result.get("categories", []),
            "embedding": result.get("embedding", [])
        }
        for result in results
    ]
