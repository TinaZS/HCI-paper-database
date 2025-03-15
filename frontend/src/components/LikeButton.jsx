import React, { useState, useEffect } from "react";
import { HeartIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../AuthContext"; // Import AuthContext

export default function LikeButton({ paperId }) {
  const [liked, setLiked] = useState(false);
  const { token } = useAuth(); // Get token from AuthContext
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (!token) return; // Don't fetch if there's no token

    async function checkIfLiked() {
      try {
        console.log("Token being sent:", token); // Debugging JWT
        const response = await fetch(`${API_BASE_URL}/liked_papers`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // Use AuthContext token
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const likedPaperIds = data.liked_papers.map(
            (paper) => paper.paper_id
          );

          setLiked(likedPaperIds.includes(paperId));
        }
      } catch (error) {
        console.error("Error fetching liked papers:", error);
      }
    }

    checkIfLiked();
  }, [paperId, token]); // Re-run when token updates

  const toggleLike = async () => {
    if (!token) {
      console.error("No token available");
      return;
    }

    const url = liked ? `${API_BASE_URL}/unlike` : `${API_BASE_URL}/like`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paper_id: paperId }),
      });

      if (response.ok) {
        setLiked(!liked); // Toggle UI state on success
      } else {
        console.error("Failed to update like status");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <button onClick={toggleLike} className="absolute bottom-2 right-2">
      <HeartIcon
        className={`w-6 h-6 transform transition-transform ${
          liked ? "scale-110" : "scale-100"
        }`}
        style={{
          color: liked ? "#ff4778" : "#A0AEC6", // Custom colors
          transition: "color 0.3s ease-in-out, transform 0.2s ease-in-out",
        }}
      />
    </button>
  );
}
