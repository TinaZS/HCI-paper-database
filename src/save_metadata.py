import json
import os

def save_metadata(papers_with_embeddings, filename="papers_with_embeddings.json"):
    """Loads existing JSON, merges new papers with embeddings, and writes a new file."""
    
    # ✅ Check if the file exists and load its contents
    if os.path.exists(filename):
        with open(filename, "r") as f:
            try:
                existing_data = json.load(f)  # Load existing papers
            except json.JSONDecodeError:
                print("Warning: JSON file is corrupted. Starting fresh.")
                existing_data = []
    else:
        print("starting from scratch")
        existing_data = []

  # ✅ Merge new papers, ensuring no duplicates by title
    existing_titles = {paper["title"] for paper in existing_data}  # Set of existing titles
    for paper in papers_with_embeddings:
        if paper["title"] not in existing_titles:
            existing_data.append(paper)  # Add new paper to the list

    # ✅ Write merged data into a new JSON file
    with open(filename, "w") as f:
        json.dump(existing_data, f, indent=4)

    print(f"Updated {filename} with {len(papers_with_embeddings)} new papers.")