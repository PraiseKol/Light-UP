import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { playSound } from "@/utils/sound";
import MGlobalChat from "@/components/MGlobalChat";
import { ArrowLeft, Gamepad2, Clock, Sparkles, MessageCircle, X, Ticket } from "lucide-react";
import { toast } from "sonner";

export default function CreateMultiplayerGame({ effectsOn }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setGame, setPlayers } = useMultiplayerStore();

  const [mode, setMode] = useState("1v1");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const generateToken = () => crypto.randomUUID().split("-")[0];

  const handleCreateGame = async () => {
    if (!user) {
      playSound("error", effectsOn);
      return toast.error("Please log in first!");
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
      toast.error("Error creating game: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = () => {
    const code = joinCode.trim();
    if (!code) {
      playSound("error", effectsOn);
      return toast.error("Enter a game code first");
    }
    playSound("click", effectsOn);
    navigate(`/multiplayer/join/${code}`);
  };

  // Generate twinkling stars
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    size: Math.random() * 2 + 1,
  }));

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900">
      {/* Animated Stars Background */}
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

      <div className="flex flex-col lg:flex-row p-4 md:p-6 gap-4 md:gap-6 relative z-10 flex-1">
        {/* Chat Section (Desktop) */}
        <div className="hidden lg:block w-1/3 order-1">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-pink-300 shadow-[0_8px_0_#be185d,0_12px_20px_rgba(190,24,93,0.4)] h-[calc(100vh-3rem)] overflow-hidden">
            <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-3 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="font-bold text-white">Global Chat</span>
            </div>
            <div className="h-[calc(100%-52px)]">
              <MGlobalChat user={user} />
            </div>
          </div>
        </div>

        {/* Game Creation UI */}
        <div className="flex-1 flex items-start lg:items-center justify-center order-2">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-pink-300 shadow-[0_8px_0_#be185d,0_12px_20px_rgba(190,24,93,0.4)] p-5 md:p-6">
            {/* Back Button */}
            <button
              onClick={() => {
                playSound("back", effectsOn);
                navigate("/map");
              }}
              className="mb-4 px-4 py-2 bg-gradient-to-b from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-sm font-semibold text-gray-700 transition-all shadow-[0_3px_0_#9ca3af] active:translate-y-1 active:shadow-none flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Map
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg mb-3">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-800">
                Create Multiplayer Game
              </h2>
              <p className="text-sm text-gray-500 mt-1">Challenge your friends!</p>
            </div>

            {/* Join with Code */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 text-gray-700 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-blue-500" />
                Have a Game Code?
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
                  placeholder="Enter code"
                  className="flex-1 bg-gray-100 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-gray-700 tracking-wider uppercase outline-none focus:border-blue-400 transition-colors"
                />
                <button
                  onClick={handleJoinGame}
                  className="px-5 py-3 bg-gradient-to-b from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-bold shadow-[0_4px_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-all"
                >
                  Join
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-bold text-gray-400 uppercase">or start a new game</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Mode Selection */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 text-gray-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500" />
                Select Mode
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {["1v1", "1v1v1", "1v1v1v1", "2v2"].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      playSound("select", effectsOn);
                    }}
                    className={`p-3 rounded-xl font-bold transition-all ${
                      mode === m
                        ? "bg-gradient-to-b from-pink-400 to-pink-500 text-white shadow-[0_4px_0_#be185d] scale-105"
                        : "bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 shadow-[0_3px_0_#9ca3af] hover:from-pink-100 hover:to-pink-200"
                    } active:translate-y-1 active:shadow-none`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selection */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                Select Duration
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[60, 120, 180].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      setDuration(sec);
                      playSound("select", effectsOn);
                    }}
                    className={`p-3 rounded-xl font-bold transition-all ${
                      duration === sec
                        ? "bg-gradient-to-b from-green-400 to-green-500 text-white shadow-[0_4px_0_#166534] scale-105"
                        : "bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 shadow-[0_3px_0_#9ca3af] hover:from-green-100 hover:to-green-200"
                    } active:translate-y-1 active:shadow-none`}
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
              className={`w-full py-4 rounded-xl font-black text-lg transition-all ${
                loading
                  ? "bg-gray-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-b from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white shadow-[0_6px_0_#166534] active:translate-y-1 active:shadow-[0_2px_0_#166534]"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                "🎮 Create Game"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Chat Toggle Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-[0_4px_0_#7c3aed,0_8px_16px_rgba(124,58,237,0.4)] flex items-center justify-center active:translate-y-1 active:shadow-[0_2px_0_#7c3aed]"
      >
        {chatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Mobile Chat Overlay */}
      {chatOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 h-[60vh] bg-white/95 backdrop-blur-xl rounded-t-3xl border-t-2 border-x-2 border-pink-300 shadow-[0_-8px_20px_rgba(190,24,93,0.3)]">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-3 rounded-t-3xl flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Global Chat
            </span>
            <button onClick={() => setChatOpen(false)} className="text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[calc(100%-52px)]">
            <MGlobalChat user={user} />
          </div>
        </div>
      )}
    </div>
  );
}
