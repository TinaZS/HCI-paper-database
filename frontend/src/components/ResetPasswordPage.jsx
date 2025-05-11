import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setConfirmed(true);
      }
    });
  }, []);

  const handleUpdatePassword = async () => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("✅ Your password has been reset. You can now log in.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full bg-[#f3ebfc] border border-[#E5D0FA] backdrop-blur-lg p-6 rounded-xl shadow">
        <h2 className="text-2xl font-semibold text-[#4F106E] mb-4 text-center">
          Reset Your Password
        </h2>

        {confirmed ? (
          <>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-[#C8A2F7] rounded-lg mb-3 bg-white placeholder-[#C8A2F7] text-[#4F106E]"
            />
            <button
              onClick={handleUpdatePassword}
              className="w-full p-3 rounded-full bg-[#C8A2F7] text-white font-medium hover:bg-[#AB43BD] transition"
            >
              Update Password
            </button>
            {message && (
              <p className="mt-3 text-sm text-center text-[#4F106E]">
                {message}
              </p>
            )}
          </>
        ) : (
          <p className="text-[#4F106E] text-center">
            Waiting for password recovery confirmation...
          </p>
        )}
      </div>
    </div>
  );
}
