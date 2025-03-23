import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import StaticResults from "./StaticResults"; // NEW simplified display

export default function ReactionPapers({ reactionType, onSearch }) {
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (!token) return;

    async function fetchPapers() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/get_papers_by_reaction?reaction_type=${reactionType}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data.papers || []);
        } else {
          console.error("Failed to fetch papers", response.status);
        }
      } catch (error) {
        console.error("Error fetching reaction papers:", error);
      }
    }

    fetchPapers();
  }, [reactionType, token]);

  return (
    <div className="mt-12">
      <h1 className="text-2xl font-bold text-center mb-4">
        {reactionType === "like" ? "Your Liked Papers" : "Your Disliked Papers"}
      </h1>
      <StaticResults results={results} onSearch={onSearch} />
    </div>
  );
}
