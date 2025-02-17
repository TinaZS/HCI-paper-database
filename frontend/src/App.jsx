import { useState } from "react";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";

export default function App() {
  const [results, setResults] = useState([]);

  async function handleSearch(query) {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        console.warn("Ignoring empty search query.");
        return; // Stop execution if query is empty
      }

      console.log("Sending search request...");
      const response = await fetch(
        "hci-paper-database-production.up.railway.app",
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
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4">
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
