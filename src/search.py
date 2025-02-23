import faiss
import numpy as np
from supabase_client import supabase 
import time
import os
from dotenv import load_dotenv
import requests


# Initialize the Supabase client
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")  # Replace with your Supabase project URL
API_KEY = os.getenv("API_KEY")  # Replace with your Supabase service or anon key
API_VERSION = "2023-05-15"  # Use the latest supported version

def search(query, index, model, k=6):
    """Converts a text query to an embedding, searches FAISS, and fetches metadata from Supabase."""

    first_time=time.time()
    first_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(first_time)) + f".{int((first_time % 1) * 1000):03d}"
    print(f"Timestamp at start of inner search function: {first_timestamp}")

    #query_embedding = model.encode(query).astype("float32").reshape(1, -1)
     # Query text
    query_text = "LLM fairness in contemporary literature."

    # Headers for the request
    headers = {
        "Content-Type": "application/json",
        "api-key": API_KEY
    }

    # Payload with the `dimensions` parameter
    payload = {
    "model": "text-embedding-3-small",
    "input": query_text,
    "dimensions": 384  # Change this value between 512 and 1536
    }

    # Send request to Azure OpenAI
    response = requests.post(f"{AZURE_OPENAI_ENDPOINT}?api-version={API_VERSION}", headers=headers, json=payload)

    # Parse and print the response
    if response.status_code == 200:
        embedding = response.json()["data"][0]["embedding"]
        print("Embedding:", embedding)
    else:
        print("Error:", response.status_code, response.text)


    embedding_time=time.time()
    embedding_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(embedding_time)) + f".{int((embedding_time % 1) * 1000):03d}"
    print(f"Timestamp at middle of inner search function: {embedding_timestamp}")

    return 
