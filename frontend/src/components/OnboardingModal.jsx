import { useEffect, useState } from "react";
import Lottie from "lottie-react";

import likeAnimation from "../assets/likebutton.json";
import dislikeAnimation from "../assets/dislike_button.json";
import createSessionImage from "../assets/create_new_session.png";
import findSimilarImage from "../assets/find_similar_paper.png";
import welcomeAnimation from "../assets/books.json";

const slides = [
  {
    title: "Welcome to PaperMatch",
    description:
      "Get “matched” with papers you'll actually want to read. Tell us what you like and what you don’t — we’ll learn your preferences to tailor better results.",
    animation: welcomeAnimation,
  },
  {
    title: "Create Your First Session",
    description:
      "Sessions help you organize your search. Start one for each topic, project, or class.",
    image: createSessionImage,
  },
  {
    title: "Like Papers",
    description:
      "Click the heart to save a paper. Liked papers are stored for future reference and smarter recommendations.",
    animation: likeAnimation,
  },
  {
    title: "Dislike Papers",
    description:
      "Disliked papers are hidden from future results — but can still be found in the Hidden tab.",
    animation: dislikeAnimation,
  },
  {
    title: "Explore Similar Papers",
    description:
      "Use 'Find Similar' to discover more papers just like the ones you love.",
    image: findSimilarImage,
  },
];

export default function OnboardingModal() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("hasSeenOnboarding");
    if (!seen) setShowModal(true);
  }, []);

  const next = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      localStorage.setItem("hasSeenOnboarding", "true");
      setShowModal(false);
    }
  };

  if (!showModal) return null;

  const { title, description, animation, image } = slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#F5EDE3] text-[#3E3232] font-serif w-full max-w-md rounded-xl p-6 shadow-xl space-y-4 text-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-base sm:text-lg font-normal leading-relaxed text-[#3E3232]">
          {description}
        </p>

        {animation && (
          <div className="w-40 h-40 mx-auto">
            <Lottie animationData={animation} loop={true} />
          </div>
        )}

        {image && (
          <div className="w-full flex justify-center">
            <img
              src={image}
              alt="Onboarding visual"
              className="max-w-[180px] max-h-[180px] rounded-lg object-contain"
            />
          </div>
        )}

        <button
          onClick={next}
          className="bg-[#B8A290] hover:bg-[#A68C7C] text-white px-5 py-2 rounded-md transition"
        >
          {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}
