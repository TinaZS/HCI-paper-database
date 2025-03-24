import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import DisplayResults from "./DisplayResults";
import { useNavigate } from "react-router-dom";

export default function ReactionPapers({ reactionType, onSearch, session_name }) {
  const { token } = useAuth();
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  console.log("Calling from reactionpapers, session is ",session_name)
  const test="testing123"

  useEffect(() => {
    async function fetchReactionPapers() {
      if (!token) return;

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

    fetchReactionPapers();
  }, [token, reactionType]); // ✅ React to changes in reactionType

  useEffect(() => {
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
  }, [searchQuery, papers]);

  return (
    <div className="p-6 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4 text-center">
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
        {session_name}
        {test}
      {!token ? (
        <p className="text-red-500 font-semibold text-center">
          Only signed-in users can view {reactionType} papers. Please log in.
        </p>
      ) : loading ? (
        <p className="text-gray-500 text-center">
          Loading {reactionType} papers...
        </p>
      ) : filteredPapers.length === 0 ? (
        <p className="text-gray-500 text-center">
          {searchQuery
            ? `No matching ${reactionType} papers found.`
            : `You haven’t ${reactionType}d any papers yet.`}
        </p>
      ) : (
        <DisplayResults
          results={filteredPapers}
          onSearch={(embedding) => {
            onSearch(embedding, 6, true);
            navigate("/");}}
          session_name={session_name}
        />
      )}
    </div>
  );
}
