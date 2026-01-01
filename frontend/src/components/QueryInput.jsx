import { useState } from "react";

export default function QueryInput({
  onSearch,
  categories,
  selectedCategory,
  selectedQuery,
  onCategoryChange,
  searchText,
  onSearchTextChange,
  sortBy,
  setSortBy,
}) {
  const [numPapers, setNumPapers] = useState("6");

  function handleSubmit(event) {
    event.preventDefault();
    if (!searchText.trim()) return;

    const papersToFetch = parseInt(numPapers) > 0 ? parseInt(numPapers) : 6;
    onSearch(searchText, papersToFetch, undefined, selectedQuery); // ✅ Pass selectedQuery
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl mx-auto flex gap-4 relative z-10"
      >
        <div className="relative flex-grow group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search from 2.9M research papers..."
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            className="w-full pl-14 pr-12 py-4 rounded-2xl border border-slate-200 text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => onSearchTextChange("")}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-10 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap md:flex-nowrap gap-4 mt-6 w-full z-10">
        {/* Category */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Research Field
          </label>
          <select
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            value={selectedCategory}
            onChange={(e) => {
              onCategoryChange(e.target.value);
              onQueryChange("");
            }}
          >
            <option value="" disabled className="text-gray-400">
              Select field...
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
            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
              Specific Topic
            </label>
            <select
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              value={selectedQuery}
              onChange={(e) => onQueryChange(e.target.value)}
            >
              <option value="" disabled className="text-gray-400">
                Select topic...
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
          <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Relevance Range
          </label>
          <select
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="score">Sort by Vector Similarity</option>
            <option value="date">Sort by Publication Date</option>
          </select>
        </div>
      </div>
    </>
  );
}
