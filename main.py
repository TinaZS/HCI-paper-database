from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data
from src.generate_and_store_embeddings import generate_and_store_embeddings
from src.load_index import load_index
from src.search import search
from src.rebuild_faiss import needs_rebuild, rebuild_faiss 
from src.config import FAISS_INDEX_FILENAME



def main():

    if needs_rebuild():
        print("Rebuilding FAISS before proceeding...")
        rebuild_faiss()
    else:
        print("No need to rebuild FAISS from supabase")
    

    #Fetch papers from arXiv
    xml_data = fetch_arxiv_data()
    if not xml_data:
        print("Failed to fetch data.")
        return
    
    #Parse new and unique papers
    unique_papers = parse_arxiv_data(xml_data)

    #Generate embeddings and store new papers in Supabase
    generate_and_store_embeddings(unique_papers)

    #Load FAISS index and run search
    index = load_index(FAISS_INDEX_FILENAME)
    
    if index:
        query = "CSS"  # User query
        results = search(query, index)

        for result in results:
            print(f"Title: {result['title']}\n  {result['link']}\n")
    else:
        print("ERROR: result array is empty")

if __name__ == "__main__":
    main()
