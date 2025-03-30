import React, { useState } from "react";
import { HeartIcon, HandThumbDownIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../AuthContext";

export default function ReactionButton({
  paperId,
  onReactionChange,
  session_name,
  initialReaction, // ✅ Pass this from parent
}) {
  const [reaction, setReaction] = useState(initialReaction || null); // 'like' | 'dislike' | null
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const [showTooltip, setShowTooltip] = useState(null); // "like" | "dislike" | null

  const handleReaction = async (reactionType) => {
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
          user_session: session_name,
        }),
      });

      if (response.ok) {
        // Toggle: clicking the same reaction removes it
        const updated = reaction === reactionType ? null : reactionType;
        setReaction(updated);
        if (onReactionChange) onReactionChange(updated);
      } else {
        console.error("Reaction update failed");
      }
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  return (
    <div className="flex gap-3 items-center absolute bottom-2 right-2">
      {/* Like Button */}
      <div
        className="relative"
        onMouseEnter={() => !token && setShowTooltip("like")}
        onMouseLeave={() => setShowTooltip(null)}
      >
      <button
        onClick={(e) => {
          e.stopPropagation(); // ⛔ Prevent card click
          handleReaction("like");
        }}
        className="focus:outline-none"
      >
        <HeartIcon
          className={`w-6 h-6 ${
            reaction === "like" ? "text-red-500" : "text-gray-400"
          }`}
        />
      </button>
      {showTooltip === "like" && (
           <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-40 bg-black text-white text-xs text-center rounded-md px-3 py-1 shadow-lg z-50">
            You must be logged in to like a paper
          </div>
        )}
      </div>
      
      {/* Dislike Button */}
      <div
        className="relative"
        onMouseEnter={() => !token && setShowTooltip("dislike")}
        onMouseLeave={() => setShowTooltip(null)}
      >
      <button
        onClick={(e) => {
          e.stopPropagation(); // ⛔ Prevent card click
          handleReaction("dislike");
        }}
        className="focus:outline-none"
      >
        <HandThumbDownIcon
          className={`w-6 h-6 ${
            reaction === "dislike" ? "text-[#293f80]" : "text-gray-400"
          }`}
        />
      </button>
      {showTooltip === "dislike" && (
           <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-40 bg-black text-white text-xs text-center rounded-md px-3 py-1 shadow-lg z-50">
            You must be logged in to dislike a paper
          </div>
        )}
      </div>
    </div>
  );
}
