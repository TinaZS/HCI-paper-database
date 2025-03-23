import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";
import LoadingBar from "react-top-loading-bar";
import { defaultArticles, suggestedQueries } from "./constants";
import Header from "./components/Header";
import categoriesData from "./components/categories.json"
import ReactionPapers from "./components/ReactionPapers";
import { useAuth } from "./AuthContext";

export default function App() {
  const [results, setResults] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState("");
  const [categories, setCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const loadingBarRef = useRef(null);
  const [sortBy, setSortBy] = useState("score"); // Default to sorting by score
  const { token } = useAuth(); // ✅ Get the token from context
  const [sessions, setSessions] = useState(["Session 1"]);
  const [activeSession, setActiveSession] = useState("Session 1");
  const [showPopup, setShowPopup] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [renamingSession, setRenamingSession] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const { user } = useAuth(); // Get user here, not inside a function
  
  // Handle dropdown change
  const handleDropdownChange = (event) => {
    setSelectedCategory(event.target.value); // Update state with selected option
  };

  useEffect(() => {
    console.log("Loaded categories:", categoriesData);
    setCategories(categoriesData);
  }, []);

  // Function to check if the session name already exists
  const isSessionNameUnique = (name) => {
    return !sessions.includes(name);
  };

  const createNewSession = async () => {
    if (!newSessionName.trim()) return; // Prevent empty names

    // Check if the session name is unique
    if (!isSessionNameUnique(newSessionName)) {
      alert("Session name already exists. Please choose a different name.");
      return;
    }
    
    const userId = user?.id; // Get user ID from context
    if (!userId) {
      console.error("User is not logged in.");
      return;
    }
  
    // Update the local sessions state
    setSessions([...sessions, newSessionName]);
    setActiveSession(newSessionName);
    setNewSessionName("");
  
    // Send a POST request to the backend to insert the session into Supabase
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${API_BASE_URL}/create-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          session_name: newSessionName,
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to create session in the backend");
      }
  
      const data = await response.json();
      console.log("Session created in backend:", data);
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };
  

  const deleteSession = (session) => {
    setConfirmDelete(session);
  };

  const confirmDeletion = async () => {

    setSessions(sessions.filter(s => s !== confirmDelete));

    if (activeSession === confirmDelete) {
      setActiveSession(sessions[0] || "");
    }

    setConfirmDelete(null);
    setShowPopup(null);

    const userId = user?.id; // Get user ID from context
    if (!userId) {
      console.error("User is not logged in.");
      return;
    }

    // Send a POST request to the backend to insert the session into Supabase
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${API_BASE_URL}/delete-session`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          session_name: confirmDelete,
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to delete session in the backend");
      }
  
      const data = await response.json();
      console.log("Session deleted in backend:", data);
    } catch (error) {
      console.error("Error deleting session:", error);
    }

  };

  useEffect(() => {
    if (token) {
      fetchUserSessions();
    }
  }, [token]);

  const fetchUserSessions = async () => {
    if (!user?.id) return;

    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${API_BASE_URL}/get-user-sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user sessions");
      }

      const data = await response.json();
      setSessions(data.sessions);
      setActiveSession(data.sessions[0] || "");
    } catch (error) {
      console.error("Error fetching user sessions:", error);
    }
  };

  // Rename a session
const renameSession = (oldName) => {

  // Check if the new name is unique
  if (!isSessionNameUnique(renameValue)) {
    alert("Session name already exists. Please choose a different name.");
    return;
  }

  if (!renameValue.trim()) return; // Prevent empty names
  setSessions(sessions.map(s => (s === oldName ? renameValue : s)));
  if (activeSession === oldName) {
    setActiveSession(renameValue); // Update active session name
  }
  setRenamingSession(null);
  setShowPopup(null);
};

  async function handleSearch(query, numPapers = 6, useEmbeddings = false, searchTopic="") {
    if (!token) return;
    try {
      let trimmedQuery = query; // Initialize trimmedQuery with the original query

      // Only trim the query if we're not using embeddings
      if (useEmbeddings == false) {
        trimmedQuery = query.trim(); // Trim the query
        if (!trimmedQuery) {
          console.warn("Ignoring empty search query.");
          return;
        }
      }

      console.log("Sending search request...");
      loadingBarRef.current.continuousStart();

      const startTime = performance.now(); // Start timing
      console.log(`Start time is ${startTime}`);

      console.log(numPapers);
      console.log(trimmedQuery);
      console.log(searchTopic);

      console.log(token);

      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        mode: "cors",
        cache: "no-store",
        body: JSON.stringify({
          query: trimmedQuery,
          numPapers: numPapers,
          embedState: useEmbeddings,
          topic: searchTopic,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received Data:", data);
      setResults(data.results);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      loadingBarRef.current.complete();
    }
  }

  return (

    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md p-4 relative">
  <h2 className="text-lg font-bold mb-4">User Sessions</h2>
  
  {/* Check if the user is logged in */}
  {token ? (
    <ul>
      {sessions.map((session) => (
        <li
          key={session}
          className={`cursor-pointer p-2 rounded-md flex justify-between items-center ${
            activeSession === session ? "bg-blue-200" : ""
          }`}
          onClick={() => setActiveSession(session)}
          style={{ position: "relative" }}
        >
          {/* Show input when renaming */}
          {renamingSession === session ? (
            <input
              type="text"
              className="border px-2 py-1 rounded-md w-full"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => renameSession(session)}
              onKeyDown={(e) => e.key === "Enter" && renameSession(session)}
              autoFocus
            />
          ) : (
            <span>{session}</span>
          )}

          <button
            className="cursor-pointer px-2 text-gray-500 hover:text-black"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopup(showPopup === session ? null : session);
            }}
          >
            ⋮
          </button>

          {/* Popup Menu */}
          {showPopup === session && (
            <div className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-lg p-2 flex flex-col gap-2 w-48 border border-gray-200 z-10">
              <button
                className="text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg transition duration-200 focus:outline-none"
                onClick={() => {
                  setRenamingSession(session);
                  setRenameValue(session);
                  setShowPopup(null); // Hide the popup after starting the renaming process
                }}
              >
                Rename
              </button>
              <button
                className="text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                onClick={() => deleteSession(session)}
              >
                Delete Session
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p>Please log in to view your sessions.</p> // Message to show if the user is not logged in
  )}

  {/* New Session Input */}
  {token && (
    <div className="mt-2 flex gap-2 items-center">
      <input
        type="text"
        className="border px-3 py-1 rounded-md flex-1"
        placeholder="Session name"
        value={newSessionName}
        onChange={(e) => setNewSessionName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && createNewSession()}
      />
      <button
        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        onClick={createNewSession}
      >
        + Add
      </button>
    </div>
  )}
</div>


      {confirmDelete && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-center transform transition-all scale-95 hover:scale-100">
      <h3 className="text-lg font-semibold mb-4">Are you sure?</h3>
      <p className="text-gray-600 mb-6">You are about to delete <strong>{confirmDelete}</strong>.</p>
      <div className="flex justify-center gap-6">
        <button
          className="bg-red-500 text-white px-6 py-2 rounded-lg transition duration-300 hover:bg-red-600"
          onClick={confirmDeletion}
        >
          Delete
        </button>
        <button
          className="bg-gray-200 px-6 py-2 rounded-lg text-gray-700 transition duration-300 hover:bg-gray-300"
          onClick={() => setConfirmDelete(null)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

    
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4">
      <LoadingBar ref={loadingBarRef} color="#60A5FA" height={10} />
      <Header />

      <div className="w-full max-w-4xl">
        <Routes>
          {/* ✅ Home Page */}
          <Route
            path="/"
            element={
              <>
                <h1 className="text-3xl font-bold text-center mt-10 mb-6 text-gray-800">
                  Paper Match
                </h1>
                <QueryInput 
                  onSearch={handleSearch}
                  categories={categories}
                  selectedCategory={selectedCategory}
                  selectedQuery={selectedQuery}
                  onCategoryChange={setSelectedCategory}
                  onQueryChange={setSelectedQuery}
                />
                <div className="mt-4">
                  <label className="block text-lg font-semibold mb-2">Sort by:</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="score">Score (highest first)</option>
                    <option value="date">Date (newest first)</option>
                  </select>
                </div>
                <div className="mt-4">
                  <h2 className="text-xl font-semibold mb-2">
                    Suggested Searches: {selectedQuery}
                  </h2>
                  <div className="flex gap-2 flex-wrap">
                    {suggestedQueries.map((query, index) => (
                      <button
                        key={index}
                        className="px-3 py-1 bg-blue-200 text-blue-700 rounded-md hover:bg-blue-300"
                        onClick={() => handleSearch(query)}
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
                <DisplayResults results={results} onSearch={handleSearch} sortBy={sortBy} />
              </>
            }
          />

          {/* ✅ Liked Papers Page */}
          <Route
            path="/saved"
            element={
              <ReactionPapers reactionType="like" onSearch={handleSearch} />
            }
          />
          <Route
            path="/disliked"
            element={
              <ReactionPapers reactionType="dislike" onSearch={handleSearch} />
            }
          />
        </Routes>
      </div>
    </div>
    </div>
  );
}
