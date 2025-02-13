from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data
from src.generate_embeddings import generate_embeddings
import json

def main():
    xml_data = fetch_arxiv_data()
    if not xml_data:
        print("Failed to fetch data.")
        return
    
    papers = parse_arxiv_data(xml_data)
    papers_with_embeddings = generate_embeddings(papers)
    with open("papers_with_embeddings.json", "w") as f:
        json.dump(papers_with_embeddings, f, indent=4)    


if __name__ == "__main__":
    main()
    