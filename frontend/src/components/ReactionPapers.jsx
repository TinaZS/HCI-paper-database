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
          `${
            import.meta.env.VITE_BACKEND_URL
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

  return (
    <div className="p-6 flex flex-col items-center">
      <h2
        className="text-[#3E3232] text-2xl font-bold mb-4 text-center"
        style={{ fontFamily: "Gloock", color: "#D5C7AC" }}
      >
        {reactionType === "like" ? "Your Liked Papers" : "Your Disliked Papers"}
      </h2>

      {token && papers.length > 0 && (
        <input
          type="text"
          placeholder={`Search ${reactionType} papers...`}
          className="mb-4 p-2 border rounded-md w-full max-w-2xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
        <div className="bg-[#F5EDE3] border border-[#8B6C42] text-[#3E3232] px-6 py-6 rounded-xl text-center shadow-md font-serif max-w-xl mx-auto mt-10">
          <p className="text-lg font-semibold mb-2">
            You haven’t {reactionType}d any papers yet.
          </p>
          <p className="text-sm mb-4">
            Try exploring the homepage and click the{" "}
            <span className="text-red-500 font-bold">♥</span> or{" "}
            <span className="text-gray-600 font-bold">👎</span> icons to curate
            your research!
          </p>
          <a
            href="/"
            className="inline-block mt-2 bg-[#B8A290] hover:bg-[#A68C7C] text-white font-medium px-4 py-2 rounded-md transition"
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
