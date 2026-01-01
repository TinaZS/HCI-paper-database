import React, { useState } from "react";
import { BookmarkIcon, HandThumbDownIcon, DocumentDuplicateIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../AuthContext";

export default function ReactionButton({
  paperId,
  qdrantId,
  onReactionChange,
  onCite, // ✅ New prop
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
          qdrant_id: qdrantId,
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
      {/* Cite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onCite) onCite();
        }}
        className="focus:outline-none"
        title="Cite this paper"
      >
        <DocumentDuplicateIcon className="w-6 h-6 text-[#998CC8] hover:text-[#4F106E] transition-colors" />
      </button>

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
          <BookmarkIcon
            className={`w-6 h-6 ${reaction === "like" ? "text-[#AB43BD]" : "text-gray-400"
              }`}
          />
        </button>
        {showTooltip === "like" && (
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-48 bg-black text-white text-xs text-center rounded-md px-3 py-1 shadow-lg z-50">
            You must be logged in to bookmark a paper
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
            className={`w-6 h-6 ${reaction === "dislike" ? "text-[#293f80]" : "text-gray-400"
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
