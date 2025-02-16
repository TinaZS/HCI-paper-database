from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data
from src.generate_embeddings import generate_embeddings
from src.load_index import load_index
from src.search import search
from src.add_papers import add_papers_from_arxiv
from src.save_metadata import save_metadata
from src.size_test import file_size_test
from src.scrape_CS import get_category_size
import time
import json

def main():

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
            
            xml_data = fetch_arxiv_data(key,pullSize,counter)

            if not xml_data:
                print("Failed to fetch data.")
                time.sleep(8)
                continue
            
            new_papers = add_papers_from_arxiv(xml_data)
            new_paper_metadata = generate_embeddings(new_papers)
            save_metadata(new_paper_metadata)  # Save merged JSON

            counter+=pullSize

            #time.sleep(8)


    index=load_index("faiss_index.index")
    #num_embeddings = index.ntotal

    #print("FAISS contains",num_embeddings,"embeddings")
    if index:
        query=input("Enter your search query here: ")
        print(query)
        results=search(query,index)

        for result in results:
            print(result["title"])

    else:
        print("ERROR: result array is empty")
    

    file_size_test()

if __name__ == "__main__":
    main()
    