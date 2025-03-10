import faiss
import numpy as np
from supabase_client import supabase 
import time
import openai
import os
from dotenv import load_dotenv

load_dotenv()

# Azure OpenAI Configuration from .env
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = "2023-05-15"



client = openai.AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION
)


def get_openai_embedding(text):
    """Get embedding from Azure OpenAI using full 1536 dimensions."""
    response = client.embeddings.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        input=text,
        encoding_format="float" 
    )

    print(f'Azure open ai deployment name: {AZURE_OPENAI_DEPLOYMENT}')


    embedding = np.array(response.data[0].embedding, dtype=np.float32)  # Ensure FAISS-compatible float32 format

    #take out this statement later
    assert embedding.shape[0] == 1536, f"Unexpected embedding dimension: {embedding.shape[0]}"

    return embedding.reshape(1, -1)  

def search(query, index, k):
    """Converts a text query to an embedding, searches FAISS, and fetches metadata from Supabase."""

    first_time=time.time()
    first_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(first_time)) + f".{int((first_time % 1) * 1000):03d}"
    print(f"Timestamp at start of inner search function: {first_timestamp}")

    query_embedding = get_openai_embedding(query)

    embedding_time=time.time()
    embedding_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(embedding_time)) + f".{int((embedding_time % 1) * 1000):03d}"
    print(f"Timestamp at middle of inner search function: {embedding_timestamp}")

    distances, indices = index.search(query_embedding, k)

    scores_dict = {}
    print(distances)
    print(indices)
    for i in range(0,len(distances[0])):
        scores_dict[indices[0][i]]=distances[0][i]
    print(scores_dict)

    postquery_time=time.time()
    postquery_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(postquery_time)) + f".{int((postquery_time % 1) * 1000):03d}"
    print(f"Timestamp at middle of inner search function: {postquery_timestamp}")

    if indices[0][0] == -1:  # FAISS returns -1 if no results
        print("No matching papers found.")
        return []

        # Extract FAISS indices as a list
    faiss_ids = [int(idx) for idx in indices[0]]  # Ensure IDs are in list format

    # Perform a single batch query to Supabase
    response = supabase.table("new_papers") \
        .select("faiss_id", "paper_id", "title", "authors", "abstract", "link", "published_date","categories","embedding") \
        .in_("faiss_id", faiss_ids) \
        .execute()

    
    # Process the response and add similarity scores
    if response.data:
        for paper in response.data:
            faiss_id = paper["faiss_id"]
            if faiss_id in scores_dict:
                paper["similarity_score"] = float(scores_dict[faiss_id])  # Add similarity score

        # Remove FAISS IDs from response
        for paper in response.data:
            del paper["faiss_id"]

    print(response)
    
    
    
    postsupabase_time=time.time()
    postsupabase_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(postsupabase_time)) + f".{int((postsupabase_time % 1) * 1000):03d}"
    print(f"Timestamp at end of inner search function: {postsupabase_timestamp}")

    # Extract results (handle empty responses)
    results = response.data if response.data else []
    print(results)

    # Sorting the results by similarity_score in descending order
    results = sorted(results, key=lambda x: x['similarity_score'], reverse=True)

    for result in results:
        result["similarity_score"] = round(result["similarity_score"],2)

    return results