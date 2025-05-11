import { supabase } from "../supabaseClient"; // ✅ Import supabase client
import { useAuth } from "../AuthContext"; // ✅ Use Auth Context
import AuthModal from "./AuthModal"; // ✅ Import modal
import { useState } from "react"; // ✅ Import useState
import { Link } from "react-router-dom"; // ✅ Import Link for navigation

export default function Header() {
  const { user, setUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut(); // ✅ Logout from Supabase
    setUser(null);
  }

  return (
    <header className="w-full py-4 px-6 flex justify-between items-center">
      <nav className="ml-12 flex space-x-6 text-lg font-serif">
        <a href="/" className="text-[#3E3232] hover:underline">
          Home
        </a>
        <a href="/saved" className="text-[#3E3232] hover:underline">
          Liked Papers
        </a>
        <a href="/disliked" className="text-[#3E3232] hover:underline">
          Hidden Papers
        </a>
      </nav>

      {/* ✅ Right-side user authentication */}
      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-[#4F106E]">Signed in as {user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-[#C8A2F7] text-white font-sans px-5 py-2 rounded-full shadow-md hover:bg-[#AB43BD] transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-[#C8A2F7] text-white font-sans px-5 py-2 rounded-full shadow-md hover:bg-[#AB43BD] transition"
          >
            Sign In
          </button>
        )}
      </div>

      {/* ✅ Wrap modal in an overlay */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <AuthModal onClose={() => setIsAuthModalOpen(false)} />
        </div>
      )}
    </header>
  );
}
