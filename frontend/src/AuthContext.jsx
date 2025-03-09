import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient"; // Ensure correct import path

// ✅ Create Auth Context
const AuthContext = createContext();

// ✅ Provide Auth Context
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // ✅ Check if user is logged in on app load
  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
      }
      if (error) {
        console.error("Error fetching user:", error);
      }
    }

    fetchUser();

    // ✅ Listen for auth state changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Custom Hook for Using Auth
export function useAuth() {
  return useContext(AuthContext);
}
