import { supabase } from "../supabaseClient"; // ✅ Import supabase client
import { useAuth } from "../AuthContext"; // ✅ Use Auth Context
import AuthModal from "./AuthModal"; // ✅ Import modal
import { useState, useEffect } from "react"; // ✅ Import useState and useEffect
import { Link } from "react-router-dom"; // ✅ Import Link for navigation
import { AnimatePresence } from "framer-motion";

export default function Header({ sidebarVisible }) {
  const { user, setUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut(); // ✅ Logout from Supabase
    setUser(null);
  }

  return (
    <header className={`w-full py-6 flex justify-between items-center z-20 transition-all duration-300 ${sidebarVisible ? "px-10" : "pl-20 pr-10"
      }`}>
      <nav className="flex space-x-8 text-sm font-semibold tracking-wide uppercase text-slate-400">
        <Link to="/" className="hover:text-indigo-600 transition-colors">
          Discovery
        </Link>
        <Link to="/saved" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
          Bookmarks
        </Link>
        <Link to="/for-you" className="hover:text-indigo-600 transition-colors">
          For You
        </Link>
        <Link to="/disliked" className="hover:text-indigo-600 transition-colors">
          Disliked
        </Link>
      </nav>

      {/* ✅ Right-side user authentication */}
      <div>
        {user ? (
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="bg-slate-100 text-slate-600 px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all border border-slate-200"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            Sign In
          </button>
        )}
      </div>

      {/* ✅ Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal onClose={() => setIsAuthModalOpen(false)} />
        )}
      </AnimatePresence>
    </header>
  );
}
