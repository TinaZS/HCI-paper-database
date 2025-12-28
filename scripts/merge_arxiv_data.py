#!/usr/bin/env python3
"""
Merge chunked arXiv JSON files back into a single file at runtime.
This runs when the backend starts up to reconstruct the full dataset.
"""

import os
import glob
import sys

# Configuration
CHUNKS_DIR = "data"
OUTPUT_FILE = "arxiv-metadata-oai-snapshot.json"

def merge_chunks():
    """Merge all chunk files into a single JSON file."""
    
    # Find all chunk files
    chunk_pattern = os.path.join(CHUNKS_DIR, "arxiv-chunk-*.json")
    chunk_files = sorted(glob.glob(chunk_pattern))
    
    if not chunk_files:
        print(f"❌ Error: No chunk files found in {CHUNKS_DIR}/")
        print(f"   Looking for pattern: {chunk_pattern}")
        sys.exit(1)
    
    # Check if merged file already exists
    if os.path.exists(OUTPUT_FILE):
        file_size = os.path.getsize(OUTPUT_FILE)
        print(f"✅ Merged file already exists: {OUTPUT_FILE}")
        print(f"   Size: {file_size / (1024**3):.2f} GB")
        print(f"   Skipping merge.")
        return OUTPUT_FILE
    
    print(f"📂 Merging {len(chunk_files)} chunks into {OUTPUT_FILE}...")
    
    total_lines = 0
    total_bytes = 0
    
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
            for i, chunk_file in enumerate(chunk_files, 1):
                chunk_name = os.path.basename(chunk_file)
                chunk_size = os.path.getsize(chunk_file)
                
                print(f"   [{i}/{len(chunk_files)}] Merging {chunk_name} ({chunk_size / (1024**2):.2f} MB)...", end='')
                
                lines_in_chunk = 0
                with open(chunk_file, 'r', encoding='utf-8') as infile:
                    for line in infile:
                        outfile.write(line)
                        lines_in_chunk += 1
                        total_lines += 1
                
                total_bytes += chunk_size
                print(f" {lines_in_chunk:,} lines")
        
        print(f"\n✨ Success! Merged {len(chunk_files)} chunks")
        print(f"   Total lines: {total_lines:,}")
        print(f"   Total size: {total_bytes / (1024**3):.2f} GB")
        print(f"   Output file: {OUTPUT_FILE}")
        
        return OUTPUT_FILE
        
    except Exception as e:
        print(f"\n❌ Error during merge: {e}")
        # Clean up partial file
        if os.path.exists(OUTPUT_FILE):
            os.remove(OUTPUT_FILE)
            print(f"   Cleaned up partial file: {OUTPUT_FILE}")
        sys.exit(1)

if __name__ == "__main__":
    merge_chunks()
