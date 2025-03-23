from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import requests 
import faiss  
import time  # Import time for timing tests
import os
import jwt  # PyJWT library to decode JWT tokens



sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.user_search import user_search
from supabase_client import supabase 
from dotenv import load_dotenv

load_dotenv()
FRONTEND_URL = os.getenv("FRONTEND_URL")

FAISS_INDEX_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "faiss_index.index"))
FAISS_STORAGE_URL = "https://xcujrcskstfsjunxfktx.supabase.co/storage/v1/object/public/faiss-index//faiss_index.index"

app = Flask(__name__)

CORS(app, 
     resources={r"/*": {"origins": [FRONTEND_URL]}}, 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Access-Control-Allow-Credentials"],
     methods=["GET", "POST", "OPTIONS", "DELETE"]
)


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return jsonify({"message": "CORS preflight request"}), 200


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



@app.route("/search", methods=["POST"])
def search():

    first_time=time.time()
    first_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(first_time)) + f".{int((first_time % 1) * 1000):03d}"
    print(f"Timestamp at start of user_search function: {first_timestamp}")
    
    data = request.get_json()
    useEmbeddings=data.get("embedState")

    if useEmbeddings==False:
        query = data.get("query", "").strip()
    else:
        query=data.get("query","")
    print("query is ",query)

    topic=data.get("topic")
    print("TOPIC IS ",topic)


    auth_header = request.headers.get('Authorization')

    if not auth_header:
        return jsonify({"authenticated": False, "error": "Authorization token required"}), 401

    try:
        # Extract token from the 'Bearer <token>' format
        token = auth_header.split(" ")[1]

        # Get the user from Supabase using the token
        user = supabase.auth.get_user(token)

        user_id=user.user.id
        print("User ID is ",user_id)

    except Exception as e:
        return jsonify({"authenticated": False, "error": str(e)}), 500


    numPapers = data.get("numPapers")
    if not numPapers or not str(numPapers).isdigit():
        numPapers = 6  # Default to 6 if missing or invalid
    else:
        numPapers = int(numPapers)
    print("next query checkpoint")

    if not query:
        print("bad query")
        return jsonify({"error": "No query provided"}), 400

    start_time = time.time()  # Start timing for search
    start_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_time)) + f".{int((start_time % 1) * 1000):03d}"
    print(f"Timestamp at user_search start: {start_timestamp}")

    
    #add user id as an input
    results = user_search(query, index, numPapers,useEmbeddings,topic,user_id)

    end_time = time.time()  # Calculate search time
    end_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_time)) + f".{int(((end_time) % 1) * 1000):03d}"
    print(f"Timestamp at user_search end: {end_timestamp}")

    return jsonify({"results": results})

