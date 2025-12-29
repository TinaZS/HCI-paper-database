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
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "papers_fast")
EMBEDDED_DATA_DIR = "embedded_data"
CHECKPOINT_FILE = f"upload_progress_{COLLECTION_NAME}.json"
REGISTRY_FILE = "shard_registry.json"
UPLOAD_BATCH_SIZE = 200  
SIZE_LIMIT_VECTORS = 580_079  # Capped at current count to force immediate Shard 2 spillover
TEST_MODE = False

# Qdrant instances
QDRANT_INSTANCES = [
    {"url": os.getenv("QDRANT_URL1"), "api_key": os.getenv("QDRANT_KEY1"), "name": "Shard 1"},
    {"url": os.getenv("QDRANT_URL2"), "api_key": os.getenv("QDRANT_KEY2"), "name": "Shard 2"},
]

def load_registry():
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, 'r') as f:
            return json.load(f)
    return {"shards": [{"name": "Shard 1", "count": 0}], "total_papers": 0}

def save_registry(registry):
    with open(REGISTRY_FILE, 'w') as f:
        json.dump(registry, f, indent=2)

def wait_for_green_health(client, name):
    """Pause if cluster is not green to prevent storage deadlocks"""
    while True:
        try:
            status = client.get_collection(COLLECTION_NAME).status
            if status == "green":
                return
            print(f"\n⏳ {name} is {status}. Waiting 2 mins for optimizer... ☕️")
            time.sleep(120)
        except Exception as e:
            # If collection doesn't exist yet, it's fine
            if "not found" in str(e).lower(): return
            print(f"⚠️ Health check error: {e}")
            time.sleep(10)

def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, 'r') as f:
                data = json.load(f)
                # Ensure shard_counts exists and is updated to current shard count
                if "shard_counts" not in data:
                    data["shard_counts"] = [0] * len(QDRANT_INSTANCES)
                while len(data["shard_counts"]) < len(QDRANT_INSTANCES):
                    data["shard_counts"].append(0)
                return data
        except: pass
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
                    datatype='float16'
                ),
                quantization_config=ScalarQuantization(
                    scalar=ScalarQuantizationConfig(
                        type=ScalarType.INT8,
                        always_ram=False
                    )
                ),
                hnsw_config=HnswConfigDiff(on_disk=False, m=16),
                on_disk_payload=True
            )
            sys.stdout.write(f"Created '{COLLECTION_NAME}'. ✅\n")
        else:
            sys.stdout.write("Connected. ✅\n")
        
        # Initial health check
        # wait_for_green_health(client, instance['name'])
        
        sys.stdout.flush()
        return client
    except Exception as e:
        sys.stdout.write(f"FAILED ❌\n")
        print(f"   Error: {e}", flush=True)
        sys.exit(1)

def compress_abstract(text):
    if not text: return ""
    compressed = zlib.compress(text.encode('utf-8'))
    return base64.b64encode(compressed).decode('utf-8')

