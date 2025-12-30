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

def construct_user_profile(papers, current_session_id=None, distinct_personas=False):
    """
    Build a weighted average vector from user interaction history.
    
    Args:
        papers: List of dicts containing 'embedding', 'created_at', 'weight', 'session_id'
        current_session_id: The ID of the active user session (for boosting)
        distinct_personas: (Future) If True, return multiple cluster centers instead of one vector
    """
    if not papers:
        return np.zeros(1536)

    current_time = datetime.utcnow()
    weighted_embeddings = []
    total_weight = 0
    
    # 30-Day Half-Life Decay
    # lambda = ln(2) / 30 ≈ 0.0231
    DECAY_CONSTANT = 0.0231 

    for paper in papers:
        # Parse timestamp
        try:
            if isinstance(paper["created_at"], str):
                 # Handle variable Supabase formats (sometimes lacks micros)
                ts_str = paper["created_at"].split("+")[0].replace("Z", "")
                if "." in ts_str:
                    created_at = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%S.%f")
                else:
                    created_at = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%S")
            else:
                created_at = paper["created_at"]
        except Exception as e:
            print(f"⚠️ Date parse error: {e}")
            created_at = current_time

        embedding = np.array(paper["embedding"])
        
        # Base Signal Weight (default to 1.0 if missing, e.g. for legacy likes)
        base_weight = paper.get("weight", 1.0)
        
        # --- Time Decay ---
        age_in_days = (current_time - created_at).total_seconds() / 86400.0
        # Prevent future dates glitching
        age_in_days = max(0, age_in_days) 
        time_factor = math.exp(-DECAY_CONSTANT * age_in_days)
        
        # --- Session Boosting ---
        session_factor = 1.0
        if current_session_id and paper.get("session_id") == current_session_id:
             session_factor = 2.0 # 2x Boost for current task

        # Final Weight Calculation
        effective_weight = base_weight * time_factor * session_factor
        
        # Drop signals that have decayed to irrelevance (< 0.1 effective weight)
        # unless it's a very strong negative signal we need to keep
        if effective_weight < 0.1 and base_weight > 0:
            continue

        weighted_embeddings.append(embedding * effective_weight)
        total_weight += abs(effective_weight) # Use abs for normalization denominator

    if not weighted_embeddings or total_weight == 0:
        return np.zeros_like(embedding)

    # Compute Weighted Average
    user_profile_vector = np.sum(weighted_embeddings, axis=0) / total_weight
    return user_profile_vector
