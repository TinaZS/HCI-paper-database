import React from "react";
import ReactionButton from "./ReactionButton";

export default function StaticResults({ results, onSearch }) {
  if (!Array.isArray(results)) {
    console.warn("⚠️ StaticResults expected an array but got:", results);
    return null;
  }
  const dog="dog";

  return (
    <div className="mt-6 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-6">
      {results.map((paper) => {
        const formattedDate = paper.datePublished
          ? new Date(paper.datePublished).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "Unknown";

        return (
          <div
            key={paper.paper_id}
            className="p-6 border border-[#8B6C42] bg-[#F5EDE3] rounded-xl shadow-lg relative transition-all duration-300 hover:shadow-xl w-full pb-12 space-y-3"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-serif text-lg font-semibold text-[#2D2C2A] leading-tight flex-1 pr-2">
                {paper.title}
              </h3>
            </div>

            {paper.authors && paper.authors.length > 0 && (
              <div className="flex justify-between text-sm italic text-[#5C4033]">
                <span>{paper.authors[0]}, et al.</span>
                <span>{formattedDate}</span>
              </div>
            )}

            {paper.abstract && (
              <p className="text-[#2D2C2A] text-sm leading-relaxed mt-2">
                {paper.abstract.length > 200
                  ? `${paper.abstract.substring(0, 200)}...`
                  : paper.abstract}
              </p>
            )}

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

            {paper.embedding && (
              <button
                onClick={() => onSearch(paper.embedding, 6, true)}
                className="mt-3 py-1.5 px-3 text-sm bg-[#BFA58A] text-[#F5EDE3] font-medium rounded-md shadow hover:bg-[#A27D5C] transition duration-150"
              >
                Find Similar Papers
              </button>
            )}

            <ReactionButton paperId={paper.paper_id} session_name={dog} />
          </div>
        );
      })}
    </div>
  );
}
