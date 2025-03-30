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
          placeholder="Enter your search query..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full p-4 border border-[#8B6C42] bg-[#E6DAC6] text-[#2D2C2A] placeholder-[#5C4033] rounded-full shadow-md focus:ring-2 focus:ring-[#4A2C2A] outline-none"
        />
        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-black"
          ></button>
        )}
        <button
          type="submit"
          className="px-6 py-3 bg-[#5C4033] text-[#E6DAC6] border border-[#4A2C2A] rounded-full hover:bg-[#4A2C2A] transition duration-200 font-serif"
        >
          Search
        </button>
      </form>
      <div className="flex flex-wrap md:flex-nowrap gap-4 mt-4 w-full">
        {/* Select Category */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-lg font-serif font-semibold text-[#E6DAC6] mb-1">
            Select Category:
          </label>
          <select
            className="w-full px-3 py-2 border border-[#8B6C42] rounded-md bg-[#E6DAC6] text-[#2D2C2A] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A2C2A] transition duration-150 shadow-sm"
            value={selectedCategory}
            onChange={(e) => {
              onCategoryChange(e.target.value);
              onQueryChange("");
            }}
          >
            <option value="" disabled className="text-[#5C4033]">
              Choose a category...
            </option>
            {Object.keys(categories).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Select Topic */}
        {selectedCategory && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-lg font-serif font-semibold text-[#E6DAC6] mb-1">
              Select Topic:
            </label>
            <select
              className="w-full px-3 py-2 border border-[#8B6C42] rounded-md bg-[#E6DAC6] text-[#2D2C2A] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A2C2A] transition duration-150 shadow-sm"
              value={selectedQuery}
              onChange={(e) => onQueryChange(e.target.value)}
            >
              <option value="" disabled className="text-[#5C4033]">
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

        {/* Sort By */}
        <div className="w-full md:w-[220px]">
          <label className="block text-lg font-serif font-semibold text-[#E6DAC6] mb-1">
            Sort by:
          </label>
          <select
            className="w-full px-3 py-2 border border-[#8B6C42] rounded-md bg-[#E6DAC6] text-[#2D2C2A] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A2C2A] transition duration-150 shadow-sm"
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
