import faiss
import json

def file_size_test():

    # Load an existing FAISS index
    index = faiss.read_index("faiss_index.index")  # Replace with your actual FAISS index file

    # Get the number of embeddings stored in the index
    num_embeddings = index.ntotal

    with open("titles.json", "r") as f:
        titles = json.load(f)  # Load JSON data
        num_titles=len(titles)
    
    with open("metadata.json", "r") as f:
        metadata = json.load(f)  # Load JSON data
        num_metadata=len(metadata)

    print(f"Number of embeddings in FAISS index: {num_embeddings}")
    
    if (num_embeddings==num_titles and num_titles==num_metadata):
        print("CORRECT: File length test passed succesfully")
    
    else:
        print("Length test FAILED - file sizes do not match")
        print("FAISS length = ",num_embeddings)
        print("titles.json length = ",num_titles)
        print("metadata.json length = ",num_metadata)