def upload_to_qdrant():
    if not os.path.exists(EMBEDDED_DATA_DIR):
        print(f"❌ Error: {EMBEDDED_DATA_DIR}/ not found.", flush=True)
        sys.exit(1)
    
    batch_files = sorted(Path(EMBEDDED_DATA_DIR).glob("batch_*.npy"))
    if not batch_files:
        print(f"❌ Error: No .npy files found.", flush=True)
        sys.exit(1)

    progress = load_checkpoint()
    registry = load_registry()
    
    current_shard_idx = progress["current_shard"]
    papers_uploaded = progress["papers_uploaded"]
    batches_done = progress["batches_uploaded"]
    shard_counts = progress["shard_counts"]

    print(f"\n🚀 Qdrant Smart Upload (Limit: {SIZE_LIMIT_VECTORS:,} per instance)")
    print(f"   Shard 1: {shard_counts[0]:,} papers")
    if len(shard_counts) > 1:
        print(f"   Shard 2: {shard_counts[1]:,} papers")
    
    client = connect_to_shard(current_shard_idx)
    pbar = tqdm(total=len(batch_files) - batches_done, desc="Transfer", unit="batch")

    for batch_path in batch_files[batches_done:]:
        try:
            papers = np.load(batch_path, allow_pickle=True)
            
            # Divide batch into current and future shards if needed
            remaining_on_current = SIZE_LIMIT_VECTORS - shard_counts[current_shard_idx]
            
            # Case 1: Batch fits entirely or we are overflowing
            if remaining_on_current >= len(papers):
                papers_for_current = papers
                papers_for_next = []
            elif remaining_on_current > 0:
                # Case 2: "Fill the glass" - split the batch
                print(f"🥛 Filling last {remaining_on_current} spots on {QDRANT_INSTANCES[current_shard_idx]['name']}...")
                papers_for_current = papers[:remaining_on_current]
                papers_for_next = papers[remaining_on_current:]
            else:
                # Case 3: Already full, shift everything to next
                papers_for_current = []
                papers_for_next = papers

            # --- PROCESS CURRENT SHARD ---
            if len(papers_for_current) > 0:
                points = []
                for i, paper in enumerate(papers_for_current):
                    if "embedding" not in paper: continue
                    authors = paper.get("authors", [])
                    if isinstance(authors, list) and len(authors) > 3:
                        authors = authors[:3] + ["et al."]

                    points.append(PointStruct(
                        id=papers_uploaded + i,
                        vector=paper["embedding"],
                        payload={
                            "paper_id": paper["id"], "title": paper["title"], "authors": authors,
                            "abstract": compress_abstract(paper["abstract"]), "categories": paper["categories"],
                            "published_date": paper.get("published", "Unknown"), "link": paper["link"],
                            "compressed": True 
                        }
                    ))
                    if len(points) >= UPLOAD_BATCH_SIZE:
                        client.upsert(collection_name=COLLECTION_NAME, points=points)
                        shard_counts[current_shard_idx] += len(points)
                        papers_uploaded += len(points)
                        points = []
                if points:
                    client.upsert(collection_name=COLLECTION_NAME, points=points)
                    shard_counts[current_shard_idx] += len(points)
                    papers_uploaded += len(points)

            # --- PROCESS SPILLOVER ---
            if len(papers_for_next) > 0:
                if current_shard_idx + 1 < len(QDRANT_INSTANCES):
                    print(f"\n📦 Shard {current_shard_idx+1} full. Spilling {len(papers_for_next)} papers to next...")
                    current_shard_idx += 1
                    try:
                        client = connect_to_shard(current_shard_idx)
                    except SystemExit:
                        print(f"🛑 Spillover failed. Check connectivity to {QDRANT_INSTANCES[current_shard_idx]['name']}.")
                        break
                    
                    points = []
                    for i, paper in enumerate(papers_for_next):
                        if "embedding" not in paper: continue
                        authors = paper.get("authors", [])
                        if isinstance(authors, list) and len(authors) > 3:
                            authors = authors[:3] + ["et al."]

                        points.append(PointStruct(
                            id=papers_uploaded + i,
                            vector=paper["embedding"],
                            payload={
                                "paper_id": paper["id"], "title": paper["title"], "authors": authors,
                                "abstract": compress_abstract(paper["abstract"]), "categories": paper["categories"],
                                "published_date": paper.get("published", "Unknown"), "link": paper["link"],
                                "compressed": True 
                            }
                        ))
                        if len(points) >= UPLOAD_BATCH_SIZE:
                            client.upsert(collection_name=COLLECTION_NAME, points=points)
                            shard_counts[current_shard_idx] += len(points)
                            papers_uploaded += len(points)
                            points = []
                    if points:
                        client.upsert(collection_name=COLLECTION_NAME, points=points)
                        shard_counts[current_shard_idx] += len(points)
                        papers_uploaded += len(points)
                else:
                    print(f"\n⚠️ CRITICAL: All shards are full!", flush=True)
                    break

            batches_done += 1
            pbar.update(1)
            
            # Update Progress & Registry
            progress.update({
                "batches_uploaded": batches_done,
                "papers_uploaded": papers_uploaded,
                "current_shard": current_shard_idx,
                "shard_counts": shard_counts
            })
            save_checkpoint(progress)
            
            # Sync to registry
            registry["total_papers"] = papers_uploaded
            for idx, count in enumerate(shard_counts):
                if idx < len(registry["shards"]):
                    registry["shards"][idx]["count"] = count
                else:
                    registry["shards"].append({
                        "name": f"Shard {idx+1}",
                        "count": count,
                        "status": "active"
                    })
            save_registry(registry)

        except Exception as e:
            print(f"\n❌ Error in {batch_path.name}: {e}", flush=True)
            break

    pbar.close()
    print(f"\n📊 Final: {papers_uploaded:,} papers across {len(shard_counts)} shards. Done! ✨")

if __name__ == "__main__":
    upload_to_qdrant()
