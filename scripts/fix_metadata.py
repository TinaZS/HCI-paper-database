#!/usr/bin/env python3
import json
import os
import numpy as np
from pathlib import Path
from tqdm import tqdm

INPUT_FILE = "arxiv-metadata-oai-snapshot.json"
EMBEDDED_DATA_DIR = "embedded_data"

def fix_metadata():
    if not os.path.exists(EMBEDDED_DATA_DIR):
        print("No embedded data found.")
        return

    batch_files = sorted(Path(EMBEDDED_DATA_DIR).glob("batch_*.npy"))
    if not batch_files:
        print("No batches to fix.")
        return

    # Collect IDs we need to fix
    id_map = {} # id -> date
    target_ids = set()
    
    print("📋 Scanning existing batches for IDs...")
    for batch_path in batch_files:
        papers = np.load(batch_path, allow_pickle=True)
        for p in papers:
            target_ids.add(p['id'])

    print(f"🔍 Searching for dates of {len(target_ids)} papers in ArXiv snapshot...")
    with open(INPUT_FILE, 'r') as f:
        for line in tqdm(f, total=2818534): # Approx total
            paper = json.loads(line)
            pid = paper.get("id")
            if pid in target_ids:
                versions = paper.get("versions", [])
                date = versions[0].get("created", paper.get("update_date", "Unknown")) if versions else paper.get("update_date", "Unknown")
                cats = paper.get("categories", "")
                cat_list = cats.split() if isinstance(cats, str) else []
                id_map[pid] = {"date": date, "cats": cat_list}
                if len(id_map) >= len(target_ids):
                    break

    print("💾 Updating .npy files...")
    for batch_path in batch_files:
        papers = np.load(batch_path, allow_pickle=True)
        updated_papers = []
        for p in papers:
            meta = id_map.get(p['id'], {})
            p['published'] = meta.get("date", "Unknown")
            p['categories'] = meta.get("cats", [])
            updated_papers.append(p)
        np.save(batch_path, updated_papers, allow_pickle=True)

    print("✅ Metadata repair complete! You can now run qdrant_setup.py to re-upload (it will overwrite with correct dates).")

if __name__ == "__main__":
    fix_metadata()
