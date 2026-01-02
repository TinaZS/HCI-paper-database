import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";
import LoadingBar from "react-top-loading-bar";
import { defaultArticles, suggestedQueries } from "./constants";
import Header from "./components/Header";
import categoriesData from "./components/categories.json";
import ReactionPapers from "./components/ReactionPapers";
import ForYouPage from "./components/ForYouPage";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabaseClient";
import OnboardingModal from "./components/OnboardingModal";
import backgroundSvg from "./assets/background.svg";
import ResetPasswordPage from "./components/ResetPasswordPage";
import FloatingChatbot from "./components/FloatingChatbot";

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
  const [searchText, setSearchText] = useState("");

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
        const sessionsFetched = await fetchUserSessions();
        if (sessionsFetched.length === 0) {
          await createDefaultSession();
        }
        setIsLoading(false);
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

      const sessionNames = data.sessions.map(s => s.session_name);
      if (savedSession && sessionNames.includes(savedSession)) {
        setActiveSession(savedSession);
      } else if (data.sessions.length > 0) {
        setActiveSession(data.sessions[0].session_name);
        localStorage.setItem("activeSession", data.sessions[0].session_name);
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

  const createDefaultSession = async () => {
    const defaultName = "Session 1";
    const userId = user?.id;
    if (!userId) return;

    setSessions([defaultName]);
    setActiveSession(defaultName);
    localStorage.setItem("activeSession", defaultName);

    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${API_BASE_URL}/create-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          session_name: defaultName,
        }),
      });

      if (!response.ok) throw new Error("Failed to create default session");
      const data = await response.json();
      console.log("✅ Default session created:", data);
    } catch (error) {
      console.error("Error creating default session:", error);
    }
  };

  const createNewSession = async () => {
    if (!newSessionName.trim()) return;

    if (sessions.some(s => (s.session_name || s) === newSessionName)) {
      alert("Session name already exists. Please choose a different name.");
      return;
    }

    const userId = user?.id;
    if (!userId) {
      console.error("User is not logged in.");
      return;
    }

    // We'll wait for the backend to confirm before adding to state
    // setSessions((prev) => [...prev, newSessionName]); 
    // setActiveSession(newSessionName);
    // localStorage.setItem("activeSession", newSessionName);
    const sessionToCreate = newSessionName;
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

      if (data.data && data.data[0]) {
        const newSessionObj = data.data[0];
        setSessions((prev) => [...prev, newSessionObj]);
        setActiveSession(newSessionObj.session_name);
        localStorage.setItem("activeSession", newSessionObj.session_name);
      }
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

      //console.log("🧠 Raw token:", token);
      console.log(
        "✅ Final token being sent?",
        token && token !== "undefined" && token !== "null"
      );

      if (token && token !== "undefined" && token !== "null") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      //console.log("🌍 Frontend Origin:", window.location.origin);
      //console.log("📡 Backend API Base URL:", API_BASE_URL);

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

      if (allResults.length < 6 && numPapers < 200) {
        console.log("Refetching: too few visible papers...");
        return handleSearch(query, numPapers * 2, useEmbeddings, searchTopic);
      }

      setResults(allResults);
      setFilteredResults(allResults.slice(0, 6));
      if (!useEmbeddings) {
        setSearchText(trimmedQuery);
      }
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
      const updatedSessions = sessions.filter((s) => s.session_name !== sessionName);
      setSessions(updatedSessions);

      if (activeSession === sessionName) {
        const newActiveObj = updatedSessions.length > 0 ? updatedSessions[0] : null;
        const newActiveName = newActiveObj ? newActiveObj.session_name : null;
        setActiveSession(newActiveName);
        localStorage.setItem("activeSession", newActiveName);
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
      <OnboardingModal />
      {!sidebarVisible && (
        <button
          onClick={() => setSidebarVisible(true)}
          className="fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-white shadow-xl hover:bg-slate-50 transition-all border border-slate-200 text-slate-600 hover:text-indigo-600 active:scale-95"
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
        className={`w-64 h-full transition-transform duration-300 ease-in-out ${sidebarVisible ? "translate-x-0" : "-translate-x-full"
          } fixed top-0 left-0 z-40`}
      >
        <div className="bg-[#0f172a] text-white h-full flex flex-col w-full border-r border-slate-800 shadow-xl">
          <div className="p-5 flex justify-between items-center border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Research Sessions
            </h2>
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
                {sessions.map((session, index) => (
                  <li
                    key={session.id || (typeof session === 'string' ? session : index)}
                    className={`cursor-pointer px-4 py-2.5 rounded-lg flex justify-between items-center transition-all duration-200 ${activeSession === session.session_name
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    onClick={() => handleSessionChange(session.session_name)}
                    style={{ position: "relative" }}
                  >
                    <span className="text-sm font-medium">{session.session_name}</span>
                    <button
                      className="cursor-pointer px-1 opacity-60 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPopup(showPopup === session.id ? null : session.id);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                      </svg>
                    </button>

                    {/* Popup Menu */}
                    {showPopup === session.id && (
                      <div className="absolute right-0 top-full mt-2 bg-white shadow-lg rounded-lg p-2 flex flex-col gap-2 w-48 border border-gray-200 z-10">
                        {/* <button
                          className="text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg transition duration-200 focus:outline-none"
                          onClick={() => {
                            setRenamingSession(session);
                            setRenameValue(session);
                            setShowPopup(null);
                          }}
                        >
                          Rename
                        </button> */}
                        <button
                          className={`text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 ${sessions.length === 1
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                            }`}
                          onClick={() => {
                            if (sessions.length === 1) return; // Don't allow delete
                            setShowPopup(null);
                            setConfirmDelete(session.session_name);
                          }}
                          disabled={sessions.length === 1}
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
            <div className="p-5 border-t border-slate-800 bg-slate-900/50">
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  className="bg-slate-800 border-none text-white text-sm px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                  placeholder="New project name"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createNewSession()}
                />
                <button
                  className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                  onClick={createNewSession}
                >
                  Create Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-slate-500 mb-8">
              Are you sure you want to delete <span className="text-slate-900 font-semibold">{confirmDelete}</span>? This action cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-500 transition-colors shadow-lg shadow-red-500/10"
                onClick={confirmDeletion}
              >
                Delete Session
              </button>
              <button
                className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
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
        className={`transition-all duration-300 ease-in-out flex-grow ${sidebarVisible ? "ml-64" : "ml-0"
          }`}
      >
        <div className="min-h-screen w-full flex flex-col items-center px-4 bg-slate-50 relative overflow-hidden">
          {/* subtle background pattern */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <LoadingBar ref={loadingBarRef} color="#60A5FA" height={10} />
          <Header sidebarVisible={sidebarVisible} />

          <div className="w-full max-w-4xl">
            <Routes>
              {/* Home: open to all users */}
              <Route
                path="/"
                element={
                  <>
                    <div className="text-center mt-20 mb-16 z-10">
                      <h1 className="text-6xl font-black tracking-tight text-slate-900 mb-2">
                        PaperMatch
                      </h1>
                      <p className="text-lg text-slate-500 font-medium">Research at the speed of thought.</p>
                    </div>

                    <QueryInput
                      onSearch={handleSearch}
                      categories={categories}
                      selectedCategory={selectedCategory}
                      selectedQuery={selectedQuery}
                      onCategoryChange={setSelectedCategory}
                      onQueryChange={setSelectedQuery}
                      searchText={searchText}
                      onSearchTextChange={setSearchText}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                    />

                    {/* Suggested Queries */}
                    <div className="mt-8 z-10 w-full max-w-4xl">
                      <div className="flex gap-2 flex-wrap items-center">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mr-2">Discover:</span>
                        {suggestedQueries.map((query, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearch(query)}
                            className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:border-indigo-400 hover:text-indigo-600 transition-all hover:shadow-sm"
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
                path="/for-you"
                element={
                  <ForYouPage
                    onSearch={handleSearch}
                    session_name={activeSession}
                    showAll={true}
                  />
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
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
          </div>
        </div>
      </div>

      {/* Floating RAG Chatbot */}
      <FloatingChatbot />
    </div>
  );
}
