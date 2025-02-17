import { useState } from "react";

export default function QueryInput({ onSearch }) {
  const [query, setQuery] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!query.trim()) return;
    onSearch(query);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto flex items-center gap-3"
    >
      <input
        type="text"
        placeholder="Enter your search query here..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <button
        type="submit"
        className="px-5 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
      >
        Search
      </button>
    </form>
  );
}
