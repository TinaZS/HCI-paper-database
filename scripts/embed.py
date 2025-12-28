#!/usr/bin/env python3
import json
import os
import sys
import numpy as np
from tqdm import tqdm
import time
from dotenv import load_dotenv
import openai

# Force environment reload
load_dotenv()

# Configuration
INPUT_FILE = "arxiv-metadata-oai-snapshot.json"
OUTPUT_DIR = "embedded_data"
CHECKPOINT_FILE = "embedding_progress.json"
BATCH_SIZE = 200  # API batch size (Pushing toward 1M TPM limit)
SAVE_BATCH_SIZE = 1000 # Save results in chunks of 1000 to avoid file-system clutter
TEST_MODE = False

# Azure OpenAI setup
AZURE_API_KEY = os.getenv("NEW_AZURE_OPENAI_API_KEY")
AZURE_ENDPOINT = os.getenv("NEW_AZURE_OPENAI_ENDPOINT")
AZURE_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")

if not all([AZURE_API_KEY, AZURE_ENDPOINT, AZURE_DEPLOYMENT]):
    print("❌ Error: Missing Azure OpenAI credentials (NEW_AZURE_*) in .env", flush=True)
    sys.exit(1)

client = openai.AzureOpenAI(
    api_key=AZURE_API_KEY,
    azure_endpoint=AZURE_ENDPOINT,
    api_version="2023-05-15"
)

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

def countdown(seconds):
    """Visual countdown for rate limit waits so user knows script is alive"""
    for i in range(seconds, 0, -1):
        sys.stdout.write(f"\r   ⏳ Azure Throttling: Resuming in {i}s... ")
        sys.stdout.flush()
        time.sleep(1)
    sys.stdout.write("\r" + " " * 60 + "\r")
    sys.stdout.flush()

def batch_embed(texts, retry_count=5):
    """Generate embeddings with immediate console feedback and flushing"""
    for attempt in range(retry_count):
        try:
            sys.stdout.write(f"   ➡️  Azure API: Requesting {len(texts)} embeddings... ")
            sys.stdout.flush()
            
            response = client.embeddings.create(
                model=AZURE_DEPLOYMENT,
                input=texts,
                encoding_format="float"
            )
            
            sys.stdout.write("Success! ✅\n")
            sys.stdout.flush()
            return [item.embedding for item in response.data]
            
        except Exception as e:
            err_msg = str(e).lower()
            sys.stdout.write("FAILED ❌\n")
            sys.stdout.flush()
            
            if "429" in err_msg or "too many requests" in err_msg:
                # Rate limit hit - usually TPM (Tokens Per Minute)
                wait_time = 45 * (attempt + 1)
                print(f"   ⚠️  Rate Limit (429) hit. Azure is throttling this deployment.", flush=True)
                countdown(wait_time)
            else:
                if attempt < retry_count - 1:
                    wait_time = 5 * (attempt + 1)
                    print(f"   ⚠️  API connection error: {e}. Retrying in {wait_time}s...", flush=True)
                    time.sleep(wait_time)
                else:
                    print(f"   ❌ Critical API failure: {e}", flush=True)
                    raise

