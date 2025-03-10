import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient"; // Ensure correct import path

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);

        // ✅ Fetch the session correctly
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionData?.session?.access_token) {
          setToken(sessionData.session.access_token);
          console.log(
            "JWT Token (on app load):",
            sessionData.session.access_token
          ); // Debugging line ✅
        }

        if (sessionError) {
          console.error("Error fetching session:", sessionError);
        }
      }
      if (error) {
        console.error("Error fetching user:", error);
      }
    }

    fetchUser();

    // ✅ Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setToken(session?.access_token || null);
          console.log("JWT Token (on auth change):", session?.access_token); // Debugging line ✅
        } else {
          setUser(null);
          setToken(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
