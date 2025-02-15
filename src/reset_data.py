import os

def delete_files():
    files = ["papers_with_embeddings.json", "faiss_index.index","titles.json"]

    for file in files:
        if os.path.exists(file):
            os.remove(file)
            print(f"Deleted {file}")
        else:
            print(f"{file} does not exist")

# Call the function
delete_files()
