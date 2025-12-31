from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import requests 
import time  # Import time for timing tests
import os
import jwt  # PyJWT library to decode JWT tokens



sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from scripts.user_search import user_search
from scripts.generate_answer import generate_answer_from_papers
from supabase_client import supabase 
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()
FRONTEND_URL = os.getenv("FRONTEND_URL")


# --- Qdrant Initialization ---
active_collection = os.getenv("QDRANT_COLLECTION", "papers")
qdrant_clients = []
print(f"🔌 Initializing Qdrant clients (Active Collection: '{active_collection}')...")
for i in range(1, 20):  # Dynamic support up to 20 shards
    url = os.getenv(f"QDRANT_URL{i}")
    key = os.getenv(f"QDRANT_KEY{i}")
    if not url:
        break # Stop checking if no more shards are defined
        
    try:
        client = QdrantClient(url=url, api_key=key, timeout=30.0)
        # Verify connection
        client.get_collections()
        qdrant_clients.append(client)
        print(f"   ✅ Connected to Qdrant Shard {i}")
    except Exception as e:
        print(f"   ⚠️ Failed to connect to Qdrant Shard {i}: {e}")

app = Flask(__name__)

CORS(app, 
     resources={r"/*": {"origins": "*"}}, 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Access-Control-Allow-Credentials","XSessionName"],
     methods=["GET", "POST", "OPTIONS", "DELETE"]
)


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return jsonify({"message": "CORS preflight request"}), 200


@app.route("/search", methods=["POST"])
def search():
    print("🔍 /search endpoint hit!")  # <-- Add this

    first_time=time.time()
    first_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(first_time)) + f".{int((first_time % 1) * 1000):03d}"
    print(f"Timestamp at start of user_search function: {first_timestamp}")
    
    data = request.get_json()
    useEmbeddings=data.get("embedState")

    if not useEmbeddings:
        query = data.get("query", "").strip()
    else:
        query = data.get("query", "")
    
    log_query = f"LIST (len={len(query)})" if isinstance(query, list) else query
    print(f"query is {log_query}")

    topic=data.get("topic")
    print("TOPIC IS ",topic)


    auth_header = request.headers.get("Authorization")
    user_id = None  # Default to guest

    if auth_header and "Bearer" in auth_header:
        try:
            token = auth_header.split(" ")[1]
            user = supabase.auth.get_user(token)
            user_id = user.user.id if user and hasattr(user, "user") else None
            print("✅ Authenticated user ID:", user_id)
        except Exception as e:
            print("⚠️ Invalid or expired token. Proceeding as guest.")

    numPapers = data.get("numPapers")
    if not numPapers or not str(numPapers).isdigit():
        numPapers = 6  # Default to 6 if missing or invalid
    else:
        numPapers = int(numPapers)
    print("next query checkpoint")

    # If it's a list, check if it has content. If it's a string, check if not empty.
    is_empty = False
    if isinstance(query, list):
        is_empty = (len(query) == 0)
    elif not query:
        is_empty = True

    if is_empty:
        print(f"bad query detected: {query} (type: {type(query)})")
        return jsonify({"error": "No query provided or empty vector"}), 400

    start_time = time.time()  # Start timing for search
    start_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_time)) + f".{int((start_time % 1) * 1000):03d}"
    print(f"Timestamp at user_search start: {start_timestamp}")

    
    # Extract Session ID for boosting
    session_id = request.headers.get("XSessionName")

    # Pass qdrant_clients to the search logic
    results = user_search(query, index, numPapers, useEmbeddings, topic, user_id, qdrant_clients=qdrant_clients, session_id=session_id)

    end_time = time.time()  # Calculate search time
    end_timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_time)) + f".{int(((end_time) % 1) * 1000):03d}"
    print(f"Timestamp at user_search end: {end_timestamp}")

    return jsonify({"results": results})

