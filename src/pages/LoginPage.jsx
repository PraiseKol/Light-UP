import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "lib/supabaseClient";

export default function LoginPage() {
  const { login } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkInviteCode = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("validate_invite_code", {
      code_input: inviteCode.trim(),
    });

    if (error || !data?.valid) {
      setStatus("invalid");
    } else {
      setStatus("valid");
      setRemaining(data.remaining);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (status !== "valid") return;

    // ✅ Consume invite code in DB
    await supabase.rpc("use_invite_code", {
      code_input: inviteCode.trim(),
    });

    // ✅ Then trigger Google sign-in
    login();
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-yellow-300 via-blue-100 to-white text-charcoal">
      <div
        className="
    backdrop-blur-xl 
    bg-gold/10 
    border border-black 
    rounded-2xl  
    shadow-2xl 
    p-6 sm:p-4 md:p-6   // 👈 smaller padding on mobile, larger on bigger screens
    max-w-sm sm:max-w-md md:max-w-lg // 👈 narrower width on mobile
    w-full 
    text-center 
    animate-fadeIn
  "
      >
        <h1 className="text-4xl font-extrabold flex items-center justify-center gap-2">
          💡 <span className="text-blue-700 drop-shadow-lg">LightUP</span> Game
          App 🎮
        </h1>

        <div className="mt-6 mb-4">
          <label className="text-2xl text-gray-700 mb-1 block font-medium">
            Invite Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="flex-1 border border-blue-400 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="Your Invite Code"
            />
            <button
              disabled={!inviteCode || loading}
              onClick={checkInviteCode}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 disabled:opacity-50"
            >
              {loading ? "..." : "Check"}
            </button>
          </div>

          {status === "valid" && (
            <p className="text-sm text-green-600 mt-1">
              ✅ Code valid — {remaining} use(s) left
            </p>
          )}
          {status === "invalid" && (
            <p className="text-sm text-red-500 mt-1">
              ❌ Invalid or expired code
            </p>
          )}
        </div>

        <button
          onClick={handleLogin}
          disabled={status !== "valid"}
          className={`mt-8 px-8 py-3 rounded-full text-lg font-semibold shadow-lg transition-all duration-300 ${
            status === "valid"
              ? "bg-gold text-black hover:shadow-goldGlow hover:scale-105"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
          }`}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
