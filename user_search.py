from src.load_index import load_index
from src.search import search
from src.rebuild_faiss import needs_rebuild, rebuild_faiss 
from src.config import FAISS_INDEX_FILENAME
import time
import json


def user_search():

    if needs_rebuild():
        print("Rebuilding FAISS before proceeding...")
        rebuild_faiss()
    else:
        print("No need to rebuild FAISS from supabase")

   #Load FAISS index and run search
    index = load_index(FAISS_INDEX_FILENAME)
    
    index=load_index("faiss_index.index")
    
    if index:
        query = ("What paper topics do you want to read about?")  # User query
        results = search(query, index)

        for result in results:
            print(f"Title: {result['title']}\n  {result['link']}\n")
    else:
        print("ERROR: result array is empty")

user_search()