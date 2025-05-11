import { useState } from "react";

export default function QueryInput({
  onSearch,
  categories,
  selectedCategory,
  selectedQuery,
  onCategoryChange,
  onQueryChange,
  sortBy,
  setSortBy,
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
    <>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl mx-auto flex gap-3 relative"
      >
        <input
          type="text"
          placeholder="Search for a paper..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-5 py-3 rounded-full border border-[#C8A2F7] text-[#4F106E] bg-white placeholder:text-[#B083D6] focus:outline-none focus:ring-2 focus:ring-[#C8A2F7] transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 rounded-full bg-[#A78BFA] text-white font-medium hover:bg-[#8B5CF6] transition"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap md:flex-nowrap gap-4 mt-4 w-full">
        {/* Category */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-lg font-semibold text-[#AB43BD] mb-1">
            Select Category
          </label>
          <select
            className="w-full px-4 py-2 rounded-lg bg-white border border-[#D0BAF7] text-[#4F106E] focus:ring-2 focus:ring-[#C8A2F7]"
            value={selectedCategory}
            onChange={(e) => {
              onCategoryChange(e.target.value);
              onQueryChange("");
            }}
          >
            <option value="" disabled className="text-gray-400">
              Choose a category...
            </option>
            {Object.keys(categories).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Topic */}
        {selectedCategory && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-lg font-semibold text-[#AB43BD] mb-1">
              Select Topic
            </label>
            <select
              className="w-full px-4 py-2 rounded-lg bg-white border border-[#D0BAF7] text-[#4F106E] focus:ring-2 focus:ring-[#C8A2F7]"
              value={selectedQuery}
              onChange={(e) => onQueryChange(e.target.value)}
            >
              <option value="" disabled className="text-gray-400">
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

        {/* Sort */}
        <div className="w-full md:w-[220px]">
          <label className="block text-lg font-semibold text-[#AB43BD] mb-1">
            Sort by
          </label>
          <select
            className="w-full px-4 py-2 rounded-lg bg-white border border-[#D0BAF7] text-[#4F106E] focus:ring-2 focus:ring-[#C8A2F7]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="score">Score (highest first)</option>
            <option value="date">Date (newest first)</option>
          </select>
        </div>
      </div>
    </>
  );
}
