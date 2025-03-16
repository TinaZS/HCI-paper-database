import { useState } from "react";

export default function QueryInput({
  onSearch,
  categories,
  selectedCategory,
  selectedQuery,
  onCategoryChange,
  onQueryChange
}) {
  const [query, setQuery] = useState("");
  const [numPapers, setNumPapers] = useState("6");

  function handleSubmit(event) {
    event.preventDefault();
    if (!query.trim()) return;

    const papersToFetch = parseInt(numPapers) > 0 ? parseInt(numPapers) : 6;
    onSearch(query, papersToFetch, undefined, selectedQuery); // ✅ Pass selectedQuery
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto flex flex-col gap-3"
    >
      {/* ✅ Search Query */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Enter your search query here..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <input
          type="number"
          placeholder="# papers to return..."
          value={numPapers}
          onChange={(event) => setNumPapers(event.target.value)}
          className="w-45 p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
        >
          Search
        </button>
      </div>

      {/* ✅ Category Dropdown */}
      <div className="mt-4">
        <label className="block text-lg font-semibold mb-2">
          Select Category:
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
          value={selectedCategory}
          onChange={(e) => {
            const category = e.target.value;
            console.log("Selected Category:", category);
            onCategoryChange(category); // ✅ Update state in parent (App.jsx)
            onQueryChange(""); // ✅ Reset topic when category changes
          }}
        >
          <option value="" disabled>
            Choose a category...
          </option>
          {Object.keys(categories).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* ✅ Topic Dropdown (Only appears when category is selected) */}
      {selectedCategory && (
        <div className="mt-4">
          <label className="block text-lg font-semibold mb-2">
            Select Topic:
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
            value={selectedQuery}
            onChange={(e) => {
              const topic = e.target.value;
              console.log("Selected Topic:", topic);
              onQueryChange(topic); // ✅ Update state in parent (App.jsx)
            }}
          >
            <option value="" disabled>
              Choose a topic...
            </option>
            {Object.entries(categories[selectedCategory]).map(
              ([key, value]) => (
                <option key={key} value={key}>
                  {`${key} - ${value}`}
                </option>
              )
            )}
          </select>
        </div>
      )}
    </form>
  );
}
