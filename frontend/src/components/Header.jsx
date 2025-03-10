import { supabase } from "../supabaseClient"; // ✅ Import supabase client
import { useAuth } from "../AuthContext"; // ✅ Use Auth Context
import AuthModal from "./AuthModal"; // ✅ Import modal
import { useState } from "react"; // ✅ Import useState

export default function Header() {
  const { user, setUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut(); // ✅ Logout from Supabase
    setUser(null);
  }

  return (
    <header className="w-full flex justify-end p-4 bg-gray-100 relative">
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-gray-700">Signed in as {user.email}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Sign In
        </button>
      )}

      {/* ✅ Wrap modal in an overlay */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <AuthModal onClose={() => setIsAuthModalOpen(false)} />
        </div>
      )}
    </header>
  );
}
