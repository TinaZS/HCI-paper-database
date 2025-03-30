import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AuthModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); // ✅ Store messages (error/success)
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  function clearMessages() {
    setMessage(""); // ✅ Clear messages when switching modes
  }

  async function handleAuth() {
    setMessage(""); // ✅ Clear previous messages before new request

    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }

    if (isResettingPassword) {
      // ✅ Handle Magic Link Request
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "A magic login link has been sent to your email. Use it to access your account without a password."
      );
      return;
    }

    if (!password.trim()) {
      setMessage("Password is required.");
      return;
    }

    if (isSigningUp) {
      // ✅ Handle Sign Up
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "A confirmation link has been sent to your email. If you don’t receive it, you may already have an account. Try sign in or forgot password instead."
      );
    } else {
      // ✅ Handle Sign In
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(
          "Invalid credentials. Please check your email or try the magic link."
        );
        return;
      }

      onClose(); // ✅ Close modal after successful login
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#F5EDE3] text-[#3E3232] font-serif p-8 rounded-xl shadow-2xl w-96">
        <h2 className="text-xl font-semibold mb-4">
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
          className="w-full p-3 border border-[#8E7965] rounded-md mb-3 bg-white placeholder-gray-400"
        />

        {!isResettingPassword && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-[#8E7965] rounded-md mb-3 bg-white placeholder-gray-400"
          />
        )}

        {message && <p className="text-red-500 text-sm mb-2">{message}</p>}

        <button
          onClick={handleAuth}
          className="w-full p-3 rounded-md bg-[#A68C7C] text-white font-semibold hover:bg-[#8E7965] transition duration-200"
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
            className="mt-3 text-sm text-[#5C4B3B] underline w-full hover:text-[#3E3232] transition duration-150"
          >
            Forgot Password?
          </button>
        )}

        {isResettingPassword && (
          <p className="text-gray-600 text-sm mt-2 text-center">
            Supabase does not support traditional password resets. Instead, we
            send you a **magic login link**. Use it to access your account
            without a password.
          </p>
        )}

        {!isResettingPassword && (
          <button
            onClick={() => {
              clearMessages();
              setIsSigningUp(!isSigningUp);
            }}
            className="mt-2 text-sm text-blue-500 underline w-full"
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
            className="mt-2 text-sm text-blue-500 underline w-full"
          >
            Back to Sign In
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 underline w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
}
