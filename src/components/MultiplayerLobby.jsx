import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "lib/supabaseClient";
import { useMultiplayerStore } from "store/useMultiplayerStore";
import { useAuth } from "auth/AuthProvider";

export default function MultiplayerLobby() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { game, players = [], setPlayers, setGame } = useMultiplayerStore();

  const joinUrl = game ? `${window.location.origin}/multiplayer/join/${game.token}` : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl);
    alert("Join link copied!");
  };

  const slotCountMap = {
    "1v1": 2,
    "1v1v1": 3,
    "1v1v1v1": 4,
    "2v2": 4
  };
  const totalSlots = slotCountMap[game?.mode] || 2;

  // Initial fetch
  useEffect(() => {
    const loadLobbyData = async () => {
      const { data: gameData } = await supabase
        .from("multiplayer_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (gameData) setGame(gameData);

      const { data: playerData } = await supabase
        .from("multiplayer_players")
        .select("*")
        .eq("game_id", gameId);

      setPlayers(Array.isArray(playerData) ? playerData : []);
    };

    loadLobbyData();
  }, [gameId, setGame, setPlayers]);

  // Realtime subscription — always fetch fresh list
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`lobby-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "multiplayer_players",
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          console.log("📢 Realtime payload:", payload);

          const { data: updatedPlayers, error } = await supabase
            .from("multiplayer_players")
            .select("*")
            .eq("game_id", gameId);

          if (error) {
            console.error("❌ Failed to fetch updated players:", error);
          } else {
            setPlayers(Array.isArray(updatedPlayers) ? updatedPlayers : []);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`✅ Live updates active for lobby-${gameId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, setPlayers]);

  const handleJoinSlot = async (slot) => {
    const existing = Array.isArray(players)
      ? players.find((p) => p.user_id === user.id)
      : null;

    if (existing?.slot_number === slot) return;

    const { data: gameUser } = await supabase
      .from("game_users")
      .select("player_name")
      .eq("user_id", user.id)
      .single();

    const playerName = gameUser?.player_name || "Unnamed";

    if (existing) {
      await supabase
        .from("multiplayer_players")
        .update({ slot_number: slot })
        .eq("id", existing.id);
    } else {
      await supabase.from("multiplayer_players").insert([
        {
          game_id: game.id,
          user_id: user.id,
          player_name: playerName,
          slot_number: slot,
          team_number: null
        }
      ]);
    }
  };

  const handleStartGame = async () => {
    if (players.filter((p) => p.slot_number).length < totalSlots) return;

    await supabase
      .from("multiplayer_games")
      .update({ status: "in_progress" })
      .eq("id", gameId);

    navigate(`/multiplayer/game/${gameId}`);
  };

  if (!game) return <div>Loading lobby...</div>;

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-center mb-2">
        {game.mode} Lobby - {game.token}
      </h2>
      <p className="text-center text-sm text-gray-500 mb-4">
        Duration: {game.duration_seconds / 60} min
      </p>

      <input
        type="text"
        value={joinUrl}
        readOnly
        className="border px-2 py-1 rounded w-full text-center text-sm mb-2"
      />
      <button
        onClick={copyToClipboard}
        className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
      >
        Copy Join Link
      </button>

      <div className="border rounded p-4 mb-4">
        <h3 className="font-semibold mb-2">Slots</h3>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: totalSlots }).map((_, index) => {
            const slotNum = index + 1;
            const occupant = Array.isArray(players)
              ? players.find((p) => p.slot_number === slotNum)
              : null;
            const isMe = occupant?.user_id === user.id;
            return (
              <button
                key={slotNum}
                onClick={() => handleJoinSlot(slotNum)}
                className={`p-3 border rounded ${
                  occupant
                    ? isMe
                      ? "bg-yellow-200 hover:bg-yellow-300"
                      : "bg-gray-300 cursor-not-allowed"
                    : "bg-green-100 hover:bg-green-200"
                }`}
                disabled={!!occupant && !isMe}
              >
                {occupant ? occupant.player_name : `Join Slot ${slotNum}`}
              </button>
            );
          })}
        </div>
      </div>

      {game.creator_id === user?.id && (
        <button
          onClick={handleStartGame}
          disabled={
            Array.isArray(players)
              ? players.filter((p) => p.slot_number).length < totalSlots
              : true
          }
          className={`w-full py-2 rounded text-white ${
            Array.isArray(players) &&
            players.filter((p) => p.slot_number).length >= totalSlots
              ? "bg-green-500 hover:bg-green-600"
              : "bg-gray-400"
          }`}
        >
          Start Game
        </button>
      )}
    </div>
  );
}
