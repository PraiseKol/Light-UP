import { useState } from "react";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // Get admin user by email
      const { data: admin, error: fetchError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("email", email)
        .single();

      if (fetchError || !admin) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Compare entered password with stored hash
      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Save admin session to localStorage
      localStorage.setItem("adminSession", JSON.stringify({
        id: admin.id,
        email: admin.email,
        created_at: admin.created_at
      }));

      // Redirect to Admin Dashboard
      navigate("/admin/dashboard");

    } catch (err) {
      console.error("❌ Admin login error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto bg-white rounded shadow text-center">
      <h1 className="text-xl font-bold mb-4">LIGHT UP 💡</h1>
      <h2 className="text-xl font-bold mb-4">Admin Login</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}

      <input
        type="email"
        placeholder="Email"
        className="w-full border px-3 py-2 mb-3 rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border px-3 py-2 mb-4 rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
