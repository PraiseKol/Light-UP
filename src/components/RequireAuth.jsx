// src/components/RequireAuth.jsx
import { useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { useNavigate } from "react-router-dom";

export default function RequireAuth({ children }) {
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user === null) {
      navigate("/signin", { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null; // Optional: show spinner here

  return children;
}
