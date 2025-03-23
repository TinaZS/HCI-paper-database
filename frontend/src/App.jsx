import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
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
  const [categories, setCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const loadingBarRef = useRef(null);
  const [sortBy, setSortBy] = useState("score"); // Default to sorting by score
  const { user } = useAuth();
  const [dislikedPaperIds, setDislikedPaperIds] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);

  // Handle dropdown change
  const handleReactionChange = (paperId, newReaction) => {
    const isHome = pageType === "home";
    const isSaved = pageType === "saved";
    const isDisliked = pageType === "disliked";

    const isReactionRemoved =
      (isSaved && newReaction !== "like") ||
      (isDisliked && newReaction !== "dislike");

    if (isHome && newReaction === "dislike") {
      setVisibleResults((prev) => {
        const updated = prev.filter((paper) => paper.paper_id !== paperId);
        setTimeout(() => {
          if (updated.length < 6 && refillResults) {
            const firstRemaining = updated[0];
            if (firstRemaining?.embedding) {
              refillResults(firstRemaining.embedding, 12, true);
            }
          }
        }, 400);
        return updated;
      });
      return;
    }

    if (isReactionRemoved) {
      setVisibleResults((prev) =>
        prev.filter((paper) => paper.paper_id !== paperId)
      );

      // ✅ Delay re-fetch for animation
      setTimeout(() => {
        if (onReactionChange) onReactionChange();
      }, 350); // match `framer-motion` exit
      return;
    }
  };

  useEffect(() => {
    async function fetchDisliked() {
      if (user) {
        const { data, error } = await supabase
          .from("likes") // ✅ correct table name
          .select("paper_id")
          .eq("reaction_type", "dislike") // ✅ correct column
          .eq("user_id", user.id);

        if (!error && data) {
          const ids = data.map((row) => row.paper_id);
          console.log("✅ Fetched dislikedPaperIds:", ids);
          setDislikedPaperIds(ids);
        } else {
          console.error("❌ Supabase query failed:", { error, user });
        }
      } else {
        setDislikedPaperIds([]);
      }
    }

    fetchDisliked();
  }, [user]);

  useEffect(() => {
    console.log("Loaded categories:", categoriesData);
    setCategories(categoriesData);
  }, []);

  async function handleSearch(
    query,
    numPapers = 6,
    useEmbeddings = false,
    searchTopic = ""
  ) {
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

      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      let allResults = data.results;

      // Remove disliked papers if signed in
      if (user && dislikedPaperIds.length > 0) {
        allResults = allResults.filter(
          (paper) => !dislikedPaperIds.includes(paper.paper_id)
        );
      }

      // Retry if too few remain
      if (allResults.length < 6) {
        console.log("Refetching: too few visible papers...");
        return handleSearch(query, numPapers * 2, useEmbeddings, searchTopic);
      }

      // ✅ Safe to show
      setResults(allResults); // ✅ keep full pool
      setFilteredResults(allResults.slice(0, 6)); // only show 6
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      loadingBarRef.current.complete();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D5C7AC] via-[#53545D] to-[#00234B] flex flex-col items-center px-4">
      <LoadingBar ref={loadingBarRef} color="#60A5FA" height={10} />
      <Header />

      <div className="w-full max-w-4xl">
        <Routes>
          {/* ✅ Home Page */}
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
                />
                {/* 🔹 Sort By Section */}
                <div className="mt-6">
                  <label className="block text-lg font-serif font-semibold text-[#3E3232] mb-2">
                    Sort by:
                  </label>
                  <select
                    className="w-full p-3 border border-[#8E7965] bg-[#F5EDE3] text-[#3E3232] 
               rounded-md focus:ring-2 focus:ring-[#6D4C41] outline-none 
               transition duration-150"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="score">Score (highest first)</option>
                    <option value="date">Date (newest first)</option>
                  </select>
                </div>

                {/* 🔹 Suggested Searches Section */}
                <div className="mt-6">
                  <h2 className="text-lg font-serif font-semibold text-[#3E3232] mb-3">
                    Suggested Searches: {selectedQuery}
                  </h2>
                  <div className="flex gap-2 flex-wrap">
                    {suggestedQueries.map((query, index) => (
                      <button
                        key={index}
                        className="px-4 py-2 bg-[#B8A290] text-[#3E3232] rounded-md font-serif 
                   hover:bg-[#8E7965] hover:text-[#F5EDE3] transition duration-150"
                        onClick={() => handleSearch(query)}
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
                />
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
  );
}
