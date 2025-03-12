import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import DisplayResults from "./DisplayResults";

export default function LikedPapers() {
  const { token } = useAuth();
  const [likedPapers, setLikedPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchLikedPapers() {
      if (!token) return;

      setLoading(true);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/liked_papers`,
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
          setLikedPapers(data.liked_papers);
          setFilteredPapers(data.liked_papers); // ✅ Initialize filteredPapers with all papers
        } else {
          console.error("Failed to fetch liked papers");
        }
      } catch (error) {
        console.error("Error fetching liked papers:", error);
      }

      setLoading(false);
    }

    fetchLikedPapers();
  }, [token]);

  // ✅ Filter liked papers based on search query
  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = likedPapers.filter(
      (paper) =>
        paper.title.toLowerCase().includes(lowerQuery) ||
        paper.abstract.toLowerCase().includes(lowerQuery) ||
        (paper.authors &&
          paper.authors.join(", ").toLowerCase().includes(lowerQuery)) ||
        (paper.categories &&
          paper.categories.join(", ").toLowerCase().includes(lowerQuery))
    );
    setFilteredPapers(filtered);
  }, [searchQuery, likedPapers]);

  return (
    <div className="p-6 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4 text-center">Your Saved Papers</h2>

      {/* ✅ Search Bar */}
      {token && likedPapers.length > 0 && (
        <input
          type="text"
          placeholder="Search saved papers..."
          className="mb-4 p-2 border rounded-md w-full max-w-2xl"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      )}

      {!token ? (
        <p className="text-red-500 font-semibold text-center">
          Only signed-in users can view saved papers. Please log in.
        </p>
      ) : loading ? (
        <p className="text-gray-500 text-center">Loading saved papers...</p>
      ) : filteredPapers.length === 0 ? (
        <p className="text-gray-500 text-center">
          {searchQuery
            ? "No matching papers found."
            : "You haven’t saved any papers yet."}
        </p>
      ) : (
        <DisplayResults results={filteredPapers} /> // ✅ Display filtered results
      )}
    </div>
  );
}
