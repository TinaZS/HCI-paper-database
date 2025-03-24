import React, { useState, useEffect } from "react";
import { HeartIcon, HandThumbDownIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../AuthContext";

export default function ReactionButton({ paperId, onReactionChange, current_session }) {
  const [reaction, setReaction] = useState(null); // 'like' or 'dislike'
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (!token) return;

    async function fetchReaction() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/get_papers_by_reaction?reaction_type=like`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"//,
             // "X-Session-Name": current_session, // Custom header to send session information
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const paperReaction = data.papers.find(
            (paper) => paper.paper_id === paperId
          );

          if (paperReaction) {
            setReaction("like"); // ✅ Explicitly setting the reaction
          }
        }

        // Check for dislike reactions separately
        const dislikeResponse = await fetch(
          `${API_BASE_URL}/get_papers_by_reaction?reaction_type=dislike`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"//,
              //"X-Session-Name": current_session, // Custom header to send session information
            },
          }
        );

        if (dislikeResponse.ok) {
          const dislikeData = await dislikeResponse.json();
          const dislikeReaction = dislikeData.papers.find(
            (paper) => paper.paper_id === paperId
          );

          if (dislikeReaction) {
            setReaction("dislike");
          }
        }
      } catch (error) {
        console.error("Error fetching reaction:", error);
      }
    }

    fetchReaction();
  }, [paperId, token]);

  const handleReaction = async (reactionType, session) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/react_to_paper`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paper_id: paperId,
          reaction_type: reactionType,
          user_session: session,
        }),
      });

      if (response.ok) {
        const updated = reaction === reactionType ? null : reactionType;
        setReaction(updated);
        if (onReactionChange) onReactionChange(updated); // ✅ Notify parent
      }
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  return (
    <div className="flex gap-3 items-center absolute bottom-2 right-2">
      <button
        onClick={() => handleReaction("like", current_session)}
        className="focus:outline-none"
      >
        <HeartIcon
          className={`w-6 h-6 ${
            reaction === "like" ? "text-red-500" : "text-gray-400"
          }`}
        />
      </button>
      <button
        onClick={() => handleReaction("dislike", current_session)}
        className="focus:outline-none"
      >
        <HandThumbDownIcon
          className={`w-6 h-6 ${
            reaction === "dislike" ? "text-blue-500" : "text-gray-400"
          }`}
        />
      </button>
    </div>
  );
}