def extract_user_id_from_token():
    """Extract user_id from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, jsonify({"error": "Missing or invalid token"}), 401

    token = auth_header.split("Bearer ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})  # Decode the JWT
        user_id = decoded_token.get("sub")
        if not user_id:
            return None, jsonify({"error": "Invalid token"}), 401
        return user_id, None  # Return user_id if successful
    except Exception as e:
        return None, jsonify({"error": "Invalid token", "details": str(e)}), 401


@app.route("/like", methods=["POST"])
def like_paper():
    try:
        user_id, error_response = extract_user_id_from_token()
        if error_response:
            return error_response  # Return error if token is invalid

        data = request.get_json()
        paper_id = data.get("paper_id")
        if not paper_id:
            return jsonify({"error": "Missing paper_id"}), 400

        response = supabase.table("likes").insert({"user_id": user_id, "paper_id": paper_id}).execute()
        return jsonify({"message": "Paper liked successfully!"}), 200

    except Exception as e:
        return jsonify({"error": "Something went wrong", "details": str(e)}), 500

@app.route("/unlike", methods=["POST"])
def unlike_paper():
    try:
        user_id, error_response = extract_user_id_from_token()
        if error_response:
            return error_response  # Return error if token is invalid

        data = request.get_json()
        paper_id = data.get("paper_id")
        if not paper_id:
            return jsonify({"error": "Missing paper_id"}), 400

        response = supabase.table("likes").delete().match({"user_id": user_id, "paper_id": paper_id}).execute()

        if hasattr(response, "data") and response.data is not None:
            return jsonify({"message": "Like removed successfully"}), 200
        else:
            return jsonify({"error": "Failed to remove like"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/get_papers_by_reaction", methods=["GET"])
def get_papers_by_reaction():
    print(f"✅ CORS configured for: {FRONTEND_URL}") 
    try:
        user_id, error_response = extract_user_id_from_token()
        if error_response:
            return error_response  # Return error if token is invalid

        reaction_type = request.args.get("reaction_type", "like")  # Default to "like"

        print(f"Fetching {reaction_type}d papers for user: {user_id}")

        # Ensure reaction_type is valid
        if reaction_type not in ["like", "dislike"]:
            return jsonify({"error": "Invalid reaction_type"}), 400

        # Query Supabase filtering by reaction type
        response = (
            supabase
            .table("likes")  # This table stores likes and dislikes
            .select("paper_id, reaction_type, new_papers(title, authors, abstract, published_date, link, categories, embedding)")
            .eq("user_id", user_id)
            .eq("reaction_type", reaction_type)  # Filter only for like/dislike
            .execute()
        )

        if not response or not hasattr(response, "data"):
            print(f"Supabase response issue for {reaction_type}:", response)
            return jsonify({"papers": []}), 200

        # Extract full paper details
        papers = [
            {
                "paper_id": row["paper_id"],
                "title": row["new_papers"]["title"],
                "authors": row["new_papers"]["authors"],
                "abstract": row["new_papers"].get("abstract", "No abstract available"),
                "datePublished": row["new_papers"].get("published_date", "Unknown"),
                "link": row["new_papers"]["link"],
                "categories": row["new_papers"]["categories"],
                "embedding": row["new_papers"]["embedding"]
            }
            for row in response.data
        ]

        print(f"User {user_id} {reaction_type}d papers:", papers)

        return jsonify({"papers": papers}), 200

    except Exception as e:
        print(f"Error fetching {reaction_type} papers:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/react_to_paper", methods=["POST"])
def react_to_paper():
    """Unified API for handling likes and dislikes."""
    try:
        user_id, error_response = extract_user_id_from_token()
        if error_response:
            return error_response  # Invalid token

        data = request.get_json()
        paper_id = data.get("paper_id")
        reaction_type = data.get("reaction_type")  # 'like' or 'dislike'

        if not paper_id or reaction_type not in ["like", "dislike"]:
            return jsonify({"error": "Missing or invalid paper_id/reaction_type"}), 400

        # ✅ Check if user has already reacted
        existing_reaction = (
            supabase.table("likes")
            .select("reaction_type")
            .match({"user_id": user_id, "paper_id": paper_id})
            .execute()
        )

        if existing_reaction.data:
            existing_type = existing_reaction.data[0]["reaction_type"]

            if existing_type == reaction_type:
                # ✅ Remove reaction if it's the same (toggle behavior)
                supabase.table("likes").delete().match({"user_id": user_id, "paper_id": paper_id}).execute()
                return jsonify({"message": f"Removed {reaction_type} reaction"}), 200
            else:
                # ✅ Update reaction if user switches from like <-> dislike
                supabase.table("likes").update({"reaction_type": reaction_type}).match({"user_id": user_id, "paper_id": paper_id}).execute()
                return jsonify({"message": f"Updated reaction to {reaction_type}"}), 200

        # ✅ Insert new reaction
        supabase.table("likes").insert({"user_id": user_id, "paper_id": paper_id, "reaction_type": reaction_type}).execute()
        return jsonify({"message": f"Paper {reaction_type}d successfully!"}), 200

    except Exception as e:
        return jsonify({"error": "Something went wrong", "details": str(e)}), 500




@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"status": "alive"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))  # Render
    print(f"Starting Flask API on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)



 