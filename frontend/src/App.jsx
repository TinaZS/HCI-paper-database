import { useState, useRef } from "react";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";
import LoadingBar from "react-top-loading-bar";

export default function App() {
  const [results, setResults] = useState([]);
  const loadingBarRef = useRef(null);

  function handleSearch(query) {
    loadingBarRef.current.continuousStart();

    fetch("http://127.0.0.1:10000/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
      .catch((error) => console.error("Error fetching results:", error))
      .finally(() => {
        loadingBarRef.current.complete();
      });
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
