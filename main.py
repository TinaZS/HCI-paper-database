from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data
from src.generate_embeddings import generate_embeddings
from src.load_index import load_index
from src.search import search
from src.add_papers import add_papers_from_arxiv
from src.save_metadata import save_metadata
import json

def main():
    xml_data = fetch_arxiv_data()
    if not xml_data:
        print("Failed to fetch data.")
        return
    
    papers = add_papers_from_arxiv(xml_data)
    papers_with_embeddings = generate_embeddings(papers)
    save_metadata(papers_with_embeddings)  # Save merged JSON
    
    index=load_index("faiss_index.index")
    if index:
        query="Fair data"
        results=search(query,index)

        for result in results:
            print(result)

    else:
        print("ERROR: result array is empty")


if __name__ == "__main__":
    main()
    