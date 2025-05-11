import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AuthModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  function clearMessages() {
    setMessage("");
  }

  async function handleAuth() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }

    if (isResettingPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("A magic login link has been sent to your email.");
      return;
    }

    if (!password.trim()) {
      setMessage("Password is required.");
      return;
    }

    if (isSigningUp) {
      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }

      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "A confirmation link has been sent to your email. If you don’t receive it, you may already have an account. Try sign in instead."
      );
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(
          "Invalid credentials. Please sign up or reset your password."
        );
        return;
      }

      onClose();
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-[#f3ebfc] backdrop-blur-lg border border-[#E5D0FA] text-[#4F106E] font-sans p-8 rounded-2xl shadow-xl w-96">
        <h2 className="text-xl font-semibold mb-5 text-center">
          {isResettingPassword
            ? "Forgot Password?"
            : isSigningUp
            ? "Sign Up"
            : "Sign In"}
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border border-[#C8A2F7] rounded-lg mb-3 bg-white placeholder-[#C8A2F7] text-[#4F106E]"
        />

        {!isResettingPassword && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-[#C8A2F7] rounded-lg mb-3 bg-white placeholder-[#C8A2F7] text-[#4F106E]"
          />
        )}

        {isSigningUp && !isResettingPassword && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 border border-[#C8A2F7] rounded-lg mb-3 bg-white placeholder-[#C8A2F7] text-[#4F106E]"
          />
        )}

        {message && (
          <p className="text-red-500 text-sm mb-2 text-center">{message}</p>
        )}

        <button
          onClick={handleAuth}
          className="w-full p-3 rounded-full bg-[#C8A2F7] text-white font-medium hover:bg-[#AB43BD] transition"
        >
          {isResettingPassword
            ? "Send Magic Login Link"
            : isSigningUp
            ? "Sign Up"
            : "Sign In"}
        </button>

        {!isResettingPassword && (
          <button
            onClick={() => {
              clearMessages();
              setIsResettingPassword(true);
            }}
            className="mt-3 text-sm underline w-full hover:text-[#AB43BD] transition"
          >
            Forgot Password?
          </button>
        )}

        {isResettingPassword && (
          <p className="text-sm mt-4 text-center">
            You will receive a <span className="font-semibold">link</span> to
            access your account.
          </p>
        )}

        {!isResettingPassword && (
          <button
            onClick={() => {
              clearMessages();
              setIsSigningUp(!isSigningUp);
            }}
            className="mt-3 text-sm text-[#AB43BD] underline w-full hover:text-[#8B5CF6] transition"
          >
            {isSigningUp
              ? "Already have an account? Sign in"
              : "No account? Sign up"}
          </button>
        )}

        {isResettingPassword && (
          <button
            onClick={() => {
              clearMessages();
              setIsResettingPassword(false);
            }}
            className="mt-3 text-sm text-blue-500 underline w-full"
          >
            Back to Sign In
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-5 text-sm text-[#4F106E] underline w-full hover:text-[#6A2F8E] transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
