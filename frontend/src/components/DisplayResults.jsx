import React, { useState, useEffect, useRef } from "react";
import categoriesData from "./categories.json";
import ReactionButton from "./ReactionButton";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import CitationModal from "./CitationModal";

export default function DisplayResults({
  results,
  onSearch,
  sortBy,
  dislikedPaperIds = [],
  refillResults,
  session_name,
  showAll = false,
  reactionType,
}) {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const { user, token } = useAuth();
  const [visibleResults, setVisibleResults] = useState([]);
  const [reactions, setReactions] = useState({});
  const [citingPaper, setCitingPaper] = useState(null);

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

  // ✅ Fetch user reactions if reactionType is not given (e.g. homepage)
  useEffect(() => {
    async function fetchReactions() {
      if (!user || !session_name || reactionType) return;

      const { data, error } = await supabase
        .from("likes")
        .select("paper_id, reaction_type")
        .eq("user_id", user.id)
        .eq("session_name", session_name);

      if (!error && data) {
        const map = {};
        for (const r of data) {
          map[r.paper_id] = r.reaction_type;
        }
        setReactions(map);
      } else {
        console.error("Failed to fetch reactions", error);
      }
    }

    fetchReactions();
  }, [user, session_name, reactionType]);

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
    setReactions((prev) => ({ ...prev, [paperId]: newReaction }));
  };

  const trackSignal = async (paperId, eventType, duration = 0, qdrantId = null, metadata = {}) => {
    if (!user || !token) return;
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
      await fetch(`${API_BASE_URL}/signal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "XSessionName": session_name
        },
        body: JSON.stringify({
          paper_id: paperId,
          qdrant_id: qdrantId,
          event_type: eventType,
          duration: duration,
          metadata: metadata
        })
      });
    } catch (e) {
      console.error("Signal error:", e);
    }
  };

  const sortedResults = [...visibleResults].sort((a, b) => {
    if (sortBy === "score")
      return (b.similarity_score || 0) - (a.similarity_score || 0);
    if (sortBy === "date")
      return new Date(b.datePublished) - new Date(a.datePublished);
    return 0;
  });

  let resultsToRender = sortedResults;

  if (showAll == false) {
    resultsToRender = sortedResults.slice(0, 6);
  }

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
              onClick={() => {
                setSelectedPaper(paper);
                trackSignal(paper.paper_id, "expand", 0, paper.qdrant_id, { type: "modal_open" });
              }}
            >
              <div className="card-premium p-8 rounded-2xl relative w-full flex flex-col space-y-4 cursor-pointer">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-xl font-bold text-slate-900 leading-snug flex-1">
                    {paper.title}
                  </h3>
                  {paper.similarity_score !== undefined && (
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-tighter">
                        Match: {Math.round(paper.similarity_score * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {paper.authors && paper.authors.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span>{paper.authors[0]}</span>
                    <span className="text-slate-300">•</span>
                    <span>{formattedDate}</span>
                  </div>
                )}

                <p className="text-slate-600 text-sm leading-relaxed line-clamp-4">
                  {paper.abstract}
                </p>

                <div className="flex-grow"></div>

                {paper.categories && paper.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                    {paper.categories.slice(0, 3).map((category, index) => (
                      <span
                        key={index}
                        className="bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-50 mt-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSearch(paper.embedding, 6, true);
                      trackSignal(paper.paper_id, "find_similar", 0, paper.qdrant_id);
                    }}
                    className="flex-grow py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                  >
                    Similar Papers
                  </button>
                  <div className="flex-shrink-0">
                    <ReactionButton
                      paperId={paper.paper_id}
                      qdrantId={paper.qdrant_id}
                      onReactionChange={(newReaction) =>
                        handleReactionChange(paper.paper_id, newReaction)
                      }
                      onCite={() => {
                        setCitingPaper(paper);
                        trackSignal(paper.paper_id, "cite_click", 0, paper.qdrant_id);
                      }}
                      session_name={session_name}
                      initialReaction={reactionType || reactions[paper.paper_id]}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {selectedPaper && (
        <Modal
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          trackSignal={trackSignal}
          onSearch={onSearch} // Pass onSearch
          session_name={session_name} // Pass session_name
          reactionType={reactionType} // Pass reactionType
          reactions={reactions} // Pass reactions
          setCitingPaper={setCitingPaper} // Pass setCitingPaper
        />
      )}

      {citingPaper && (
        <CitationModal
          paper={citingPaper}
          onClose={() => setCitingPaper(null)}
        />
      )}
    </div>
  );
}

function Modal({
  paper,
  onClose,
  trackSignal,
  onSearch,
  session_name,
  reactionType,
  reactions,
  setCitingPaper,
}) {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const startTimeRef = useRef(Date.now());

  // Track dwell time on unmount (closing modal)
  useEffect(() => {
    return () => {
      const duration = Date.now() - startTimeRef.current;
      if (duration > 2000) { // Only log if viewed for > 2 seconds
        trackSignal(paper.paper_id, "dwell", duration, paper.qdrant_id);
      }
    };
  }, [paper.paper_id, trackSignal]);

  const categoryMap = Object.values(categoriesData).reduce(
    (acc, sub) => ({ ...acc, ...sub }),
    {}
  );

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex justify-center items-start p-6 z-50 overflow-y-auto py-12 md:py-20"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-8 md:p-12 relative animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-8 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {paper.categories && paper.categories.length > 0 && (
                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-indigo-100">
                  {paper.categories[0]}
                </span>
              )}
              {paper.similarity_score !== undefined && (
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Match Stability: {Math.round(paper.similarity_score * 100)}%
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              {paper.title}
            </h2>
            {paper.authors && (
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                By {paper.authors.join(", ")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 py-4 border-y border-slate-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Publication Date</span>
              <span className="text-sm font-bold text-slate-900">{new Date(paper.datePublished).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 text-base leading-relaxed font-medium opacity-90">
              {paper.abstract}
            </p>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row gap-6 items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <a
                href={paper.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                onClick={() => trackSignal(paper.paper_id, "click", 0, paper.qdrant_id, { type: "link_out" })}
              >
                Access Publication
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSearch(paper.embedding, 6, true);
                  trackSignal(paper.paper_id, "find_similar", 0, paper.qdrant_id);
                  onClose();
                }}
                className="px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                Find Similar
              </button>
            </div>

            <div className="flex items-center gap-6">
              <ReactionButton
                paperId={paper.paper_id}
                qdrantId={paper.qdrant_id}
                onReactionChange={() => { }} // No need to filter results in modal
                onCite={() => {
                  setCitingPaper(paper);
                  trackSignal(paper.paper_id, "cite_click", 0, paper.qdrant_id);
                }}
                session_name={session_name}
                initialReaction={reactionType || reactions[paper.paper_id]}
              />
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-2">
            {paper.categories?.map((category, index) => (
              <div
                key={index}
                className="relative group"
                onMouseEnter={() => setHoveredCategory(category)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <span className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md border border-slate-100">
                  {category}
                </span>
                {hoveredCategory === category && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 -top-10 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg shadow-2xl z-[60] whitespace-nowrap">
                    {categoryMap[category] || "Unknown Field"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
