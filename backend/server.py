from flask import Flask, request, jsonify
from flask_cors import CORS

from io import BytesIO
import sys
import os
import requests 
import faiss  # Add this line

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.user_search import user_search



FAISS_STORAGE_URL = "https://xcujrcskstfsjunxfktx.supabase.co/storage/v1/object/public/faiss-index//faiss_index.index"

app = Flask(__name__)
CORS(app) 

def download_faiss_index():
    """Download FAISS index from Supabase Storage."""
    response = requests.get(FAISS_STORAGE_URL)
    if response.status_code == 200:
        with open("faiss_index.index", "wb") as f:
            f.write(response.content)
        print("FAISS index downloaded successfully from Supabase")
    else:
        print("ERROR: Failed to download FAISS index from Supabase")

download_faiss_index()
index = faiss.read_index("faiss_index.index")


@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"error": "No query provided"}), 400

    results = user_search(query)

    return jsonify({"results": results})


if __name__ == "__main__":
    print("Starting Flask API on port 5001")
    app.run(host="0.0.0.0", port=5001, debug=False)

