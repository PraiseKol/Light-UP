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
      navigate(`/multiplayer/game/${gameId}`, { replace: true });
    }
  }, [game?.status, gameId, navigate]);

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

  useEffect(() => {
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
        async () => {
          const { data: updatedPlayers } = await supabase
            .from("multiplayer_players")
            .select("*")
            .eq("game_id", gameId);
          setPlayers(Array.isArray(updatedPlayers) ? updatedPlayers : []);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(playerChannel);
  }, [gameId, setPlayers]);

  useEffect(() => {
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
          const updatedGame = payload.new;
          setGame(updatedGame);
          if (
            updatedGame.status === "in_progress" ||
            updatedGame.status === "starting"
          ) {
            navigate(`/multiplayer/game/${gameId}`, {
              state: { startAt: updatedGame.start_at },
              replace: true,
            });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(gameChannel);
  }, [gameId, setGame, navigate]);

  const handleJoinSlot = async (slot) => {
    const filledSlots = Array.isArray(players)
      ? players.filter((p) => p.slot_number).length
      : 0;

    if (filledSlots >= totalSlots) {
      alert("Game Full");
      return;
    }

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
          team_number: null,
        },
      ]);
    }
  };

  const handleStartGame = async () => {
    if (players.filter((p) => p.slot_number).length < totalSlots) return;

    await supabase
      .from("multiplayer_games")
      .update({
        status: "starting",
      })
      .eq("id", gameId);
  };

  const handleBack = async () => {
    try {
      if (user?.id === game?.creator_id) {
        // Creator: delete whole game & players, go back one step
        await supabase.from("multiplayer_players").delete().eq("game_id", gameId);
        await supabase.from("multiplayer_games").delete().eq("id", gameId);
        navigate(-1);
      } else {
        // Non-creator: delete only self, go to Create Multiplayer Game page
        await supabase
          .from("multiplayer_players")
          .delete()
          .eq("game_id", gameId)
          .eq("user_id", user.id);
        navigate("/multiplayer/create");
      }
    } catch (err) {
      console.error("❌ Error leaving game:", err);
    }
  };

  if (!game) return <div className="text-center mt-20">Preparing your lobby...</div>;

  const renderSlots = () => {
    if (game.mode === "2v2") {
      return (
        <div className="grid grid-cols-2 gap-6">
          {/* Team A */}
          <div className="bg-blue-900/30 p-4 rounded-xl">
            <h3 className="text-blue-300 font-semibold mb-3 text-center">
              Team A
            </h3>
            <div className="space-y-3">
              {[1, 2].map((slotNum) => renderSlotButton(slotNum))}
            </div>
          </div>
          {/* Team B */}
          <div className="bg-red-900/30 p-4 rounded-xl">
            <h3 className="text-red-300 font-semibold mb-3 text-center">
              Team B
            </h3>
            <div className="space-y-3">
              {[3, 4].map((slotNum) => renderSlotButton(slotNum))}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className={`grid grid-cols-${totalSlots} gap-3`}>
          {Array.from({ length: totalSlots }).map((_, idx) =>
            renderSlotButton(idx + 1)
          )}
        </div>
      );
    }
  };

  const renderSlotButton = (slotNum) => {
    const occupant = players.find((p) => p.slot_number === slotNum);
    const isMe = occupant?.user_id === user.id;
    return (
      <button
        key={slotNum}
        onClick={() => handleJoinSlot(slotNum)}
        disabled={!!occupant && !isMe}
        className={`w-full p-3 rounded-lg border transition-all duration-300 ${
          occupant
            ? isMe
              ? "bg-yellow-400 text-black border-yellow-500"
              : "bg-gray-500 text-white border-gray-600 cursor-not-allowed"
            : "bg-green-500/20 text-green-200 border-green-400 hover:bg-green-500 hover:text-white"
        }`}
      >
        {occupant ? (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
              {occupant.player_name.charAt(0).toUpperCase()}
            </div>
            <span className="mt-1 text-sm">{occupant.player_name}</span>
          </div>
        ) : (
          <span>Join Slot {slotNum}</span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-xl w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-white/20">
        
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
        >
          ← Back
        </button>

        {/* Lobby Header */}
        <h2 className="text-2xl font-bold text-center mb-1">
          {game.mode} Lobby • {game.duration_seconds / 60} min
        </h2>
        <p className="text-center text-sm text-gray-300 mb-4">
          Match Code: <span className="font-mono">{game.token}</span> 
        </p>

        {/* Join Link */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={joinUrl}
            readOnly
            className="flex-1 bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-400 text-sm font-medium"
          >
            Copy
          </button>
        </div>

        {/* Slots */}
        {renderSlots()}

        {/* Start Game Button */}
        {game.creator_id === user?.id && (
          <button
            onClick={handleStartGame}
            disabled={
              players.filter((p) => p.slot_number).length < totalSlots
            }
            className={`w-full mt-6 py-3 rounded-lg font-semibold transition-all ${
              players.filter((p) => p.slot_number).length >= totalSlots
                ? "bg-green-500 hover:bg-green-400"
                : "bg-gray-500 cursor-not-allowed"
            }`}
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
