# Chunked arXiv Data Setup

This repository splits the large arXiv metadata JSON file into 64MB chunks for GitHub compatibility.

## How It Works

### 1. **Data Storage**
- Original file: `arxiv-metadata-oai-snapshot.json` (4.8GB) - **NOT in git**
- Chunked files: `data/arxiv-chunk-001.json` through `data/arxiv-chunk-073.json` - **IN git**
- Each chunk: ~64MB (GitHub's limit is 100MB)

### 2. **At Runtime**
When the backend starts, it automatically:
1. Checks if `arxiv-metadata-oai-snapshot.json` exists
2. If not, merges all chunks from `data/` directory
3. Creates the full file for use by the application

### 3. **Scripts**

#### Split Data (One-time)
```bash
python3 scripts/split_arxiv_data.py
```
- Splits the 4.8GB file into 64MB chunks
- Saves to `data/` directory
- Run this once before committing to GitHub

#### Merge Data (Automatic at startup)
```bash
python3 scripts/merge_arxiv_data.py
```
- Merges chunks back into single file
- Called automatically by `backend/server.py`
- Skips if merged file already exists

## Deployment

### Local Development
1. Clone the repository (includes chunks in `data/`)
2. Run backend: `python backend/server.py`
3. Chunks auto-merge on first run
4. Subsequent runs skip merge (file exists)

### Production (Railway/Render)
1. Deploy from GitHub
2. Chunks are included in deployment
3. First startup merges chunks (~30 seconds)
4. Merged file persists on disk
5. Subsequent restarts are instant

## File Sizes

- **Original**: 4.8GB (not in git)
- **Chunks**: 73 files × ~64MB = 4.7GB (in git)
- **Total repo size**: ~4.7GB

## Why This Approach?

✅ **Pros:**
- No database storage costs
- Fast local access (no network latency)
- Works with free tier hosting
- Simple deployment

⚠️ **Cons:**
- Large repository size (~4.7GB)
- Initial clone takes longer
- First startup takes ~30 seconds to merge

## Alternative: Download at Runtime

If you prefer not to store chunks in git, you can:
1. Upload chunks to cloud storage (S3, Supabase Storage)
2. Download at startup instead of merging
3. Modify `scripts/merge_arxiv_data.py` to download first

Example:
```python
# Download chunks from S3/Supabase before merging
for i in range(1, 74):
    chunk_url = f"https://your-storage.com/arxiv-chunk-{i:03d}.json"
    download_file(chunk_url, f"data/arxiv-chunk-{i:03d}.json")

# Then merge as usual
merge_chunks()
```
