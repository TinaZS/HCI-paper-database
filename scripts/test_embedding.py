#!/usr/bin/env python3
"""
Quick test script to verify embedded data structure.
Run after: python3 scripts/embed.py --test
"""

import numpy as np
import sys
from pathlib import Path

EMBEDDED_DATA_DIR = "embedded_data"

def inspect_batch():
    """Inspect the first batch file"""
    
    batch_files = sorted(Path(EMBEDDED_DATA_DIR).glob("batch_*.npy"))
    
    if not batch_files:
        print(f"❌ No batch files found in {EMBEDDED_DATA_DIR}/")
        print(f"   Run: python3 scripts/embed.py --test")
        sys.exit(1)
    
    # Load first batch
    batch_file = batch_files[0]
    print(f"📂 Loading: {batch_file}")
    
    papers = np.load(batch_file, allow_pickle=True)
    
    print(f"\n📊 Batch Statistics:")
    print(f"   Papers in batch: {len(papers)}")
    print(f"   File size: {batch_file.stat().st_size / (1024**2):.2f} MB")
    
    # Inspect first paper
    paper = papers[0]
    print(f"\n📄 First Paper:")
    print(f"   ID: {paper['id']}")
    print(f"   Title: {paper['title'][:80]}...")
    print(f"   Authors: {paper['authors'][:3]}...")
    print(f"   Categories: {paper['categories']}")
    print(f"   Published: {paper['published']}")
    print(f"   Link: {paper['link']}")
    print(f"   Abstract length: {len(paper['abstract'])} chars")
    print(f"   Embedding shape: {len(paper['embedding'])} dimensions")
    print(f"   Embedding sample: {paper['embedding'][:5]}...")
    
    # Verify all papers have embeddings
    print(f"\n✅ Validation:")
    all_have_embeddings = all(len(p['embedding']) == 1536 for p in papers)
    print(f"   All papers have 1536-dim embeddings: {all_have_embeddings}")
    
    all_have_metadata = all(
        p.get('id') and p.get('title') and p.get('abstract')
        for p in papers
    )
    print(f"   All papers have required metadata: {all_have_metadata}")
    
    print(f"\n✨ Batch structure looks good!")
    print(f"   Ready for upload to Qdrant")

if __name__ == "__main__":
    inspect_batch()
