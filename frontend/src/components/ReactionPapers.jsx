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
    <div className="p-6 flex flex-col items-center">
      <h2 className="text-2xl font-semibold text-center mb-4 text-[#4F106E] flex items-center gap-2">
        {reactionType === "like" ? <>🔖 Bookmarked Papers</> : "Your Disliked Papers"}
      </h2>

      {token && papers.length > 0 && (
        <div className="w-full max-w-2xl flex flex-col gap-3 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Search ${reactionType === "like" ? "bookmarked" : "disliked"} papers...`}
              className="p-2 border rounded-md flex-grow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {reactionType === "like" && (
              <button
                onClick={handleGenerateLitReview}
                disabled={generatingReview}
                className={`px-4 py-2 rounded-md bg-[#AB43BD] text-white font-medium shadow transition hover:bg-[#8B2F9E] ${generatingReview ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {generatingReview ? "Generating..." : "✨ Draft Lit Review"}
              </button>
            )}
          </div>

          {/* Lit Review Display Area */}
          {litReview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="bg-[#F3ECFF] border border-[#C8A2F7] rounded-xl p-6 relative"
            >
              <button
                onClick={() => setLitReview("")}
                className="absolute top-2 right-4 text-[#4F106E] hover:text-red-600 transition"
              >
                ✕ Close Review
              </button>
              <h3 className="text-xl font-bold text-[#4F106E] mb-4">AI Literature Review</h3>
              <div className="text-[#3E3232] font-sans leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[500px] text-sm md:text-md pr-2 custom-scrollbar">
                {/* We map the markdown-style headers to real ones or just rely on CSS */}
                {litReview}
              </div>
              <p className="mt-4 text-xs italic text-[#787391]">
                Generated based on the {papers.length} bookmarked papers in "{session_name}".
              </p>
            </motion.div>
          )}
        </div>
      )}

      {!token ? (
        <div className="bg-[#FBEAEA] border border-[#A63A3A] text-[#A63A3A] px-6 py-4 rounded-lg text-center font-serif shadow-md max-w-xl mx-auto mt-10">
          <p className="text-lg font-semibold mb-2">
            Only signed-in users can view {reactionType} papers.
          </p>
          <p className="text-sm">
            Please log in to access your saved or hidden papers.
          </p>
        </div>
      ) : loading ? (
        <div className="text-center text-[#5C4033] italic mt-6 font-serif">
          Loading {reactionType} papers...
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-lg border border-[#E5D0FA] text-[#4F106E] px-6 py-6 rounded-2xl text-center shadow-md font-sans max-w-xl mx-auto mt-10">
          <p className="text-xl font-semibold mb-2">
            You haven’t {reactionType === "like" ? "bookmarked" : "disliked"} any papers yet.
          </p>
          <p className="text-sm mb-5">
            Try exploring the homepage and click the{" "}
            <span className="text-[#AB43BD] font-bold">🔖</span> or{" "}
            <span className="text-[#293f80] font-bold">👎</span> icons to
            curate your research!
          </p>
          <a
            href="/"
            className="inline-block mt-2 bg-[#C8A2F7] hover:bg-[#AB43BD] text-white font-medium px-5 py-2 rounded-full transition shadow"
          >
            Browse Papers
          </a>
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