def extract_user_id_from_token():
    """Extract user_id from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, (jsonify({"error": "Missing or invalid token"}), 401)

    token = auth_header.split("Bearer ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})  # Decode the JWT
        user_id = decoded_token.get("sub")
        if not user_id:
            return None, (jsonify({"error": "Invalid token"}), 401)
        return user_id, None  # Return user_id if successful
    except Exception as e:
        return None, (jsonify({"error": "Invalid token", "details": str(e)}), 401)


@app.route("/rag_query", methods=["POST"])
def rag_query():
    """RAG chatbot endpoint - answers questions using papers from database"""
    data = request.get_json()
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"answer": "No query provided."}), 400

    try:
        # Disable personalization for RAG queries - use guest mode for consistent results
        results = user_search(
            query=query,
            index=index,
            numPapers=8,  # Get more papers for better coverage
            embedState=False,
            topic=None,
            user_id=None,  # Force guest mode (no personalization)
            qdrant_clients=qdrant_clients
        )

        # Fallback search strategies if initial search fails
        if not results:
            print("Initial search returned no results, trying fallback with more papers...")
            
            # Strategy 1: More papers with wider net
            results = user_search(
                query=query,
                index=index,
                numPapers=20,  # Cast wider net
                embedState=False,
                topic=None,
                user_id=None,
                qdrant_clients=qdrant_clients
            )
            
            # Strategy 2: Try simplified/expanded query terms
            if not results and len(query.split()) > 2:
                # Extract key terms for broader search
                key_terms = []
                stop_words = {'for', 'in', 'on', 'with', 'the', 'a', 'an', 'and', 'or', 'but'}
                words = query.lower().split()
                for word in words:
                    if word not in stop_words and len(word) > 2:
                        key_terms.append(word)
                
                if key_terms:
                    broader_query = " ".join(key_terms[:3])  # Use top 3 key terms
                    print(f"Trying broader query: '{broader_query}'")
                    results = user_search(
                        query=broader_query,
                        index=index,
                        numPapers=12,
                        embedState=False,
                        topic=None,
                        user_id=None
                    )
        
        if not results:
            return jsonify({"answer": "I couldn't find any relevant papers in the database for your question. Please try rephrasing your query or asking about a different topic."})

        # Generate conversational answer using retrieved papers
        answer = generate_answer_from_papers(query, results)
        return jsonify({"answer": answer})

    except Exception as e:
        print("❌ RAG error:", e)
        return jsonify({"answer": f"Something went wrong: {str(e)}"}), 500





def papers_from_events(events):
    """Utility to hydrate paper details from Qdrant using a list of user_events."""
    if not events: return []
    
    # Extract unique Qdrant IDs
    q_ids = list(set(e["qdrant_id"] for e in events if e.get("qdrant_id")))
    if not q_ids: return []

    # Map for easy lookup after hydration
    papers = []
    
    # Re-use the existing hydration logic (needs access to clients and hydrate_papers)
    # Since server.py has qdrant_clients, we can use them
    for client in qdrant_clients:
        hydrated = hydrate_papers(client, q_ids)
        for point in hydrated:
            p = point.payload
            papers.append({
                "paper_id": p.get("paper_id"),
                "qdrant_id": point.id,
                "title": p.get("title"),
                "authors": p.get("authors", []),
                "abstract": p.get("abstract", ""),
                "datePublished": p.get("published_date"),
                "link": p.get("link"),
                "categories": p.get("categories", []),
                "embedding": point.vector
            })
            # Remove from q_ids once found to avoid redundant work across shards
            if point.id in q_ids:
                q_ids.remove(point.id)
        
        if not q_ids: break

    return papers

@app.route("/get_papers_by_reaction", methods=["GET"])
def get_papers_by_reaction():
    print(f"✅ CORS configured for: {FRONTEND_URL}") 
    try:
        user_id, error_response = extract_user_id_from_token()
        if error_response:
            return error_response  # Return error if token is invalid

        reaction_type = request.args.get("reaction_type", "like")  # Default to "like"
        session_name = request.headers.get('XSessionName')  # Use the correct header names

        if session_name=="Session 1":
            print("EQUIVALENT")
        else:
            print("NOT EQUIVALENT")

        print("Session name in get_papers is ",session_name)
        print("USER ID IS",user_id)
        print(f"Fetching {reaction_type}d papers for user: {user_id}")

        # Ensure reaction_type is valid
        if reaction_type not in ["like", "dislike"]:
            return jsonify({"error": "Invalid reaction_type"}), 400

        #r1= (supabase.table("user_session").eq("user_id",user_id).eq("session_name",session_name).execute())
        print("user id is ", user_id)
        print("reaction type is ",reaction_type)
        print("session name is ",session_name)


        # Query user_events for the specific reaction type
        response = (
            supabase
            .table("user_events")
            .select("paper_id, qdrant_id")
            .eq("user_id", user_id)
            .eq("event_type", reaction_type)
            .eq("session_id", session_name)
            .execute()
        )

        if not response or not hasattr(response, "data"):
            return jsonify({"papers": []}), 200

        # Hydrate from Qdrant
        papers = papers_from_events(response.data)

        #print(f"User {user_id} {reaction_type}d papers:", papers)
        print("Returning ", len(papers))

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
        qdrant_id = data.get("qdrant_id")
        reaction_type = data.get("reaction_type")  # 'like' or 'dislike'
        session_name = data.get("user_session")

        response= (supabase.table("user_sessions").select("user_id"))


        if not paper_id or reaction_type not in ["like", "dislike"]:
            return jsonify({"error": "Missing or invalid paper_id/reaction_type"}), 400

        # ✅ Check if user has already reacted (using user_events now)
        existing_reaction = (
            supabase.table("user_events")
            .select("*")
            .match({"user_id": user_id, "paper_id": paper_id, "session_id": session_name})
            .in_("event_type", ["like", "dislike"])
            .execute()
        )

        weight = 10.0 if reaction_type == "like" else -15.0

        if existing_reaction.data:
            existing_event = existing_reaction.data[0]
            if existing_event["event_type"] == reaction_type:
                # ✅ Remove reaction if it's the same (toggle behavior)
                supabase.table("user_events").delete().eq("id", existing_event["id"]).execute()
                return jsonify({"message": f"Removed {reaction_type} reaction"}), 200
            else:
                # ✅ Update reaction if user switches from like <-> dislike
                supabase.table("user_events").update({
                    "event_type": reaction_type,
                    "weight": weight
                }).eq("id", existing_event["id"]).execute()
                return jsonify({"message": f"Updated reaction to {reaction_type}"}), 200

        # ✅ Insert new reaction
        supabase.table("user_events").insert({
            "user_id": user_id, 
            "paper_id": paper_id, 
            "qdrant_id": qdrant_id,
            "event_type": reaction_type,
            "weight": weight,
            "session_id": session_name
        }).execute()
        return jsonify({"message": f"Paper {reaction_type}d successfully!"}), 200

    except Exception as e:
        print({"error": "Something went wrong", "details": str(e)})
        return jsonify({"error": "Something went wrong", "details": str(e)}), 500



# --- Signal Telemetry ---
SIGNAL_WEIGHTS = {
    "like": 10.0,
    "dislike": -15.0,
    "save": 8.0,
    "find_similar": 5.0,
    "click": 3.0,
    "expand": 1.0,
    "dwell": 0.0 # Dynamic based on duration
}

@app.route("/signal", methods=["POST"])
def track_signal():
    """
    Log implicit user signals (clicks, dwells, etc.) for the recommendation engine.
    """
    try:
        user_id, error_response = extract_user_id_from_token()
        if error_response:
            return error_response

        data = request.get_json()
        paper_id = data.get("paper_id")
        qdrant_id = data.get("qdrant_id") # NEW
        print(f"📡 Received Signal: paper_id={paper_id}, qdrant_id={qdrant_id}, type={data.get('event_type')}")
        event_type = data.get("event_type")
        duration_ms = data.get("duration", 0)
        session_id = request.headers.get("XSessionName") # Or from body
        metadata = data.get("metadata", {})

        if not paper_id or not event_type:
            return jsonify({"error": "Missing paper_id or event_type"}), 400

        # Calculate Weight
        weight = SIGNAL_WEIGHTS.get(event_type, 0.0)
        
        # Dynamic Dwell Time Logic
        if event_type == "dwell":
            if duration_ms > 30000: # > 30 seconds
                weight = 4.0
            elif duration_ms > 10000: # > 10 seconds
                weight = 1.0
            else:
                return jsonify({"message": "Ignored (too short)"}), 200

        # Async Insert (Fire and forget from client perspective)
        # We use strict await/execute here for simplicity in Flask
        supabase.table("user_events").insert({
            "user_id": user_id,
            "paper_id": paper_id,
            "qdrant_id": qdrant_id, # Store Qdrant ID for fast vector retrieval
            "event_type": event_type,
            "duration_ms": duration_ms,
            "weight": weight,
            "metadata": metadata,
            "session_id": session_id
        }).execute()

        return jsonify({"message": "Signal recorded", "weight": weight}), 200

    except Exception as e:
        print(f"⚠️ Signal error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/create-session", methods=["POST"])
def create_session():
    data = request.get_json()
    user_id = data.get("user_id")
    session_name=data.get("session_name")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400  # Return a JSON error response

    try:
        # Insert session into the user_sessions table
        response = supabase.table("user_sessions").insert([
            {"user_id": user_id,"session_name": session_name, "created_at": "now()"}
        ]).execute()

        print(f"Supabase Response: {response}")  # Log the response to inspect it
        print("cool")

        if not response.data:  # Check if there's an error in the response
            return jsonify({"error": f"Failed to create session: {response.error}"}), 500
        
        return jsonify({"message": "Session created successfully", "data": response.data}), 201

    except Exception as e:
        # Log the exception details
        #print(f"Error: {str(e)}")  # Log the error for debugging
        return jsonify({"error": "Something went wrong", "details": str(e)}), 500  # Return error with message and details


@app.route("/delete-session", methods=["DELETE"])
def delete_session():
    data = request.get_json()
    user_id = data.get("user_id")
    session_name = data.get("session_name")
    print(user_id)
    print(session_name)
    
    if not user_id or not session_name:
        return jsonify({"error": "User ID and session name are required"}), 400  # Return a JSON error response if either is missing

    try:
        # Delete the session from the user_sessions table using user_id and session_name
        response = supabase.table("user_sessions").delete().match({
            "user_id": user_id,
            "session_name": session_name
        }).execute()

        print(f"Supabase Response: {response}")  # Log the response to inspect it

        # Also delete all associated events for this session
        supabase.table("user_events").delete().match({
            "user_id": user_id,
            "session_id": session_name
        }).execute()

        if not response.data:  # Check if no data was returned, meaning no session was deleted
            return jsonify({"error": "Session not found or failed to delete"}), 404
        
        return jsonify({"message": "Session deleted successfully", "data": response.data}), 200

    except Exception as e:
        return jsonify({"error": "Something went wrong", "details": str(e)}), 500  # Return error with message and details


@app.route("/get-user-sessions", methods=["POST"])
def get_user_sessions():
    print(f"✅ CORS configured for: {FRONTEND_URL}") 
    try:
        user_id, error_response = extract_user_id_from_token()
        if error_response:
            return error_response  # Return error if token is invalid

        response = supabase.table("user_sessions").select("*").eq("user_id", user_id).execute()

        # Extract list of dictionaries
        sessions = response.data if hasattr(response, "data") else []

        print("✅ Fetched Sessions:", sessions)

        # Sort by 'created_at' (oldest first)
        sorted_sessions = sorted(sessions, key=lambda x: x["created_at"])

        return jsonify({"sessions": sorted_sessions})

    except Exception as e:
        print(f"Error fetching user sessions:", str(e))
        return jsonify({"error": str(e)}), 500
    


@app.route("/ping", methods=["GET"])
def ping():
    try:
        # Minimal lightweight query (could be any trivial table)
        response = supabase.table("paper_old_embeddings").select("id").limit(1).execute()

        # Check if Supabase responded
        if response.data is not None:
            return jsonify({"status": "alive", "supabase": "reachable"}), 200
        else:
            return jsonify({"status": "alive", "supabase": "no data"}), 200
    except Exception as e:
        return jsonify({"status": "alive", "supabase_error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))  # Render
    print(f"Starting Flask API on port {port}") 
    app.run(host="0.0.0.0", port=port, debug=False)



 