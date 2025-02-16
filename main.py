from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data
from src.generate_and_store_embeddings import generate_and_store_embeddings
from src.load_index import load_index
from src.search import search
from src.rebuild_faiss import needs_rebuild, rebuild_faiss 
from src.config import FAISS_INDEX_FILENAME
from src.size_test import file_size_test
from src.scrape_CS import get_category_size
import time
import json


def main():

    if needs_rebuild():
        print("Rebuilding FAISS before proceeding...")
        rebuild_faiss()
    else:
        print("No need to rebuild FAISS from supabase")
        
    category_dict={"cs.AI":0}

    for key in category_dict:
        category_dict[key]=get_category_size(key)
    print(category_dict)
    time.sleep(10)
    
    pullSize=1000
    for key in category_dict:
        maxPulls=category_dict[key]
        counter=0

        while(counter<maxPulls):
            
            #Fetch papers from arXiv
            xml_data = fetch_arxiv_data(key,pullSize,counter)
           
            if not xml_data:
                print("Failed to fetch data.")
                time.sleep(8)
                continue

            #Parse new and unique papers
            unique_papers = parse_arxiv_data(xml_data)

            #Generate embeddings and store new papers in Supabase
            generate_and_store_embeddings(unique_papers)
            
            counter+=pullSize

    #Load FAISS index and run search
    index = load_index(FAISS_INDEX_FILENAME)
    
    index=load_index("faiss_index.index")
    #num_embeddings = index.ntotal
    #print("FAISS contains",num_embeddings,"embeddings")
    
    if index:
        query = "CSS"  # User query
        results = search(query, index)

        for result in results:
            print(f"Title: {result['title']}\n  {result['link']}\n")
    else:
        print("ERROR: result array is empty")
  
    file_size_test()
    
if __name__ == "__main__":
    main()
