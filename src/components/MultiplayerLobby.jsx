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

  const joinUrl = game
    ? `${window.location.origin}/multiplayer/join/${game.token}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl);
    alert("Join link copied!");
  };

  const slotCountMap = {
    "1v1": 2,
    "1v1v1": 3,
    "1v1v1v1": 4,
    "2v2": 4,
  };
  const totalSlots = slotCountMap[game?.mode] || 2;

  useEffect(() => {
    if (game?.status === "in_progress" || game?.status === "starting") {
      console.log("[DEBUG] Game already started or starting — redirecting to game.");
      navigate(`/multiplayer/game/${gameId}`, { replace: true });
    }
  }, [game?.status, gameId, navigate]);

  useEffect(() => {
    const loadLobbyData = async () => {
      console.log("[DEBUG] Loading initial lobby data...");
      const { data: gameData, error: gameError } = await supabase
        .from("multiplayer_games")
        .select("*")
        .eq("id", gameId)
        .single();
      if (gameError) console.error("[DEBUG] Game fetch error:", gameError);
      if (gameData) {
        console.log("[DEBUG] Game data loaded:", gameData);
        setGame(gameData);
      }

      const { data: playerData, error: playerError } = await supabase
        .from("multiplayer_players")
        .select("*")
        .eq("game_id", gameId);
      if (playerError) console.error("[DEBUG] Players fetch error:", playerError);
      console.log("[DEBUG] Players data loaded:", playerData);
      setPlayers(Array.isArray(playerData) ? playerData : []);
    };

    loadLobbyData();
  }, [gameId, setGame, setPlayers]);

  useEffect(() => {
    if (!gameId) return;
    console.log("[DEBUG] Subscribing to lobby players channel...");

    const playerChannel = supabase
      .channel(`lobby-players-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "multiplayer_players",
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          console.log("[DEBUG] Players change detected:", payload);
          const { data: updatedPlayers, error } = await supabase
            .from("multiplayer_players")
            .select("*")
            .eq("game_id", gameId);
          if (error) console.error("[DEBUG] Error fetching updated players:", error);
          else {
            console.log("[DEBUG] Updated players list:", updatedPlayers);
            setPlayers(Array.isArray(updatedPlayers) ? updatedPlayers : []);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
    };
  }, [gameId, setPlayers]);

  useEffect(() => {
    if (!gameId) return;
    console.log("[DEBUG] Subscribing to lobby game channel...");

    const gameChannel = supabase
      .channel(`lobby-game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "multiplayer_games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log("[DEBUG] Game status change detected:", payload);
          const updatedGame = payload.new;
          setGame(updatedGame);

          if (updatedGame.status === "in_progress" || updatedGame.status === "starting") {
            console.log("[DEBUG] Redirecting to game page...");
            navigate(`/multiplayer/game/${gameId}`, {
              state: { startAt: updatedGame.start_at },
              replace: true,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId, setGame, navigate]);

  const handleJoinSlot = async (slot) => {
    console.log("[DEBUG] Attempting to join slot:", slot);
    const filledSlots = Array.isArray(players)
      ? players.filter((p) => p.slot_number).length
      : 0;
    console.log("[DEBUG] Filled slots:", filledSlots, "/", totalSlots);

    if (filledSlots >= totalSlots) {
      alert("Game Full");
      return;
    }

    const existing = Array.isArray(players)
      ? players.find((p) => p.user_id === user.id)
      : null;

    if (existing?.slot_number === slot) {
      console.log("[DEBUG] Already in this slot.");
      return;
    }

    const { data: gameUser, error: gameUserError } = await supabase
      .from("game_users")
      .select("player_name")
      .eq("user_id", user.id)
      .single();
    if (gameUserError) console.error("[DEBUG] Error fetching player name:", gameUserError);

    const playerName = gameUser?.player_name || "Unnamed";

    if (existing) {
      console.log("[DEBUG] Updating existing player slot...");
      await supabase
        .from("multiplayer_players")
        .update({ slot_number: slot })
        .eq("id", existing.id);
    } else {
      console.log("[DEBUG] Adding new player to slot...");
      await supabase.from("multiplayer_players").insert([
        {
          game_id: game.id,
          user_id: user.id,
          player_name: playerName,
          slot_number: slot,
          team_number: null,
        },
      ]);
    }
  };

  const handleStartGame = async () => {
    console.log("[DEBUG] Start Game button clicked.");
    if (players.filter((p) => p.slot_number).length < totalSlots) {
      console.log("[DEBUG] Not enough players to start.");
      return;
    }

    console.log("[DEBUG] Updating game status to 'starting'...");
    const { error } = await supabase
      .from("multiplayer_games")
      .update({
        status: "starting",
      })
      .eq("id", gameId);

    if (error) console.error("[DEBUG] Error setting starting status:", error);
    else console.log("[DEBUG] Starting countdown triggered successfully.");
  };

  if (!game) return <div>Preparing your cave...</div>;

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
                {occupant
                  ? occupant.player_name
                  : `Join Slot ${slotNum}`}
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
