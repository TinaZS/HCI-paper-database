import React, {useState} from "react";
import LikeButton from "./LikeButton";
import categoriesData from "./categories.json"; // Import your JS

export default function DisplayResults({ results, onSearch }) {
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Flatten the category mapping from categories.json
  const categoryMap = Object.values(categoriesData).reduce(
    (acc, subcategories) => ({ ...acc, ...subcategories }),
    {}
  );

  return (
    <div className="mt-4 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-4">
      {results.map((paper) => {
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
            className="p-4 border rounded-md shadow bg-white relative"
          >
            <h3 className="font-semibold text-lg">{paper.title}</h3>
            <p className="text-sm italic text-gray-600">Score: {paper.similarity_score}</p>

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

            {/* Button to trigger search with the paper's title */}
            <button
              onClick={() => onSearch(paper.embedding,6,true)} // Trigger the search with the paper's title
              className="mt-2 px-2 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
            >
              Find similar papers...
            </button>

            {/* Heart Button in Bottom Right */}
            <LikeButton paperId={paper.paper_id} />
          </div>
        );
      })}
    </div>
  );
}
