import { useState } from "react";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";

export default function App() {
  const [results, setResults] = useState([]);

  function handleSearch(query) {
    fetch("https://hci-paper-database.onrender.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Received Data:", data);
        setResults(data.results);
      })
      .catch((error) => {
        console.error("Error fetching results:", error);
      });
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
