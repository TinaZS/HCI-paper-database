import faiss
import numpy as np
from supabase_client import supabase 
import time
import openai
import os
from dotenv import load_dotenv
import numpy as np
import math
from datetime import datetime

def construct_user_profile(papers,decay_rate=0.14):

    current_time = datetime.utcnow()  # Get the current time in UTC
    weighted_embeddings = []  # List to store weighted embeddings
    total_weight = 0  # Sum of all weights

    for paper in papers:
        created_at = datetime.strptime(paper["created_at"], "%Y-%m-%dT%H:%M:%S.%f")  # Adjusted format for timestamp
        embedding = np.array(paper["embedding"])  # Convert the embedding to a numpy array (assuming it's a list)
        
        # Calculate time difference in seconds
        time_diff = (current_time - created_at).total_seconds()  # Convert to seconds
        
        # Exponential decay for weight calculation
        weight = math.exp(-decay_rate * time_diff)
        
        # Accumulate weighted embeddings and total weight
        weighted_embeddings.append(embedding * weight)
        total_weight += weight

    # Normalize weights so that the sum of all weights equals 1
    if total_weight > 0:
        # Normalize the weighted embeddings by the total weight
        user_profile_embedding = np.sum(weighted_embeddings, axis=0) / total_weight
    else:
        user_profile_embedding = np.zeros_like(weighted_embeddings[0])  # If no papers, return a zero vector
    
    return user_profile_embedding
