import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true, // ✅ persist session in localStorage
    autoRefreshToken: true, // ✅ automatically refresh tokens
    detectSessionInUrl: true, // ✅ enables OAuth redirect detection (safe to keep)
  },
});
