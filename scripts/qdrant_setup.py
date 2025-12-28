#!/usr/bin/env python3
import os
import sys
import json
import numpy as np
from pathlib import Path
from tqdm import tqdm
import time
import zlib
import base64
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, ScalarQuantization, ScalarQuantizationConfig, ScalarType, HnswConfigDiff

# Force environment reload
load_dotenv()

# Configuration
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "papers")
EMBEDDED_DATA_DIR = "embedded_data"
CHECKPOINT_FILE = f"upload_progress_{COLLECTION_NAME}.json"
UPLOAD_BATCH_SIZE = 200  # Upload 200 papers at a time
SIZE_LIMIT_VECTORS = 1_000_000  # ~4GB limit for free instances
TEST_MODE = False

# Qdrant instances
QDRANT_INSTANCES = [
    {
        "url": os.getenv("QDRANT_URL1"),
        "api_key": os.getenv("QDRANT_KEY1"),
        "name": "Shard 1"
    },
    # Add UR2, KEY2 etc. if you have more instances
]

def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {
        "batches_uploaded": 0,
        "papers_uploaded": 0,
        "current_shard": 0,
        "shard_counts": [0] * len(QDRANT_INSTANCES)
    }

def save_checkpoint(progress):
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(progress, f, indent=2)

def connect_to_shard(shard_index):
    """Connect to a specific Qdrant shard and ensure collection exists"""
    instance = QDRANT_INSTANCES[shard_index]
    sys.stdout.write(f"🔌 Connecting to {instance['name']}... ")
    sys.stdout.flush()
    
    try:
        client = QdrantClient(url=instance["url"], api_key=instance["api_key"])
        
        # Check/Create collection
        colls = client.get_collections().collections
        if not any(c.name == COLLECTION_NAME for c in colls):
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=1536, 
                    distance=Distance.COSINE,
                    on_disk=True,
                    datatype='float16' # Halves storage vs float32
                ),
                quantization_config=ScalarQuantization(
                    scalar=ScalarQuantizationConfig(
                        type=ScalarType.INT8,
                        always_ram=False # Keep quantized vectors on disk if needed
                    )
                ),
                hnsw_config=HnswConfigDiff(
                    on_disk=False, # Link map in RAM = Sub-second search speed
                    m=16           # Standard number of edges per node
                ),
                on_disk_payload=True # Store metadata on disk
            )
            sys.stdout.write(f"Created '{COLLECTION_NAME}' collection (Lean Mode: float16 + int8 Q + RAM HNSW). ✅\n")
        else:
            sys.stdout.write("Connected. ✅\n")
        sys.stdout.flush()
        return client
    except Exception as e:
        sys.stdout.write(f"FAILED ❌\n")
        print(f"   Error: {e}", flush=True)
        sys.exit(1)

def compress_abstract(text):
    """Compress abstract using zlib and encode in base64 for JSON storage"""
    if not text: return ""
    compressed = zlib.compress(text.encode('utf-8'))
    return base64.b64encode(compressed).decode('utf-8')

def upload_to_qdrant():
    if not os.path.exists(EMBEDDED_DATA_DIR):
        print(f"❌ Error: {EMBEDDED_DATA_DIR}/ not found. Run embed.py first.", flush=True)
        sys.exit(1)
    
    batch_files = sorted(Path(EMBEDDED_DATA_DIR).glob("batch_*.npy"))
    if not batch_files:
        print(f"❌ Error: No .npy files in {EMBEDDED_DATA_DIR}/", flush=True)
        sys.exit(1)

    # Load Progress
    progress = load_checkpoint()
    current_shard_idx = progress["current_shard"]
    papers_uploaded = progress["papers_uploaded"]
    batches_done = progress["batches_uploaded"]
    shard_counts = progress["shard_counts"]

    print(f"\n🚀 Qdrant Upload Controller:")
    print(f"   Target:  Collection '{COLLECTION_NAME}'")
    print(f"   Source:  {EMBEDDED_DATA_DIR}/")
    print(f"   Resume:  {batches_done} batches ({papers_uploaded:,} papers) already up")
    if TEST_MODE:
        print(f"   Mode:    TEST (Process 1 batch only)")
    
    # Connect
    client = connect_to_shard(current_shard_idx)

    pbar = tqdm(total=len(batch_files) - batches_done, desc="Transfer", unit="batch")

    for batch_path in batch_files[batches_done:]:
        try:
            # Load the .npy file
            papers = np.load(batch_path, allow_pickle=True)
            
            # Check shard capacity
            if shard_counts[current_shard_idx] + len(papers) > SIZE_LIMIT_VECTORS:
                if current_shard_idx + 1 < len(QDRANT_INSTANCES):
                    print(f"\n   📦 Shard {current_shard_idx+1} is nearly full. Switching...")
                    current_shard_idx += 1
                    client = connect_to_shard(current_shard_idx)
                else:
                    print(f"\n   ⚠️  CRITICAL: All shards are full! Add more in qdrant_setup.py", flush=True)
                    break

            # Upload in sub-batches
            points = []
            for i, paper in enumerate(papers):
                # Ensure we have an embedding
                if "embedding" not in paper: continue
                
                # Truncate authors to first 3 to save payload space
                authors = paper.get("authors", [])
                if isinstance(authors, list) and len(authors) > 3:
                    authors = authors[:3] + ["et al."]
                elif isinstance(authors, str):
                    authors = [authors]

                points.append(PointStruct(
                    id=papers_uploaded + i,
                    vector=paper["embedding"], # Engine will cast to float16
                    payload={
                        "paper_id": paper["id"],
                        "title": paper["title"],
                        "authors": authors,
                        "abstract": compress_abstract(paper["abstract"]),
                        "categories": paper["categories"],
                        "published_date": paper.get("published", "Unknown"),
                        "link": paper["link"],
                        "compressed": True # Flag for decompression
                    }
                ))
                
                # Push sub-batch
                if len(points) >= UPLOAD_BATCH_SIZE:
                    client.upsert(collection_name=COLLECTION_NAME, points=points)
                    shard_counts[current_shard_idx] += len(points)
                    papers_uploaded += len(points)
                    points = []

            # Push remaining
            if points:
                client.upsert(collection_name=COLLECTION_NAME, points=points)
                shard_counts[current_shard_idx] += len(points)
                papers_uploaded += len(points)

            batches_done += 1
            pbar.update(1)
            
            # Save progress
            progress.update({
                "batches_uploaded": batches_done,
                "papers_uploaded": papers_uploaded,
                "current_shard": current_shard_idx,
                "shard_counts": shard_counts
            })
            save_checkpoint(progress)
            
            if TEST_MODE: break

        except Exception as e:
            print(f"\n   ❌ Error in {batch_path.name}: {e}", flush=True)
            break

    pbar.close()
    
    # Final Validation
    print(f"\n📊 Final Status:")
    print(f"   Uploaded: {papers_uploaded:,} total papers")
    for i, count in enumerate(shard_counts):
        if count > 0:
            print(f"   - {QDRANT_INSTANCES[i]['name']}: {count:,} vectors")
    
    print(f"\n✨ Upload Phase Finished!")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        TEST_MODE = True
    upload_to_qdrant()
