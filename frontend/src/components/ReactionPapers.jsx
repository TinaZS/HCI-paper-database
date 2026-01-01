import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import DisplayResults from "./DisplayResults";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function ReactionPapers({
  reactionType,
  onSearch,
  session_name,
  showAll,
}) {
  const { token } = useAuth();
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [litReview, setLitReview] = useState("");
  const [generatingReview, setGeneratingReview] = useState(false);
  const navigate = useNavigate();

  console.log("🔁 RENDER: ReactionPapers", {
    reactionType,
    session_name,
    papersLength: papers.length,
  });

  // ✅ Fetch only once if data not already loaded
  useEffect(() => {
    async function fetchReactionPapers() {
      if (!token || !session_name) return;

      setLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL
          }/get_papers_by_reaction?reaction_type=${reactionType}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              XSessionName: session_name,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPapers(data.papers || []);
          setFilteredPapers(data.papers || []);
        } else {
          console.error(`Failed to fetch ${reactionType} papers`);
        }
      } catch (error) {
        console.error(`Error fetching ${reactionType} papers:`, error);
      }
      setLoading(false);
    }

    // 🧼 Clear old papers while new ones load
    setPapers([]);
    setFilteredPapers([]);
    fetchReactionPapers();
  }, [token, session_name, reactionType]);

  // ✅ Debounced search filter
  useEffect(() => {
    const timeout = setTimeout(() => {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = papers.filter(
        (paper) =>
          paper.title.toLowerCase().includes(lowerQuery) ||
          paper.abstract.toLowerCase().includes(lowerQuery) ||
          (paper.authors &&
            paper.authors.join(", ").toLowerCase().includes(lowerQuery)) ||
          (paper.categories &&
            paper.categories.join(", ").toLowerCase().includes(lowerQuery))
      );
      setFilteredPapers(filtered);
    }, 120); // Short debounce

    return () => clearTimeout(timeout);
  }, [searchQuery, papers]);

  const handleGenerateLitReview = async () => {
    if (!token || !session_name || generatingReview) return;
    setGeneratingReview(true);
    setLitReview(""); // Clear old review

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate_lit_review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_name }),
      });

      if (response.ok) {
        const data = await response.json();
        setLitReview(data.review);
      } else {
        console.error("Failed to generate literature review");
        alert("Failed to generate review. Please try again later.");
      }
    } catch (error) {
      console.error("Error generating lit review:", error);
    } finally {
      setGeneratingReview(false);
    }
  };

  return (
    <div className="p-8 flex flex-col items-center z-10">
      <h2 className="text-4xl font-black text-center mb-8 text-slate-900 tracking-tight">
        {reactionType === "like" ? "Research Library" : "Archive"}
      </h2>

      {token && papers.length > 0 && (
        <div className="w-full max-w-2xl flex flex-col gap-3 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder={`Search ${reactionType === "like" ? "library" : "archive"}...`}
                className="w-full px-5 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {reactionType === "like" && (
              <button
                onClick={handleGenerateLitReview}
                disabled={generatingReview}
                className={`px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95 ${generatingReview ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {generatingReview ? "Synthesizing..." : "✨ Generate AI Review"}
              </button>
            )}
          </div>

          {/* Lit Review Display Area */}
          {litReview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="bg-white border border-indigo-100 rounded-2xl p-8 relative shadow-xl shadow-indigo-500/5 mt-4"
            >
              <button
                onClick={() => setLitReview("")}
                className="absolute top-4 right-6 text-slate-400 hover:text-red-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-2 mb-6">
                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-indigo-100">
                  AI Synthesis Results
                </span>
              </div>
              <div className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[500px] text-base pr-4 custom-scrollbar">
                {litReview}
              </div>
              <p className="mt-6 pt-6 border-t border-slate-50 text-xs italic text-slate-400">
                Generated based on the {papers.length} bookmarked papers in "{session_name}".
              </p>
            </motion.div>
          )}
        </div>
      )}

      {!token ? (
        <div className="bg-white border border-slate-200 text-slate-600 px-8 py-10 rounded-3xl text-center shadow-xl max-w-xl mx-auto mt-10">
          <p className="text-xl font-bold text-slate-900 mb-2">
            Authentication Required
          </p>
          <p className="text-base text-slate-500 mb-8">
            Please log in to access your curated {reactionType} library.
          </p>
          <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
            Sign In Now
          </button>
        </div>
      ) : loading ? (
        <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs mt-12 animate-pulse">
          Synchronizing your library...
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="bg-white border border-slate-200 text-slate-600 px-10 py-12 rounded-3xl text-center shadow-2xl max-w-xl mx-auto mt-12">
          <p className="text-2xl font-black text-slate-900 mb-3">
            Your {reactionType === "like" ? "library" : "archive"} is empty.
          </p>
          <p className="text-base text-slate-500 mb-10 leading-relaxed">
            Discovery starts with a single bookmark. Explore the feed and curate the research that matters to you.
          </p>
          <Link
            to="/"
            className="inline-block bg-slate-900 hover:bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-xl shadow-slate-900/10"
          >
            Start Discovery
          </Link>
        </div>
      ) : (
        <motion.div
          key={`${reactionType}-results`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full"
        >
          <DisplayResults
            results={filteredPapers}
            onSearch={(embedding) => {
              onSearch(embedding, 6, true);
              navigate("/");
            }}
            session_name={session_name}
            showAll={true}
            reactionType={reactionType}
          />
        </motion.div>
      )}
    </div>
  );
}
