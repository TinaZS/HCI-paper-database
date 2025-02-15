import os
import json
import xml.etree.ElementTree as ET
from src.parse import parse_arxiv_data
from src.load_titles import load_titles

def add_papers_from_arxiv(xml_data):
    """Parses arXiv XML, loads existing papers, and adds new ones without duplicates."""
    filename = "papers_with_embeddings.json"

    # Load existing papers
    papers_dict = load_titles()

     # Extract existing titles into a dictionary for quick lookup
    existing_titles_dict = papers_dict  # No need to extract "papers" key


    # Parse new papers from XML
    new_papers= parse_arxiv_data(xml_data,existing_titles_dict)

    #print(new_titles)

    #print(existing_titles)

    if new_papers:

        # ✅ Update existing_titles_dict with new titles
        existing_titles_dict.update({paper["title"]: None for paper in new_papers})

        # Save updated titles
        with open("titles.json", "w") as f:
            json.dump(existing_titles_dict, f, indent=4)

        print(f"Added {len(new_papers)} new papers to {filename}")
    else:
        print("No new papers to add.")

    return new_papers