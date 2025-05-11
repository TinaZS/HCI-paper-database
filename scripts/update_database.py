import time
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.fetch import fetch_arxiv_data
from src.parse import parse_arxiv_data
from src.generate_and_store_embeddings import generate_and_store_embeddings
from src.rebuild_faiss import needs_rebuild, rebuild_faiss
from src.size_test import file_size_test
from src.scrape_CS import get_category_size
import sys
import os




def update_database():
    """Fetch new data from arXiv, update embeddings, and rebuild FAISS if needed."""

    if needs_rebuild():
        print("Rebuilding FAISS before proceeding...")
        rebuild_faiss()
    else:
        print("No need to rebuild FAISS from Supabase")

    category_dict = {"cs.HC": 0,"cs.AI":0}
    #CS AI

    # Get category size
    for key in category_dict:
        category_dict[key] = get_category_size(key)
    print(category_dict)
    time.sleep(10)

    pull_size = 100  # Ensures Supabase query does not exceed limit

    for key, max_pulls in category_dict.items():
        counter = 5500

        while counter < 25000:
            xml_data = fetch_arxiv_data(key, pull_size, counter)

            if not xml_data:
                print("Failed to fetch data. Retrying in 8 seconds...")
                time.sleep(8)
                continue

            unique_papers = parse_arxiv_data(xml_data)
            generate_and_store_embeddings(unique_papers)
            
            counter += pull_size

    print("Database update complete.")

if __name__ == "__main__":
    update_database()
