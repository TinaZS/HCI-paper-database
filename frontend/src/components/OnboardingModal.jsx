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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
      <div className="bg-white w-full max-w-lg rounded-3xl p-10 shadow-2xl space-y-6 text-center border border-slate-100 animate-in fade-in zoom-in duration-300">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
        <p className="text-base sm:text-lg font-medium leading-relaxed text-slate-600">
          {description}
        </p>

        {animation && (
          <div className="w-48 h-48 mx-auto py-2">
            <Lottie animationData={animation} loop={true} />
          </div>
        )}

        {image && (
          <div className="w-full flex justify-center py-4">
            <img
              src={image}
              alt="Onboarding visual"
              className="max-w-[220px] max-h-[220px] rounded-xl object-contain shadow-lg border border-slate-100"
            />
          </div>
        )}

        <button
          onClick={next}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
        >
          {currentSlide === slides.length - 1 ? "Start Researching" : "Continue"}
        </button>
      </div>
    </div>
  );
}
