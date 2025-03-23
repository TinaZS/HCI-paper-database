import React, { useState } from "react";
import categoriesData from "./categories.json"; // Import your JS
import ReactionButton from "./ReactionButton"; // ✅ Import new reaction button

export default function DisplayResults({ results, onSearch, sortBy}) {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);

  // Flatten the category mapping from categories.json
  const categoryMap = Object.values(categoriesData).reduce(
    (acc, subcategories) => ({ ...acc, ...subcategories }),
    {}
  );

  // ✅ Create a sorted copy of results
  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === "score") {
      // Sort by score (descending)
      return (b.similarity_score || 0) - (a.similarity_score || 0);
    } else if (sortBy === "date") {
      // Sort by date (descending)
      const dateA = new Date(a.datePublished).getTime() || 0;
      const dateB = new Date(b.datePublished).getTime() || 0;
      return dateB - dateA;
    }
    return 0;
  });

  return (
    <div className="mt-4 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sortedResults.map((paper) => {
        let formattedDate = "Unknown";
        if (paper.datePublished && paper.datePublished !== "Unknown") {
          const dateObject = new Date(paper.datePublished);
          if (!isNaN(dateObject)) {
            formattedDate = dateObject.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          }
        }

        return (
          
          <div
            key={paper.paper_id}
            className="p-4 border rounded-md shadow bg-white relative cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setSelectedPaper(paper)}
          >
            <h3 className="font-semibold text-lg">{paper.title}</h3>
            {/* ✅ Only show score if available */}
            {paper.similarity_score !== undefined && (
              <p className="text-sm italic text-gray-600">
                Score: {paper.similarity_score}
              </p>
            )}
            {/* Check if paper.authors exists and has at least one author */}
            {paper.authors && paper.authors.length > 0 && (
              <p className="text-sm italic text-gray-600">
                {paper.authors[0]}, et al.
              </p>
            )}
            <p className="text-sm italic text-gray-600">
              Published: {formattedDate}
            </p>
            <p className="text-gray-700">
              {paper.abstract.length > 200
                ? `${paper.abstract.substring(0, 200)}...`
                : paper.abstract}
            </p>
            <a
              href={paper.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline mt-2 inline-block"
            >
              Read More →
            </a>
            {/* Categories displayed as rounded boxes with tooltip */}
            {paper.categories && paper.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {paper.categories.map((category, index) => (
                  <div
                    key={index}
                    className="relative group"
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <span className="bg-blue-500 text-white text-sm px-3 py-1 rounded-full cursor-pointer">
                      {category}
                    </span>

                    {/* Tooltip */}
                    {hoveredCategory === category && (
                      <div className="absolute left-1/2 transform -translate-x-1/2 -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {categoryMap[category] || "Unknown Category"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Button to trigger search with the paper's embeddngs */}
            <button
              onClick={() => onSearch(paper.embedding, 6, true)}
              className="mt-4 py-1 px-4 bg-gradient-to-r from-red-300 to-indigo-400 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-indigo-400 hover:to-blue-800 transition-all duration-200 ease-in-out"
            >
              Find Similar Papers
            </button>
            {/* Reactoin Button in Bottom Right */}
            <ReactionButton paperId={paper.paper_id} />
          </div>
        );
      })}

    {selectedPaper && <Modal paper={selectedPaper} onClose={() => setSelectedPaper(null)} />}
    </div>
  );
}

function Modal({ paper, onClose }) {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  
  // Flatten the category mapping from categories.json
  const categoryMap = Object.values(categoriesData).reduce(
    (acc, subcategories) => ({ ...acc, ...subcategories }),
    {}
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4"
      onClick={onClose} // Close when clicking on the background
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-xl w-full p-6 relative"
        onClick={(e) => e.stopPropagation()} // Prevent click inside the modal from closing it
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          ✖
        </button>
        <h2 className="text-xl font-bold">{paper.title}</h2>

        {paper.similarity_score !== undefined && (
              <p className="text-sm italic text-gray-600">
                Score: {paper.similarity_score}
              </p>
            )}

        {paper.authors && paper.authors.length > 0 && (
          <p className="text-sm italic text-gray-600">{paper.authors.join(", ")}</p>
        )}
        <p className="text-sm italic text-gray-600">
          Published: {new Date(paper.datePublished).toLocaleDateString("en-US")}
        </p>
        <p className="mt-2 text-gray-700">{paper.abstract}</p>
        
        {paper.categories && paper.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {paper.categories.map((category, index) => (
                  <div
                    key={index}
                    className="relative group"
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <span className="bg-blue-500 text-white text-sm px-3 py-1 rounded-full cursor-pointer">
                      {category}
                    </span>

                    {/* Tooltip */}
                    {hoveredCategory === category && (
                      <div className="absolute left-1/2 transform -translate-x-1/2 -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {categoryMap[category] || "Unknown Category"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

        <a
          href={paper.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline mt-4 inline-block"
        >
          Read More →
        </a>
      </div>
    </div>
  );
}
