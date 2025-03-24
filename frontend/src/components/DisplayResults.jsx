import React, { useState, useEffect } from "react";
import categoriesData from "./categories.json";
import ReactionButton from "./ReactionButton";
import { useAuth } from "../AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export default function DisplayResults({
  results,
  onSearch,
  sortBy,
  dislikedPaperIds = [],
  refillResults,
  session_name,
}) {

  console.log("USER SESSION In display results is ",session_name)
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const { user } = useAuth();
  const [visibleResults, setVisibleResults] = useState([]);
  const currentSessionName = session_name;

  useEffect(() => {
    let filtered = [...results];
    if (user && dislikedPaperIds.length > 0) {
      filtered = filtered.filter(
        (paper) => !dislikedPaperIds.includes(paper.paper_id)
      );
    }

    const isSame =
      visibleResults.length === filtered.length &&
      visibleResults.every((p, i) => p.paper_id === filtered[i]?.paper_id);

    if (!isSame) {
      setVisibleResults(filtered);
    }
  }, [results, dislikedPaperIds, user]);

  const handleReactionChange = (paperId, newReaction) => {
    if (newReaction === "dislike") {
      setVisibleResults((prev) => {
        const updated = prev.filter((paper) => paper.paper_id !== paperId);
        setTimeout(() => {
          if (updated.length < 6 && refillResults) {
            const firstRemaining = updated[0];
            if (firstRemaining?.embedding) {
              refillResults(firstRemaining.embedding, 12, true);
            }
          }
        }, 300);
        return updated;
      });
    }
  };

  const sortedResults = [...visibleResults].sort((a, b) => {
    if (sortBy === "score")
      return (b.similarity_score || 0) - (a.similarity_score || 0);
    if (sortBy === "date")
      return new Date(b.datePublished) - new Date(a.datePublished);
    return 0;
  });

  const resultsToRender = sortedResults.slice(0, 6);

  return (
    <div className="mt-6 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-6">
      <AnimatePresence>
        {resultsToRender.map((paper) => {
          const formattedDate = paper.datePublished
            ? new Date(paper.datePublished).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Unknown";

          return (
            <motion.div
              key={paper.paper_id}
              className="h-full flex"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedPaper(paper)}
            >
              <div className="p-6 border border-[#8B6C42] bg-[#F5EDE3] rounded-xl shadow-lg relative transition-all duration-300 hover:shadow-xl w-full pb-12 space-y-3 cursor-pointer">
                <div className="flex justify-between items-start">
                  <h3 className="font-serif text-lg font-semibold text-[#2D2C2A] leading-tight flex-1 pr-2">
                    {paper.title}
                  </h3>
                  {paper.similarity_score !== undefined && (
                    <span className="text-sm italic text-[#5C4033] whitespace-nowrap">
                      Score: {paper.similarity_score.toFixed(2)}
                    </span>
                  )}
                </div>

                {paper.authors && paper.authors.length > 0 && (
                  <div className="flex justify-between text-sm italic text-[#5C4033]">
                    <span>{paper.authors[0]}, et al.</span>
                    <span>{formattedDate}</span>
                  </div>
                )}

                <p className="text-[#2D2C2A] text-sm leading-relaxed mt-2">
                  {paper.abstract.length > 200
                    ? `${paper.abstract.substring(0, 200)}...`
                    : paper.abstract}
                </p>

                <a
                  href={paper.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8B6C42] underline inline-block text-sm font-medium mt-2"
                >
                  Read More →
                </a>

                {paper.categories && paper.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {paper.categories.map((category, index) => (
                      <span
                        key={index}
                        className="bg-[#BFA58A] text-[#2D2C2A] text-sm px-3 py-1 rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearch(paper.embedding, 6, true);
                  }}
                  className="mt-3 py-1.5 px-3 text-sm bg-[#BFA58A] text-[#F5EDE3] font-medium rounded-md shadow hover:bg-[#A27D5C] transition duration-150"
                >
                  Find Similar Papers
                </button>
                <div>toast{currentSessionName}toast</div> {/* This will render session_name */}
              <ReactionButton
                paperId={paper.paper_id}
                onReactionChange={(newReaction) =>
                  handleReactionChange(paper.paper_id, newReaction)}
                session_name={session_name}
              />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {selectedPaper && (
        <Modal paper={selectedPaper} onClose={() => setSelectedPaper(null)} />
      )}
    </div>
  );
}

function Modal({ paper, onClose }) {
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const categoryMap = Object.values(categoriesData).reduce(
    (acc, sub) => ({ ...acc, ...sub }),
    {}
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-xl w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
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

        {paper.authors && (
          <p className="text-sm italic text-gray-600">
            {paper.authors.join(", ")}
          </p>
        )}
        <p className="text-sm italic text-gray-600">
          Published: {new Date(paper.datePublished).toLocaleDateString("en-US")}
        </p>
        <p className="mt-2 text-gray-700">{paper.abstract}</p>

        {paper.categories && (
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
