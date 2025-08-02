import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "lib/supabaseClient";
import { useAuth } from "auth/AuthProvider";
import { useMultiplayerStore } from "store/useMultiplayerStore";

export default function CreateMultiplayerGame() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setGame, setPlayers } = useMultiplayerStore();

  const [mode, setMode] = useState("1v1");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  const generateToken = () => crypto.randomUUID().split("-")[0];

  const handleCreateGame = async () => {
    if (!user) return alert("Please log in first!");
    setLoading(true);

    try {
      const token = generateToken();

      // Fetch player_name from game_users
      const { data: gameUser } = await supabase
        .from("game_users")
        .select("player_name")
        .eq("user_id", user.id)
        .single();

      const playerName = gameUser?.player_name || "Unnamed";

      // 1️⃣ Insert into multiplayer_games
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

      if (gameError || !game) throw gameError || new Error("Game creation failed");

      // 2️⃣ Add creator to multiplayer_players
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

      // 3️⃣ Save to Zustand store
      setGame(game);
      setPlayers(players || []);

      // 4️⃣ Navigate to Lobby
      navigate(`/multiplayer/lobby/${game.id}`);
    } catch (err) {
      console.error("❌ Error creating game:", err);
      alert("Error creating game: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Create Multiplayer Game</h2>

      {/* Mode Selection */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Select Mode</h3>
        <div className="grid grid-cols-2 gap-3">
          {["1v1", "1v1v1", "1v1v1v1", "2v2"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`border rounded-lg p-3 font-medium ${
                mode === m ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Duration Selection */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Select Duration</h3>
        <div className="grid grid-cols-3 gap-3">
          {[60, 120, 180].map((sec) => (
            <button
              key={sec}
              onClick={() => setDuration(sec)}
              className={`border rounded-lg p-3 font-medium ${
                duration === sec
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300"
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
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Game"}
      </button>
    </div>
  );
}
