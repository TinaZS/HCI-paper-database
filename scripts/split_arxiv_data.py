#!/usr/bin/env python3
"""
Split large arXiv JSON file into 64MB chunks for GitHub upload.
GitHub has a 100MB file size limit, so we use 64MB chunks for safety.
"""

import os
import sys

# Configuration
INPUT_FILE = "arxiv-metadata-oai-snapshot.json"
OUTPUT_DIR = "data"
CHUNK_SIZE_MB = 64
CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024  # 64MB in bytes

def split_json_file():
    """Split the large JSON file into chunks."""
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: {INPUT_FILE} not found!")
        print(f"   Current directory: {os.getcwd()}")
        sys.exit(1)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print(f"📂 Splitting {INPUT_FILE} into {CHUNK_SIZE_MB}MB chunks...")
    print(f"   Output directory: {OUTPUT_DIR}/")
    
    file_size = os.path.getsize(INPUT_FILE)
    print(f"   Total file size: {file_size / (1024**3):.2f} GB")
    
    chunk_num = 0
    current_chunk_size = 0
    output_file = None
    lines_in_chunk = 0
    total_lines = 0
    
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as infile:
            for line in infile:
                # Start new chunk if needed
                if output_file is None or current_chunk_size >= CHUNK_SIZE_BYTES:
                    if output_file:
                        output_file.close()
                        print(f"   ✅ Chunk {chunk_num:03d}: {lines_in_chunk:,} lines, {current_chunk_size / (1024**2):.2f} MB")
                    
                    chunk_num += 1
                    chunk_filename = os.path.join(OUTPUT_DIR, f"arxiv-chunk-{chunk_num:03d}.json")
                    output_file = open(chunk_filename, 'w', encoding='utf-8')
                    current_chunk_size = 0
                    lines_in_chunk = 0
                
                # Write line to current chunk
                output_file.write(line)
                line_size = len(line.encode('utf-8'))
                current_chunk_size += line_size
                lines_in_chunk += 1
                total_lines += 1
                
                # Progress indicator
                if total_lines % 10000 == 0:
                    print(f"   Processing... {total_lines:,} lines", end='\r')
        
        # Close final chunk
        if output_file:
            output_file.close()
            print(f"   ✅ Chunk {chunk_num:03d}: {lines_in_chunk:,} lines, {current_chunk_size / (1024**2):.2f} MB")
        
        print(f"\n✨ Success! Created {chunk_num} chunks from {total_lines:,} total lines")
        print(f"   Chunks saved to: {OUTPUT_DIR}/")
        print(f"\n📝 Next steps:")
        print(f"   1. Add data/ to git: git add data/")
        print(f"   2. Commit: git commit -m 'Add chunked arXiv data'")
        print(f"   3. Push to GitHub: git push")
        print(f"   4. At runtime, use scripts/merge_arxiv_data.py to reconstruct")
        
    except Exception as e:
        print(f"\n❌ Error during splitting: {e}")
        if output_file:
            output_file.close()
        sys.exit(1)

if __name__ == "__main__":
    split_json_file()
