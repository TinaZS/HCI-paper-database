import { useState, useRef } from "react";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";
import LoadingBar from "react-top-loading-bar";

export default function App() {
  const [results, setResults] = useState([]);
  const loadingBarRef = useRef(null);

  async function handleSearch(query) {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        console.warn("Ignoring empty search query.");
        return;
      }

      console.log("Sending search request...");
      loadingBarRef.current.continuousStart();

      const response = await fetch(
        "https://hci-paper-database.onrender.com/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          cache: "no-store",
          body: JSON.stringify({ query: trimmedQuery }),
        }
      );

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
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mt-10 mb-6 text-gray-800">
          HCI Paper Search
        </h1>
        <QueryInput onSearch={handleSearch} />
        <DisplayResults results={results} />
      </div>
    </div>
  );
}
