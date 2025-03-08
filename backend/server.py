from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import requests 
import faiss  
import time  # Import time for timing tests
from sentence_transformers import SentenceTransformer

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
    index = faiss.read_index(FAISS_INDEX_PATH)
    print(f"FAISS index loaded successfully! Total vectors: {index.ntotal}")

else:
    raise RuntimeError("FAISS index could not be loaded! Check download")

model = SentenceTransformer("all-MiniLM-L6-v2")  # Model stays in memory


@app.route("/search", methods=["POST"])
def search():

    first_time=time.time()
    first_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(first_time)) + f".{int((first_time % 1) * 1000):03d}"
    print(f"Timestamp at start of user_search function: {first_timestamp}")
    
    data = request.get_json()
    query = data.get("query", "").strip()
    

    numPapers = data.get("numPapers")
    if not numPapers or not str(numPapers).isdigit():
        numPapers = 6  # Default to 6 if missing or invalid
    else:
        numPapers = int(numPapers)

    if not query:
        return jsonify({"error": "No query provided"}), 400

    start_time = time.time()  # Start timing for search
    start_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_time)) + f".{int((start_time % 1) * 1000):03d}"
    print(f"Timestamp at user_search start: {start_timestamp}")

    results = user_search(query, index, model, numPapers)

    end_time = time.time()  # Calculate search time
    end_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_time)) + f".{int(((end_time) % 1) * 1000):03d}"
    print(f"Timestamp at user_search end: {end_timestamp}")

    return jsonify({"results": results})

@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"status": "alive"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Azure
    print(f"Starting Flask API on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)



 