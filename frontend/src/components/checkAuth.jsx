import React, { useState } from "react";
import { useAuth } from "../AuthContext";

export default function AuthStatus() {
  const { token } = useAuth();
  const [status, setStatus] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const checkAuthStatus = async () => {
    if (!token) {
      console.error("No token available");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`✅ Authenticated as User ID: ${data.user_id}`);
      } else {
        setStatus(`❌ Authentication Failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setStatus("❌ Error checking authentication");
    }
  };

  return (
    <div>
      <button
        onClick={checkAuthStatus}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Check Auth Status
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}
