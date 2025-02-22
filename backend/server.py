from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import requests 
import faiss  
import time  # Import time for timing tests

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.user_search import user_search

FAISS_INDEX_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "faiss_index.index"))



FAISS_STORAGE_URL = "https://xcujrcskstfsjunxfktx.supabase.co/storage/v1/object/public/faiss-index//faiss_index.index"

app = Flask(__name__)
CORS(app, resources={r"/search": {"origins": "*"}}, supports_credentials=True, max_age=31536000) 


def download_faiss_index():
    """Download FAISS index from Supabase Storage."""
    if os.path.exists(FAISS_INDEX_PATH):
        print("FAISS index already exists. Skipping download.")
        return  # Skip downloading

    print("Downloading FAISS index from Supabase...")
    response = requests.get(FAISS_STORAGE_URL)
    if response.status_code == 200:
        with open(FAISS_INDEX_PATH, "wb") as f:
            f.write(response.content)
        print("FAISS index downloaded successfully.")
    else:
        print("ERROR: Failed to download FAISS index from Supabase")


download_faiss_index()

if os.path.exists(FAISS_INDEX_PATH):
    start_time = time.time()  # Start timing
    index = faiss.read_index(FAISS_INDEX_PATH)
    load_time = time.time() - start_time  # Calculate load time
    print(f"FAISS index loaded successfully in {load_time:.2f} seconds! Total vectors: {index.ntotal}")

else:
    raise RuntimeError("FAISS index could not be loaded! Check download")



@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"error": "No query provided"}), 400

    start_time = time.time()  # Start timing for search
    results = user_search(query, index)
    search_time = time.time() - start_time  # Calculate search time

    print(f"Search executed in {search_time:.2f} seconds.")

    return jsonify({"results": results})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))  # Default to 10000 as per Render
    print(f"Starting Flask API on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)