def process_papers():
    """Main processing loop with clear progress indicators"""
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: {INPUT_FILE} not found in root", flush=True)
        sys.exit(1)
    
    # Load progress
    progress = {"papers_processed": 0, "batches_completed": 0}
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            try:
                progress = json.load(f)
            except:
                pass

    start_from = progress["papers_processed"]
    
    print(f"\n🚀 System Status:")
    print(f"   Input: {INPUT_FILE}")
    print(f"   Skip:  {start_from:,} papers already done")
    
    if TEST_MODE:
        total_to_process = BATCH_SIZE
        print(f"   Mode:  TEST (Target: {total_to_process} papers)")
    else:
        print("📊 Counting library size (one moment)...", flush=True)
        with open(INPUT_FILE, 'r') as f:
            total_papers = sum(1 for _ in f)
        total_to_process = total_papers - start_from
        print(f"   Target: {total_to_process:,} papers remaining")

    print(f"   Batch: {BATCH_SIZE} papers per API call\n", flush=True)
    
    batch_papers, batch_texts = [], []
    aggregated_papers = []
    processed_count = 0
    file_num = progress["batches_completed"] # Reusing field to maintain numbering
    
    with open(INPUT_FILE, 'r') as f:
        # Fast skip to checkpoint
        if start_from > 0:
            for _ in range(start_from):
                next(f)
        
        pbar = tqdm(total=total_to_process, desc="Overall Progress", unit="paper", position=0, leave=True)
        
        for line in f:
            try:
                paper = json.loads(line)
                # ArXiv stores publication date in the 'versions' list
                versions = paper.get("versions", [])
                published_date = versions[0].get("created", paper.get("update_date", "Unknown")) if versions else paper.get("update_date", "Unknown")

                # Categories are space-separated strings in ArXiv source
                cats = paper.get("categories", "")
                cat_list = cats.split() if isinstance(cats, str) else []

                paper_data = {
                    "id": paper.get("id", ""),
                    "title": paper.get("title", ""),
                    "authors": paper.get("authors", []),
                    "abstract": paper.get("abstract", ""),
                    "categories": cat_list,
                    "published": published_date,
                    "link": f"https://arxiv.org/abs/{paper.get('id', '')}"
                }
                
                batch_papers.append(paper_data)
                # Match embedding text logic: title + abstract
                batch_texts.append(f"{paper_data['title']} {paper_data['abstract']}")
                
                if len(batch_texts) >= BATCH_SIZE:
                    embeddings = batch_embed(batch_texts)
                    
                    if embeddings:
                        for i, p in enumerate(batch_papers):
                            p["embedding"] = embeddings[i]
                        
                        aggregated_papers.extend(batch_papers)
                        processed_count += len(batch_papers)
                        pbar.update(len(batch_papers))

                        if len(aggregated_papers) >= SAVE_BATCH_SIZE:
                            out_path = os.path.join(OUTPUT_DIR, f"batch_1k_{file_num:05d}.npy")
                            np.save(out_path, aggregated_papers, allow_pickle=True)
                            
                            sys.stdout.write(f"   📦 AGGREGATED: Saved {len(aggregated_papers)} papers to {out_path}\n")
                            sys.stdout.flush()
                            
                            file_num += 1
                            # Save checkpoint ONLY after saving a file
                            progress.update({
                                "papers_processed": start_from + processed_count,
                                "batches_completed": file_num
                            })
                            with open(CHECKPOINT_FILE, 'w') as cf:
                                json.dump(progress, cf)
                            
                            aggregated_papers = []
                        
                    batch_papers, batch_texts = [], []
                    if TEST_MODE:
                        break
                        
            except Exception as e:
                print(f"   ⚠️  Processing error: {e}", flush=True)
                continue
            
            if TEST_MODE and processed_count >= BATCH_SIZE:
                break
        
        # Save any remaining papers
        if aggregated_papers:
            out_path = os.path.join(OUTPUT_DIR, f"batch_1k_{file_num:05d}.npy")
            np.save(out_path, aggregated_papers, allow_pickle=True)
            sys.stdout.write(f"   📦 FINAL: Saved {len(aggregated_papers)} papers to {out_path}\n")
            sys.stdout.flush()
            file_num += 1
            progress.update({
                "papers_processed": start_from + processed_count,
                "batches_completed": file_num
            })
            with open(CHECKPOINT_FILE, 'w') as cf:
                json.dump(progress, cf)
        
        pbar.close()

    print(f"\n✨ Generation Finished!")
    print(f"   New papers processed: {processed_count:,}")
    print(f"   Total library size:   {progress['papers_processed']:,}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        TEST_MODE = True
    process_papers()
