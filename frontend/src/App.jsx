import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";
import LoadingBar from "react-top-loading-bar";
import { defaultArticles, suggestedQueries } from "./constants";
import Header from "./components/Header";
import categoriesData from "./components/categories.json";
import ReactionPapers from "./components/ReactionPapers";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabaseClient";

export default function App() {
  const [results, setResults] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState("");
  const [categories, setCategories] = useState(categoriesData);
  const [selectedCategory, setSelectedCategory] = useState("");
  const loadingBarRef = useRef(null);
  const [sortBy, setSortBy] = useState("score");
  const { token, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showPopup, setShowPopup] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [renamingSession, setRenamingSession] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [dislikedPaperIds, setDislikedPaperIds] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [sidebarVisible, setSidebarVisible] = useState(() => {
    const savedState = localStorage.getItem("sidebarVisible");
    return savedState === null ? true : savedState === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebarVisible", sidebarVisible);
  }, [sidebarVisible]);

  useEffect(() => {
    let ignore = false;

    async function fetchDisliked() {
      if (user) {
        const { data, error } = await supabase
          .from("likes")
          .select("paper_id")
          .eq("reaction_type", "dislike")
          .eq("user_id", user.id);

        if (!error && data && !ignore) {
          const ids = data.map((row) => row.paper_id);
          setDislikedPaperIds(ids);
        } else if (error) {
          console.error("Supabase query failed:", { error, user });
        }
      } else {
        setDislikedPaperIds([]);
      }
    }

    fetchDisliked();
    return () => {
      ignore = true;
    };
  }, [user]);

  useEffect(() => {
    let ignore = false;

    async function initializeApp() {
      if (user && token) {
        setIsLoading(true);
        await fetchUserSessions();
        if (!ignore) setIsLoading(false);
      }
    }

    initializeApp();
    return () => {
      ignore = true;
    };
  }, [user?.id, token]);

  const fetchUserSessions = useCallback(async () => {
    if (!user?.id || !token) return [];

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

      if (!response.ok) throw new Error("Failed to fetch user sessions");

      const data = await response.json();
      const savedSession = localStorage.getItem("activeSession");

      if (savedSession && data.sessions.includes(savedSession)) {
        setActiveSession(savedSession);
      } else if (data.sessions.length > 0) {
        setActiveSession(data.sessions[0]);
        localStorage.setItem("activeSession", data.sessions[0]);
      } else {
        setActiveSession(null);
      }

      setSessions(data.sessions || []);
      return data.sessions || [];
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      return [];
    }
  }, [token, user?.id]);

  const createNewSession = async () => {
    if (!newSessionName.trim()) return;

    if (sessions.includes(newSessionName)) {
      alert("Session name already exists. Please choose a different name.");
      return;
    }

    const userId = user?.id;
    if (!userId) {
      console.error("User is not logged in.");
      return;
    }

    setSessions((prev) => [...prev, newSessionName]);
    setActiveSession(newSessionName);
    localStorage.setItem("activeSession", newSessionName);
    setNewSessionName("");

    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
      console.log("🌍 Frontend Origin:", window.location.origin);
      console.log("📡 Backend API Base URL:", API_BASE_URL);
      console.log("📬 Sending POST to:", `${API_BASE_URL}/create-session`);
      console.log("🔐 Auth Token:", token?.slice(0, 20) + "..."); // Don't print full token in prod!
      console.log("📦 Payload:", {
        user_id: userId,
        session_name: newSessionName,
      });

      const response = await fetch(`${API_BASE_URL}/create-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          session_name: newSessionName,
        }),
      });

      if (!response.ok) throw new Error("Failed to create session in backend");

      const data = await response.json();
      console.log("Session created in backend:", data);
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const handleSessionChange = (session) => {
    setActiveSession(session);
    localStorage.setItem("activeSession", session);
  };

  async function handleSearch(
    query,
    numPapers = 6,
    useEmbeddings = false,
    searchTopic = ""
  ) {
    try {
      let trimmedQuery = query;

      if (!useEmbeddings) {
        trimmedQuery = query.trim();
        if (!trimmedQuery) {
          console.warn("Ignoring empty search query.");
          return;
        }
      }

      loadingBarRef.current?.continuousStart();

      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
      const headers = {
        "Content-Type": "application/json",
      };

      console.log("🧠 Raw token:", token);
      console.log(
        "✅ Final token being sent?",
        token && token !== "undefined" && token !== "null"
      );

      if (token && token !== "undefined" && token !== "null") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("🌍 Frontend Origin:", window.location.origin);
      console.log("📡 Backend API Base URL:", API_BASE_URL);

      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers,
        mode: "cors",
        cache: "no-store",
        body: JSON.stringify({
          query: trimmedQuery,
          numPapers,
          embedState: useEmbeddings,
          topic: searchTopic,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      let allResults = data.results;

      // Guests won't have dislikes, so this filter won't run
      if (user && dislikedPaperIds.length > 0) {
        allResults = allResults.filter(
          (paper) => !dislikedPaperIds.includes(paper.paper_id)
        );
      }

      if (allResults.length < 6) {
        console.log("Refetching: too few visible papers...");
        return handleSearch(query, numPapers * 2, useEmbeddings, searchTopic);
      }

      setResults(allResults);
      setFilteredResults(allResults.slice(0, 6));
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      loadingBarRef.current?.complete();
    }
  }

  const deleteSession = async (sessionName) => {
    setConfirmDelete(null);

    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

      const response = await fetch(`${API_BASE_URL}/delete-session`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          session_name: sessionName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Delete failed:", result.error);
        return;
      }

      console.log("✅ Deleted:", result);
      const updatedSessions = sessions.filter((s) => s !== sessionName);
      setSessions(updatedSessions);

      if (activeSession === sessionName) {
        const newActive =
          updatedSessions.length > 0 ? updatedSessions[0] : null;
        setActiveSession(newActive);
        localStorage.setItem("activeSession", newActive);
      }

      setShowPopup(null);
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const confirmDeletion = () => {
    if (confirmDelete) {
      deleteSession(confirmDelete);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Hamburger Menu (visible when sidebar is hidden) */}
      {!sidebarVisible && (
        <button
          onClick={() => setSidebarVisible(true)}
          className="fixed top-4 left-4 z-20 p-2 rounded-md bg-white shadow-md hover:bg-gray-100"
          aria-label="Open sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}

      {/* Sidebar Container - Fixed width that doesn't expand onto the page */}
      <div
        className={`w-64 h-full transition-transform duration-300 ease-in-out ${
          sidebarVisible ? "translate-x-0" : "-translate-x-full"
        } fixed top-0 left-0 z-10`}
      >
        <div className="bg-[#F5EDE3] text-[#3E3232] font-serif h-full flex flex-col w-full border-r border-[#8E7965]">
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="text-lg font-bold">User Sessions</h2>
            <button
              onClick={() => setSidebarVisible(false)}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Close sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Check if the user is logged in */}
            {token ? (
              <ul className="space-y-1">
                {sessions.map((session) => (
                  <li
                    key={session}
                    className={`cursor-pointer px-3 py-2 rounded-md flex justify-between items-center transition-colors ${
                      activeSession === session
                        ? "bg-[#D5C7AC] text-[#3E3232] font-semibold"
                        : "hover:bg-[#E8DDD2]"
                    }`}
                    onClick={() => handleSessionChange(session)}
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
                        onKeyDown={(e) =>
                          e.key === "Enter" && renameSession(session)
                        }
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
                            setShowPopup(null);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          className="text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                          onClick={() => {
                            setShowPopup(null); // close popup
                            setConfirmDelete(session); // open confirmation modal
                          }}
                        >
                          Delete Session
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p> Sign in to add research sessions</p>
            )}
          </div>

          {/* New Session Input - Fixed at bottom */}
          {token && (
            <div className="p-4 border-t">
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  className="border px-3 py-2 rounded-md w-full"
                  placeholder="Session name"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createNewSession()}
                />
                <button
                  className="w-full px-3 py-2 bg-[#B8A290] text-white rounded-md hover:bg-[#A68C7C]"
                  onClick={createNewSession}
                >
                  + Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-[#F5EDE3] p-6 rounded-xl shadow-xl w-96 text-center transform transition-all scale-95 hover:scale-100 border border-[#8B6C42]">
            <h3 className="text-lg font-serif font-semibold text-[#3E3232] mb-3">
              Confirm Deletion
            </h3>
            <p className="text-sm text-[#5C4033] mb-6">
              Are you sure you want to delete{" "}
              <span className="font-bold text-[#  ]">{confirmDelete}</span>?
            </p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-[#A63A3A] text-white px-5 py-2 rounded-md font-medium font-serif hover:bg-[#872C2C] transition"
                onClick={confirmDeletion}
              >
                Delete
              </button>
              <button
                className="bg-[#E6DAC6] text-[#3E3232] px-5 py-2 rounded-md font-medium font-serif hover:bg-[#D9CCB4] transition"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area with margin adjustment */}
      <div
        className={`transition-all duration-300 ease-in-out flex-grow ${
          sidebarVisible ? "ml-64" : "ml-0"
        }`}
      >
        <div className="min-h-screen bg-gradient-to-br from-[#D5C7AC] via-[#53545D] to-[#00234B] flex flex-col items-center px-4">
          <LoadingBar ref={loadingBarRef} color="#60A5FA" height={10} />
          <Header />

          <div className="w-full max-w-4xl">
            <Routes>
              {/* Home: open to all users */}
              <Route
                path="/"
                element={
                  <>
                    <h1
                      className="text-6xl font-bold text-center mt-16 mb-12 tracking-wide"
                      style={{ fontFamily: "Gloock", color: "#D5C7AC" }}
                    >
                      PaperMatch
                    </h1>

                    <QueryInput
                      onSearch={handleSearch}
                      categories={categories}
                      selectedCategory={selectedCategory}
                      selectedQuery={selectedQuery}
                      onCategoryChange={setSelectedCategory}
                      onQueryChange={setSelectedQuery}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                    />

                    {/* Suggested Queries */}
                    <div className="mt-6">
                      <h2 className="text-lg font-serif font-semibold text-[#E6DAC6] mb-3">
                        Suggested Searches: {selectedQuery}
                      </h2>
                      <div className="flex gap-2 flex-wrap">
                        {suggestedQueries.map((query, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearch(query)}
                            className="px-4 py-2 rounded-md bg-[#B8A290] text-[#3E3232] transition duration-200 transform hover:bg-[#A68C7C] hover:scale-105 shadow-sm hover:shadow-md focus:outline-none"
                          >
                            {query}
                          </button>
                        ))}
                      </div>
                    </div>

                    <DisplayResults
                      results={results}
                      onSearch={handleSearch}
                      sortBy={sortBy}
                      dislikedPaperIds={dislikedPaperIds}
                      refillResults={handleSearch}
                      session_name={activeSession}
                    />
                  </>
                }
              />

              {/* Saved + Disliked: restricted */}
              <Route
                path="/saved"
                element={
                  user && activeSession ? (
                    <ReactionPapers
                      reactionType="like"
                      onSearch={handleSearch}
                      session_name={activeSession}
                      showAll={true}
                    />
                  ) : (
                    <div className="mt-20 flex justify-center">
                      <div className="bg-[#F5EDE3] text-[#3E3232] font-serif text-lg px-6 py-4 rounded-lg shadow-lg border border-[#8E7965] max-w-xl text-center">
                        <p className="mb-2">
                          Please <span className="font-bold">sign in</span> to
                          see your liked papers and receive personalized
                          recommendations.
                        </p>
                        <p className="text-sm text-[#6B4F4F]">
                          Create sessions, track your preferences, and unlock
                          tailored results.
                        </p>
                      </div>
                    </div>
                  )
                }
              />

              <Route
                path="/disliked"
                element={
                  user && activeSession ? (
                    <ReactionPapers
                      reactionType="dislike"
                      onSearch={handleSearch}
                      session_name={activeSession}
                      showAll={true}
                    />
                  ) : (
                    <div className="mt-20 flex justify-center">
                      <div className="bg-[#F5EDE3] text-[#3E3232] font-serif text-lg px-6 py-4 rounded-lg shadow-lg border border-[#8E7965] max-w-xl text-center">
                        <p className="mb-2">
                          Please <span className="font-bold">sign in</span> to
                          see your hidden papers and receive personalized
                          recommendations.
                        </p>
                        <p className="text-sm text-[#6B4F4F]">
                          Create sessions, track your preferences, and unlock
                          tailored results.
                        </p>
                      </div>
                    </div>
                  )
                }
              />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
