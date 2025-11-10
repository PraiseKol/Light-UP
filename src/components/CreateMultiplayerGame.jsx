import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { playSound } from "@/utils/sound";
import MGlobalChat from "@/components/MGlobalChat"; // ✅ import chat

export default function CreateMultiplayerGame({ effectsOn }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setGame, setPlayers } = useMultiplayerStore();

  const [mode, setMode] = useState("1v1");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false); // ✅ chat toggle state

  const generateToken = () => crypto.randomUUID().split("-")[0];

  const handleCreateGame = async () => {
    if (!user) {
      playSound("error", effectsOn);
      return alert("Please log in first!");
    }

    setLoading(true);
    playSound("creatingGame", effectsOn);

    try {
      const token = generateToken();

      const { data: gameUser } = await supabase
        .from("game_users")
        .select("player_name")
        .eq("user_id", user.id)
        .single();

      const playerName = gameUser?.player_name || "Unnamed";

      const { data: game, error: gameError } = await supabase
        .from("multiplayer_games")
        .insert([
          {
            token,
            mode,
            duration_seconds: duration,
            creator_id: user.id,
            status: "waiting",
          },
        ])
        .select("*")
        .single();

      if (gameError || !game)
        throw gameError || new Error("Game creation failed");

      const { data: players, error: playerError } = await supabase
        .from("multiplayer_players")
        .insert([
          {
            game_id: game.id,
            user_id: user.id,
            player_name: playerName,
            slot_number: 1,
            team_number: null,
          },
        ])
        .select("*");

      if (playerError) throw playerError;

      setGame(game);
      setPlayers(players || []);

      playSound("success", effectsOn);
      navigate(`/multiplayer/lobby/${game.id}`);
    } catch (err) {
      console.error("❌ Error creating game:", err);
      playSound("error", effectsOn);
      alert("Error creating game: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6 gap-6">
      {/* 🔹 Global Chat Section */}
      <div className="w-full lg:w-1/3 order-2 lg:order-1 relative">
        {/* 🔸 Mobile Toggle (floats above chat) */}
        <div className="lg:hidden">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="absolute -top-14 right-1 w-50% px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition text-white z-50"
          >
            {chatOpen ? "Close Chat" : "Open Chat"}
          </button>
        </div>

        {/* 🔸 Chat Box */}
        {chatOpen && (
          <div className="mt-2 max-h-[300px] lg:max-h-none overflow-y-auto border border-white/20 rounded-lg relative z-40">
            <MGlobalChat user={user} />
          </div>
        )}

        {/* 🔸 Desktop Toggle (stays below chat) */}
        <div className="hidden lg:block mt-2">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition text-white"
          >
            {chatOpen ? "Close Chat" : "Open Chat"}
          </button>
        </div>
      </div>

      {/* 🔹 Game Creation UI */}
      <div className="flex-1 flex items-center justify-center order-1 lg:order-2">
        <div className="fixed top-0 max-w-md w-full bg-white/10 rounded-2xl shadow-lg p-6 border border-white/20 text-white">
          {/* Back Button */}
          <button
            onClick={() => {
              playSound("back", effectsOn);
              navigate("/map");
            }}
            className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
          >
            ← Back
          </button>

          <h2 className="text-2xl font-bold text-center mb-6">
            Create Multiplayer Game
          </h2>

          {/* Mode Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-lg">Select Mode</h3>
            <div className="grid grid-cols-2 gap-3">
              {["1v1", "1v1v1", "1v1v1v1", "2v2"].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    playSound("select", effectsOn);
                  }}
                  className={`p-3 rounded-lg font-medium border transition-all ${
                    mode === m
                      ? "bg-blue-500 text-white border-blue-400"
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-lg">Select Duration</h3>
            <div className="grid grid-cols-3 gap-3">
              {[60, 120, 180].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    setDuration(sec);
                    playSound("select", effectsOn);
                  }}
                  className={`p-3 rounded-lg font-medium border transition-all ${
                    duration === sec
                      ? "bg-green-500 text-white border-green-400"
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  {sec / 60} min
                </button>
              ))}
            </div>
          </div>

          {/* Create Game Button */}
          <button
            onClick={handleCreateGame}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold transition-all ${
              loading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-400"
            }`}
          >
            {loading ? "Creating..." : "Create Game"}
          </button>
        </div>
      </div>
    </div>
  );
}
