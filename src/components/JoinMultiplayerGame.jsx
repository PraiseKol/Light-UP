import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { Loader2, AlertCircle } from "lucide-react";

export default function JoinMultiplayerGame() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setGame, setPlayers } = useMultiplayerStore();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Generate twinkling stars
  const stars = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    size: Math.random() * 2 + 1,
  }));

  useEffect(() => {
    const loadGame = async () => {
      if (!user) {
        setErrorMessage("Please log in first to view a game lobby.");
        setLoading(false);
        return;
      }

      try {
        const { data: gameData, error: gameError } = await supabase
          .from("multiplayer_games")
          .select("*")
          .eq("token", token)
          .single();

        if (gameError || !gameData) {
          setErrorMessage("Game not found.");
          setLoading(false);
          return;
        }

        setGame(gameData);

        const { data: playerList, error: playerError } = await supabase
          .from("multiplayer_players")
          .select("*")
          .eq("game_id", gameData.id);

        if (playerError) throw playerError;
        setPlayers(playerList || []);

        navigate(`/multiplayer/lobby/${gameData.id}`);
      } catch (err) {
        console.error("❌ Error loading game:", err);
        setErrorMessage("Error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [token, user, navigate, setGame, setPlayers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen relative overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900">
        {/* Animated Stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{
                left: star.left,
                top: star.top,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: star.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 shadow-[0_0_30px_rgba(236,72,153,0.5)] flex items-center justify-center mb-6 animate-pulse">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-pink-300 shadow-[0_8px_0_#be185d,0_12px_20px_rgba(190,24,93,0.4)] px-8 py-6 text-center">
            <p className="text-lg font-bold text-gray-800">
              Preparing your arena...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Getting everything ready for battle!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center h-screen relative overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900">
        {/* Animated Stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{
                left: star.left,
                top: star.top,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: star.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-red-300 shadow-[0_8px_0_#dc2626,0_12px_20px_rgba(220,38,38,0.4)] px-8 py-6 text-center max-w-sm">
            <p className="text-lg font-bold text-gray-800 mb-2">
              Oops! Something went wrong
            </p>
            <p className="text-sm text-red-600 font-medium">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate("/map")}
              className="mt-4 px-6 py-2 bg-gradient-to-b from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-sm font-semibold text-gray-700 transition-all shadow-[0_3px_0_#9ca3af] active:translate-y-1 active:shadow-none"
            >
              Back to Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
