from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data

def main():
    xml_data = fetch_arxiv_data()
    if not xml_data:
        print("Failed to fetch data.")
        return
    
    papers = parse_arxiv_data(xml_data)
    for paper in papers:
        print(f"Title: {paper['title']}")
        print(f"Authors: {', '.join(paper['authors'])}")
        print(f"Abstract: {paper['abstract']}")
        print(f"Published Date: {paper['published_date']}")
        print(f"Link: {paper['link']}")
        print(f"DOI: {paper['doi']}")
        print("\n\n")


if __name__ == "__main__":
    main()
    