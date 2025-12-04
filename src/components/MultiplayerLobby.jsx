import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { useAuth } from "@/auth/AuthProvider";
import Switch from "@/components/ui/Switch";
import { playSound } from "@/utils/sound";
import GlobalChat from "@/components/GlobalChat";
import { ArrowLeft, Copy, Users, Zap, Play, MessageCircle, X, Crown, Lock } from "lucide-react";

export default function MultiplayerLobby({ effectsOn }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { game, players = [], setPlayers, setGame } = useMultiplayerStore();

  const [allowPowerups, setAllowPowerups] = useState(true);
  const isCreator = user?.id === game?.creator_id;
  const [isChatOpen, setIsChatOpen] = useState(false);

  const joinUrl = game
    ? `${window.location.origin}/multiplayer/join/${game.token}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl);
    playSound("click", effectsOn);
    alert("Join link copied!");
  };

  const slotCountMap = {
    "1v1": 2,
    "1v1v1": 3,
    "1v1v1v1": 4,
    "2v2": 4,
  };
  const totalSlots = slotCountMap[game?.mode] || 2;
  const filledSlots = players.filter((p) => p.slot_number).length;
  const allSlotsFilled = filledSlots >= totalSlots;

  // Generate twinkling stars
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    size: Math.random() * 2 + 1,
  }));

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
      if (gameData) {
        setGame(gameData);
        setAllowPowerups(gameData.allow_powerups ?? true);
      }

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
          setAllowPowerups(updatedGame.allow_powerups ?? true);

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

  const handleTogglePowerups = async (newValue) => {
    if (!isCreator) return;
    playSound("switch", effectsOn);
    setAllowPowerups(newValue);

    const { error } = await supabase
      .from("multiplayer_games")
      .update({ allow_powerups: newValue })
      .eq("id", gameId)
      .select();

    if (error) {
      playSound("error", effectsOn);
      console.error("❌ Failed to toggle power-ups:", error);
    }
  };

  const handleJoinSlot = async (slot) => {
    if (filledSlots >= totalSlots) {
      playSound("success", effectsOn);
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
    playSound("click", effectsOn);

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
    if (!allSlotsFilled) return;
    playSound("creatingGame", effectsOn);
    await supabase
      .from("multiplayer_games")
      .update({ status: "starting" })
      .eq("id", gameId);
  };

  const handleBack = async () => {
    try {
      if (user?.id === game?.creator_id) {
        playSound("back", effectsOn);
        await supabase
          .from("multiplayer_players")
          .delete()
          .eq("game_id", gameId);
        await supabase.from("multiplayer_games").delete().eq("id", gameId);
        navigate(-1);
      } else {
        playSound("back", effectsOn);
        await supabase
          .from("multiplayer_players")
          .delete()
          .eq("game_id", gameId)
          .eq("user_id", user.id);
        navigate("/multiplayer/create");
      }
    } catch (err) {
      playSound("error", effectsOn);
      console.error("❌ Error leaving game:", err);
    }
  };

  if (!game) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-pink-300 shadow-lg px-8 py-6 text-center">
          <div className="w-8 h-8 border-3 border-pink-300 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="font-bold text-gray-800">Preparing your lobby...</p>
        </div>
      </div>
    );
  }

  const renderSlotButton = (slotNum, teamColor = null) => {
    const occupant = players.find((p) => p.slot_number === slotNum);
    const isMe = occupant?.user_id === user.id;
    
    const baseColors = teamColor === "blue" 
      ? "from-blue-400 to-blue-500 shadow-[0_4px_0_#1d4ed8]"
      : teamColor === "red"
      ? "from-red-400 to-red-500 shadow-[0_4px_0_#dc2626]"
      : "from-green-400 to-green-500 shadow-[0_4px_0_#166534]";

    return (
      <button
        key={slotNum}
        onClick={() => handleJoinSlot(slotNum)}
        disabled={!!occupant && !isMe}
        className={`w-full p-4 rounded-xl transition-all duration-300 ${
          occupant
            ? isMe
              ? "bg-gradient-to-b from-yellow-300 to-yellow-400 text-gray-800 shadow-[0_4px_0_#ca8a04] border-2 border-yellow-500"
              : "bg-gradient-to-b from-gray-300 to-gray-400 text-gray-600 shadow-[0_4px_0_#6b7280] cursor-not-allowed"
            : `bg-gradient-to-b ${baseColors} text-white hover:scale-105 active:translate-y-1 active:shadow-none`
        }`}
      >
        {occupant ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center text-xl font-black mb-1 border-2 border-white/50">
              {occupant.player_name.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-sm">{occupant.player_name}</span>
            {isMe && <span className="text-xs opacity-75">(You)</span>}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-1 border-2 border-dashed border-white/50">
              <Users className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm">Join Slot {slotNum}</span>
          </div>
        )}
      </button>
    );
  };

  const renderSlots = () => {
    if (game.mode === "2v2") {
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-b from-blue-500/20 to-blue-600/20 p-4 rounded-xl border-2 border-blue-400/50">
            <h3 className="text-blue-300 font-black mb-3 text-center flex items-center justify-center gap-2">
              <Crown className="w-4 h-4" /> Team A
            </h3>
            <div className="space-y-3">
              {[1, 2].map((slotNum) => renderSlotButton(slotNum, "blue"))}
            </div>
          </div>
          <div className="bg-gradient-to-b from-red-500/20 to-red-600/20 p-4 rounded-xl border-2 border-red-400/50">
            <h3 className="text-red-300 font-black mb-3 text-center flex items-center justify-center gap-2">
              <Crown className="w-4 h-4" /> Team B
            </h3>
            <div className="space-y-3">
              {[3, 4].map((slotNum) => renderSlotButton(slotNum, "red"))}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className={`grid grid-cols-${Math.min(totalSlots, 2)} gap-3`}>
          {Array.from({ length: totalSlots }).map((_, idx) =>
            renderSlotButton(idx + 1)
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl mx-auto p-4 md:p-6 relative z-10 flex-1">
        {/* Lobby Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-pink-300 shadow-[0_8px_0_#be185d,0_12px_20px_rgba(190,24,93,0.4)] p-4 md:p-6 order-1 lg:order-2 lg:col-span-2">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="mb-4 px-4 py-2 bg-gradient-to-b from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-sm font-semibold text-gray-700 transition-all shadow-[0_3px_0_#9ca3af] active:translate-y-1 active:shadow-none flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {isCreator ? "Cancel Game" : "Leave Lobby"}
          </button>

          {/* Lobby Header */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-black text-gray-800">
              {game.mode} Lobby
            </h2>
            <p className="text-sm text-gray-500">
              {game.duration_seconds / 60} minute match
            </p>
            <div className="inline-block mt-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
              <span className="text-xs font-mono text-purple-700">
                Code: {game.token}
              </span>
            </div>
          </div>

          {/* Join Link */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={joinUrl}
              readOnly
              className="flex-1 bg-gray-100 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono"
            />
            <button
              onClick={copyToClipboard}
              className="px-6 py-3 bg-gradient-to-b from-blue-400 to-blue-500 text-white rounded-xl hover:from-blue-500 hover:to-blue-600 font-bold shadow-[0_4px_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>

          {/* Power-ups Toggle */}
          <div className="flex items-center justify-between mb-6 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <span className="font-semibold text-gray-700 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Allow Power-ups
            </span>
            <div className="flex items-center gap-2">
              <Switch
                checked={allowPowerups}
                onChange={handleTogglePowerups}
                disabled={!isCreator}
              />
              {!isCreator && <Lock className="w-4 h-4 text-gray-400" />}
            </div>
          </div>

          {/* Slots Section */}
          <div className="mb-6">
            <h3 className="text-center font-black text-gray-700 mb-3 flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-pink-500" />
              Players ({filledSlots}/{totalSlots})
            </h3>
            {renderSlots()}
          </div>

          {/* Start Game Button */}
          {isCreator && (
            <button
              onClick={handleStartGame}
              disabled={!allSlotsFilled}
              className={`w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                allSlotsFilled
                  ? "bg-gradient-to-b from-green-400 to-green-500 text-white shadow-[0_6px_0_#166534] hover:from-green-500 hover:to-green-600 active:translate-y-1 active:shadow-[0_2px_0_#166534] animate-pulse"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
              }`}
            >
              <Play className="w-5 h-5" />
              {allSlotsFilled ? "Start Game!" : `Waiting for ${totalSlots - filledSlots} more...`}
            </button>
          )}
        </div>

        {/* Desktop Chat */}
        <div className="hidden lg:block bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-pink-300 shadow-[0_8px_0_#be185d,0_12px_20px_rgba(190,24,93,0.4)] overflow-hidden order-2 lg:order-1 h-[calc(100vh-3rem)]">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="font-bold text-white">Lobby Chat</span>
          </div>
          <div className="h-[calc(100%-52px)]">
            <GlobalChat user={user} gameId={gameId} effectsOn={effectsOn} />
          </div>
        </div>
      </div>

      {/* Mobile Chat Toggle */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-[0_4px_0_#7c3aed,0_8px_16px_rgba(124,58,237,0.4)] flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#7c3aed]"
      >
        {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Mobile Chat Overlay */}
      {isChatOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 h-[60vh] bg-white/95 backdrop-blur-xl rounded-t-3xl border-t-2 border-x-2 border-pink-300 shadow-[0_-8px_20px_rgba(190,24,93,0.3)]">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-3 rounded-t-3xl flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Lobby Chat
            </span>
            <button onClick={() => setIsChatOpen(false)} className="text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[calc(100%-52px)]">
            <GlobalChat user={user} gameId={gameId} effectsOn={effectsOn} />
          </div>
        </div>
      )}
    </div>
  );
}
