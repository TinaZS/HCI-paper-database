import { useState, useRef, useEffect } from "react";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";
import LoadingBar from "react-top-loading-bar";
import { defaultArticles, suggestedQueries } from "./constants";
import Auth from "./components/AuthModal";
import Header from "./components/Header";

// Default articles to display on initial load

export default function App() {
  const [results, setResults] = useState(defaultArticles);
  const loadingBarRef = useRef(null);

  async function handleSearch(query, numPapers = 6) {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        console.warn("Ignoring empty search query.");
        return;
      }

      console.log("Sending search request...");
      loadingBarRef.current.continuousStart();

      const startTime = performance.now(); // Start timing
      console.log(`Start time is ${startTime}`);

      console.log(numPapers);

      const response = await fetch("http://127.0.0.1:10000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        cache: "no-store",
        body: JSON.stringify({ query: trimmedQuery, numPapers: numPapers }),
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
      {/* Authentication Component (Positioned in the top-right corner) */}
      <Header /> {/* Sign In button */}
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mt-10 mb-6 text-gray-800">
          HCI Paper Search
        </h1>
        <QueryInput onSearch={handleSearch} />
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Suggested Searches:</h2>
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
        <DisplayResults results={results} />
      </div>
    </div>
  );
}
