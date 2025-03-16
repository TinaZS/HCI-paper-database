import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";
import LoadingBar from "react-top-loading-bar";
import { defaultArticles, suggestedQueries } from "./constants";
import Header from "./components/Header";
import LikedPapers from "./components/LikedPapers";
import categoriesData from "./components/categories.json"

export default function App() {
  const [results, setResults] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState("");
  const [categories, setCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const loadingBarRef = useRef(null);
  const [sortBy, setSortBy] = useState("score"); // Default to sorting by score
  
  // Handle dropdown change
  const handleDropdownChange = (event) => {
    setSelectedCategory(event.target.value); // Update state with selected option
  };

  useEffect(() => {
    console.log("Loaded categories:", categoriesData);
    setCategories(categoriesData);
  }, []);

  async function handleSearch(query, numPapers = 6, useEmbeddings = false, searchTopic="") {
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
      console.log("Received Data:", data);
      setResults(data.results);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      loadingBarRef.current.complete();
    }
  }

  return (
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
                  HCI Paper Search
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
            element={<LikedPapers onSearch={handleSearch} />}
          />
        </Routes>
      </div>
    </div>
  );
}
