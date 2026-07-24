import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

export default function AdminRoute({ children }) {
  const { user, authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setChecking(false);
        return;
      }
      const { data, error } = await supabase
        .from("game_users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setIsAdmin(!error && ["admin", "super_admin"].includes(data?.role));
      setChecking(false);
    };
    if (!authLoading) checkRole();
  }, [user, authLoading]);

  if (authLoading || checking) return null; // TODO: swap in a loading spinner if desired

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
