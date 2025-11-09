import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "auth/AuthProvider";
import { useMultiplayerStore } from "store/useMultiplayerStore";

export default function JoinMultiplayerGame() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setGame, setPlayers } = useMultiplayerStore();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadGame = async () => {
      if (!user) {
        setErrorMessage("Please log in first to view a game lobby.");
        setLoading(false);
        return;
      }

      try {
        // Get game by token
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

        // Fetch current players
        const { data: playerList, error: playerError } = await supabase
          .from("multiplayer_players")
          .select("*")
          .eq("game_id", gameData.id);

        if (playerError) throw playerError;
        setPlayers(playerList || []);

        // Navigate to lobby so they can choose slot
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <p className="text-white text-lg font-medium animate-pulse">
          Preparing your cave...
        </p>
      </div>
    );
  }
  
  if (errorMessage) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <p className="text-red-500 text-lg font-semibold border border-red-500 px-4 py-2 rounded-lg shadow-lg">
          {errorMessage}
        </p>
      </div>
    );
  }
  

  return null;
}
