import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import { playSound } from "@/utils/sound";
import ReactConfetti from "react-confetti";
import { Trophy, Share2, Home, ChevronDown, ChevronUp, Lightbulb, Crown, Timer, Sparkles, Swords } from "lucide-react";
import { toast } from "sonner";

export default function MultiplayerGame({ effectsOn }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { players = [], setPlayers, game, setGame } = useMultiplayerStore();

  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(null);
  const [preCountdown, setPreCountdown] = useState(null);
  const [gameTimer, setGameTimer] = useState(0);
  const [answeredQIds, setAnsweredQIds] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [placeholderHint, setPlaceholderHint] = useState("");
  const [playerId, setPlayerId] = useState(null);
  const [lastAnswerStatus, setLastAnswerStatus] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  const countdownRef = useRef(null);
  const gameTimerRef = useRef(null);
  const leaderboardRef = useRef(null);

  const [inventory, setInventory] = useState({});
  const [isInputFocused, setIsInputFocused] = useState(false);

  const [powerupUsage, setPowerupUsage] = useState({
    divine_hint: 0,
    heavenly_match: 0,
  });
  const [allPowerupUsage, setAllPowerupUsage] = useState({});

  // Generate twinkling stars
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    size: Math.random() * 2 + 1,
  }));

  // --- Fetch initial game + players ---
  useEffect(() => {
    const fetchGameData = async () => {
      const { data: gameData } = await supabase
        .from("multiplayer_games")
        .select("*")
        .eq("id", gameId)
        .single();
      if (!gameData) return;
      setGame(gameData);

      if (gameData.status === "in_progress" && gameData.end_at) {
        const remaining = Math.max(
          0,
          Math.ceil((new Date(gameData.end_at) - new Date()) / 1000)
        );
        setGameTimer(remaining);
        startGameTimer(new Date(gameData.end_at));
      }
      if (gameData.status === "starting") {
        playSound("countdown", effectsOn);
        setPreCountdown(5);
      }

      const { data: playerData } = await supabase
        .from("multiplayer_players")
        .select("*")
        .eq("game_id", gameId);
      setPlayers(playerData || []);

      const myPlayer = playerData?.find((p) => p.user_id === user.id);
      if (myPlayer) {
        setPlayerId(myPlayer.id);

        const { data: gameUserData } = await supabase
          .from("game_users")
          .select("powerups_inventory")
          .eq("user_id", user.id)
          .single();

        if (gameUserData?.powerups_inventory) {
          setInventory(gameUserData.powerups_inventory);
        }

        const { data: answers } = await supabase
          .from("multiplayer_answers")
          .select("question_id")
          .eq("game_id", gameId)
          .eq("player_id", myPlayer.id);
        const answeredIds = answers?.map((a) => a.question_id) || [];
        setAnsweredQIds(answeredIds);
        if (gameData.status === "in_progress" && questions.length > 0) {
          pickNextQuestion(answeredIds);
        }
      }
    };
    fetchGameData();

    const statusChannel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "multiplayer_games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.new) {
            setGame(payload.new);
            if (payload.new.status === "starting") setPreCountdown(5);
            if (payload.new.status === "in_progress" && payload.new.end_at) {
              startGameTimer(new Date(payload.new.end_at));
              pickNextQuestion(answeredQIds);
            }
            if (payload.new.status === "finished") {
              clearInterval(gameTimerRef.current);
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(statusChannel);
  }, [gameId, setGame, setPlayers, user.id, questions]);

  const startGameTimer = (endTime) => {
    clearInterval(gameTimerRef.current);
    const updateTimer = () => {
      const timeLeft = Math.max(0, Math.ceil((endTime - new Date()) / 1000));
      setGameTimer(timeLeft);
      if (timeLeft <= 0) finishGame();
    };
    updateTimer();
    gameTimerRef.current = setInterval(updateTimer, 1000);
  };

  const canUsePowerup = (type) => {
    if (!game?.allow_powerups) return false;
    const available = inventory[type] || 0;
    return available > 0;
  };

  // --- Leaderboard subscription ---
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("multiplayer_players")
        .select("*")
        .eq("game_id", gameId)
        .order("score", { ascending: false });
      setLeaderboard(data || []);
    };
    fetchLeaderboard();

    const channel = supabase
      .channel(`leaderboard-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "multiplayer_players",
          filter: `game_id=eq.${gameId}`,
        },
        fetchLeaderboard
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [gameId]);

  useEffect(() => {
    setPlaceholderHint("");
  }, [currentQ?.id]);

  // --- Fetch questions ---
  useEffect(() => {
    const fetchQuestions = async () => {
      const { data } = await supabase
        .from("multiplayer_quiz")
        .select("*")
        .order("created_at", { ascending: false });
      setQuestions(data || []);
    };
    fetchQuestions();
  }, []);

  // --- Pre-game countdown ---
  useEffect(() => {
    if (preCountdown === null) return;
    if (preCountdown > 0) {
      countdownRef.current = setTimeout(
        () => setPreCountdown((c) => c - 1),
        1000
      );
    } else if (preCountdown === 0) {
      clearTimeout(countdownRef.current);
      startGame();
    }
    return () => clearTimeout(countdownRef.current);
  }, [preCountdown]);

  const fetchAllPowerupUsage = async () => {
    const { data, error } = await supabase
      .from("multiplayer_answers")
      .select("player_id, meta")
      .eq("game_id", gameId);

    if (error) {
      console.error("Failed to fetch power-up usage:", error);
      return;
    }

    const usageMap = {};
    data?.forEach((row) => {
      const player = row.player_id;
      const used = row.meta?.powerups_used || [];

      if (!usageMap[player]) {
        usageMap[player] = { divine_hint: 0, heavenly_match: 0 };
      }

      used.forEach((type) => {
        if (usageMap[player][type] !== undefined) {
          usageMap[player][type]++;
        }
      });
    });

    setAllPowerupUsage(usageMap);
  };

  useEffect(() => {
    if (game?.status === "finished") {
      playSound("gameOver", effectsOn);
      setShowConfetti(true);
      fetchAllPowerupUsage();
      setTimeout(() => setShowConfetti(false), 8000);
    }
  }, [game?.status, effectsOn, gameId]);

  const startGame = async () => {
    const endAt = new Date(
      Date.now() + (game.duration_seconds || 60) * 1000
    ).toISOString();
    await supabase
      .from("multiplayer_games")
      .update({ status: "in_progress", end_at: endAt })
      .eq("id", gameId);
    startGameTimer(new Date(endAt));
    pickNextQuestion(answeredQIds);
  };

  const finishGame = async () => {
    await supabase
      .from("multiplayer_games")
      .update({ status: "finished" })
      .eq("id", gameId);
  };

  const pickNextQuestion = (answered = answeredQIds) => {
    const available = questions.filter((q) => !answered.includes(q.id));
    if (available.length === 0) {
      setCurrentQ(null);
      return;
    }
    const randomQ = available[Math.floor(Math.random() * available.length)];
    setCurrentQ(randomQ);
    setQuestionStartTime(Date.now());
    setTextAnswer("");
    setLastAnswerStatus(null);
  };

  const getScoreForAnswerTime = (elapsedSec) => {
    if (elapsedSec <= 5) return 100;
    if (elapsedSec <= 10) return 90;
    if (elapsedSec <= 15) return 80;
    if (elapsedSec <= 20) return 70;
    if (elapsedSec <= 25) return 60;
    if (elapsedSec <= 30) return 50;
    return 25;
  };

  const handleAnswer = async (answer) => {
    if (!currentQ || !playerId) return;

    const elapsed = (Date.now() - questionStartTime) / 1000;

    let earned = 0;
    const isCorrect =
      answer.toLowerCase().trim() === currentQ.answer.toLowerCase().trim();
    setLastAnswerStatus(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      earned = getScoreForAnswerTime(elapsed);
      playSound("success", effectsOn);
    } else {
      playSound("error", effectsOn);
    }

    await supabase
      .from("multiplayer_answers")
      .insert(
        { game_id: gameId, player_id: playerId, question_id: currentQ.id },
        { onConflict: "game_id,player_id,question_id", ignoreDuplicates: true }
      );

    const updatedAnswered = [...answeredQIds, currentQ.id];
    setAnsweredQIds(updatedAnswered);
    await supabase.rpc("increment_multiplayer_score", {
      p_game_id: gameId,
      p_user_id: user.id,
      p_points: earned,
    });

    setTimeout(() => pickNextQuestion(updatedAnswered), 600);
  };

  const handleShare = async () => {
    if (!leaderboardRef.current) return;
    try {
      const canvas = await html2canvas(leaderboardRef.current);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      const matchCode = game?.token || "N/A";
      const finishedAt = new Date().toLocaleString();
      const shareText = `🏆 Multiplayer Game Result\nMatch Code: ${matchCode}\nFinished: ${finishedAt}`;
      const file = new File([blob], "leaderboard.png", { type: "image/png" });
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Multiplayer Game Result",
          text: shareText,
          files: [file],
        });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "leaderboard.png";
        link.click();
        toast.success("Results image downloaded!");
      }
    } catch (err) {
      console.error("[DEBUG] Share failed", err);
      toast.error("Couldn't share results — please try again");
    }
  };

  const handleUsePowerup = async (type) => {
    if (!canUsePowerup(type) || !currentQ) return;

    playSound("powerUpUsed", effectsOn);

    const updatedInventory = { ...inventory };
    updatedInventory[type] = (updatedInventory[type] || 0) - 1;
    setInventory(updatedInventory);

    try {
      await supabase
        .from("game_users")
        .update({ powerups_inventory: updatedInventory })
        .eq("user_id", user.id);
    } catch (err) {
      console.error("Error updating inventory:", err);
    }

    try {
      const { data: existing, error: fetchError } = await supabase
        .from("multiplayer_answers")
        .select("id, meta")
        .eq("game_id", gameId)
        .eq("player_id", playerId)
        .eq("question_id", currentQ.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching existing meta:", fetchError);
        return;
      }

      const prev = Array.isArray(existing?.meta?.powerups_used)
        ? existing.meta.powerups_used
        : [];

      const merged = Array.from(new Set([...prev, type]));

      await supabase
        .from("multiplayer_answers")
        .upsert(
          {
            id: existing?.id,
            game_id: gameId,
            player_id: playerId,
            question_id: currentQ.id,
            meta: { powerups_used: merged },
          },
          { onConflict: "game_id,player_id,question_id" }
        );
    } catch (err) {
      console.error("Error logging power-up usage:", err);
    }

    if (type === "divine_hint") {
      if (currentQ.mode === "word-fill") {
        const first = currentQ.answer[0];
        const last = currentQ.answer[currentQ.answer.length - 1];
        setPlaceholderHint(`${first}...${last}`);
      } else if (
        currentQ.mode === "trivia" ||
        currentQ.mode === "scripture-match"
      ) {
        const wrongOpts = currentQ.options.filter(
          (opt) => opt !== currentQ.answer
        );
        const toRemove = wrongOpts[0];
        const reducedOptions = currentQ.options.filter(
          (opt) => opt !== toRemove
        );
        setCurrentQ({ ...currentQ, options: reducedOptions });
      }
    }

    if (type === "heavenly_match") {
      handleAnswer(currentQ.answer);
    }
  };

  const medal = (idx) => {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return "";
  };

  const getMedalBg = (idx) => {
    if (idx === 0) return "from-yellow-300 via-yellow-400 to-yellow-500";
    if (idx === 1) return "from-gray-200 via-gray-300 to-gray-400";
    if (idx === 2) return "from-orange-300 via-orange-400 to-orange-500";
    return "from-gray-100 to-gray-200";
  };

  // --- Pre-countdown screen ---
  if (preCountdown !== null && preCountdown > 0) {
    return (
      <div className="flex items-center justify-center h-screen relative overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900">
        {/* Stars */}
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

        <AnimatePresence mode="wait">
          <motion.div
            key={preCountdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >
            <div
              className={`text-[10rem] font-black ${
                preCountdown <= 3 ? "text-red-400" : "text-white"
              } drop-shadow-[0_0_60px_rgba(255,255,255,0.5)]`}
            >
              {preCountdown}
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-white/30"
              animate={{ scale: [1, 2], opacity: [1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // --- Finished screen ---
  if (game?.status === "finished") {
    const matchCode = game?.token || "N/A";
    const finishedAt = new Date().toLocaleString();
    const winner = leaderboard[0];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900 p-4">
        {showConfetti && <ReactConfetti recycle={false} numberOfPieces={300} />}

        {/* Stars */}
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

        <div className="relative z-10 w-full max-w-md">
          {/* Shareable Results Card — everything the player shares lives
              inside this one element (leaderboardRef). Previously the
              trophy/winner header sat outside it, so shared screenshots
              were just a plain list with no context of what app it's from
              or who won. */}
          <motion.div
            ref={leaderboardRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950 rounded-3xl border-2 border-yellow-400/40 shadow-[0_10px_0_rgba(0,0,0,0.35),0_20px_40px_rgba(88,28,135,0.5)] p-5 sm:p-6 overflow-hidden relative"
          >
            {/* Decorative corner glow */}
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* App branding */}
            <div className="flex items-center justify-center gap-2 mb-3 relative">
              <img src="/logo512.png" alt="" className="w-6 h-6 rounded-md" />
              <span className="text-white/70 text-xs font-black tracking-[0.2em] uppercase">Light-UP</span>
            </div>

            {/* Trophy */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 1 }}
              className="flex justify-center mb-3 relative"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[0_0_50px_rgba(251,191,36,0.6)] flex items-center justify-center">
                <Trophy className="w-10 h-10 text-yellow-800" />
              </div>
            </motion.div>

            {/* Winner Announcement */}
            {winner && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-4 relative"
              >
                <p className="text-pink-300 font-bold text-xs tracking-wider">WINNER</p>
                <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-2">
                  <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
                  {winner.player_name}
                </h2>
                <p className="text-yellow-400 font-bold text-lg sm:text-xl">{winner.score} pts</p>
              </motion.div>
            )}

            {/* Match Info */}
            <div className="text-center text-white/50 text-[10px] sm:text-xs mb-4 relative font-mono">
              Match Code: {matchCode} • {finishedAt}
            </div>

            {/* Standings */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 sm:p-4 relative">
              <h3 className="text-center font-black text-gray-800 mb-3 flex items-center justify-center gap-2 text-sm sm:text-base">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
                Final Standings
              </h3>
              <AnimatePresence>
                {leaderboard.map((p, idx) => {
                  const isMe = p.user_id === user.id;
                  const powerups = allPowerupUsage[p.id] || {
                    divine_hint: 0,
                    heavenly_match: 0,
                  };

                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`flex justify-between items-center p-2.5 sm:p-3 rounded-xl mb-2 ${
                        isMe
                          ? "bg-gradient-to-r from-green-100 to-green-200 border-2 border-green-400"
                          : idx < 3
                          ? `bg-gradient-to-r ${getMedalBg(idx)}`
                          : "bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-xl sm:text-2xl">{medal(idx) || `${idx + 1}.`}</span>
                        <div>
                          <span className="font-bold text-gray-800 text-sm sm:text-base">{p.player_name}</span>
                          {isMe && (
                            <span className="text-xs text-green-600 ml-1">(You)</span>
                          )}
                          <div className="text-[10px] sm:text-xs text-gray-500">
                            💡 {powerups.divine_hint} • 👑 {powerups.heavenly_match}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-base sm:text-lg text-gray-800">{p.score}</span>
                        <span className="text-[10px] sm:text-xs text-gray-500 ml-1">pts</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Footer tagline — encourages whoever sees the shared image */}
            <p className="text-center text-white/40 text-[10px] sm:text-xs mt-4 relative">
              Play Light-UP — Bible trivia, word games & more 🕊️
            </p>
          </motion.div>

          {/* Action Buttons */}
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => navigate("/map")}
              className="py-3 rounded-xl font-bold bg-gradient-to-b from-green-400 to-green-500 text-white shadow-[0_4px_0_#166534] active:translate-y-1 active:shadow-none transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              Map
            </button>
            <button
              onClick={() => navigate("/multiplayer/create")}
              className="py-3 rounded-xl font-bold bg-gradient-to-b from-purple-400 to-purple-500 text-white shadow-[0_4px_0_#6b21a8] active:translate-y-1 active:shadow-none transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"
            >
              <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
              New Game
            </button>
            <button
              onClick={handleShare}
              className="py-3 rounded-xl font-bold bg-gradient-to-b from-blue-400 to-blue-500 text-white shadow-[0_4px_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Share
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- In-progress screen ---
  if (game?.status === "in_progress") {
    const timerWarning = gameTimer <= 10;

    return (
      <div className="flex flex-col md:flex-row min-h-screen relative overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900">
        {/* Stars */}
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

        {/* Question Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative z-10">
          {/* Timer */}
          <div
            className={`mb-4 px-6 py-2 rounded-full font-black text-lg flex items-center gap-2 ${
              timerWarning
                ? "bg-red-500 text-white animate-pulse"
                : "bg-white/95 text-gray-800"
            } shadow-lg`}
          >
            <Timer className="w-5 h-5" />
            {gameTimer}s
          </div>

          {currentQ ? (
            <motion.div
              key={currentQ.id}
              className="w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-pink-300 shadow-[0_8px_0_#be185d,0_12px_20px_rgba(190,24,93,0.4)] p-6"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{
                rotateY: 0,
                opacity: 1,
                scale:
                  lastAnswerStatus === "correct"
                    ? [1, 1.05, 1]
                    : lastAnswerStatus === "wrong"
                    ? [1, 0.95, 1.02, 0.98, 1]
                    : 1,
              }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl md:text-2xl font-black text-gray-800 text-center mb-6">
                {currentQ.question}
              </h3>

              {currentQ.mode === "trivia" || currentQ.mode === "scripture-match" ? (
                <div className="grid gap-3">
                  {currentQ.options?.map((opt, i) => (
                    <button
                      key={i}
                      className="p-4 rounded-xl font-bold bg-gradient-to-b from-blue-400 to-blue-500 text-white shadow-[0_4px_0_#1d4ed8] hover:from-blue-500 hover:to-blue-600 active:translate-y-1 active:shadow-none transition-all"
                      onClick={() => {
                        playSound("optionSelect", effectsOn);
                        handleAnswer(opt);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : currentQ.mode === "word-fill" ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder={placeholderHint || "Type your answer..."}
                    className="flex-1 border-2 border-gray-200 p-4 rounded-xl text-gray-800 font-medium focus:border-pink-400 focus:ring-2 focus:ring-pink-200 outline-none transition"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        playSound("submitAnswer", effectsOn);
                        handleAnswer(textAnswer);
                      }
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                  <button
                    onClick={() => {
                      playSound("submitAnswer", effectsOn);
                      handleAnswer(textAnswer);
                    }}
                    className="px-6 py-4 bg-gradient-to-b from-green-400 to-green-500 text-white rounded-xl font-bold shadow-[0_4px_0_#166534] active:translate-y-1 active:shadow-none transition-all"
                  >
                    Submit
                  </button>
                </div>
              ) : null}

              {/* Power-ups */}
              {game?.allow_powerups && ["trivia", "scripture-match", "word-fill"].includes(currentQ.mode) && (
                <div className="mt-6 flex gap-3 justify-center">
                  <button
                    onClick={() => handleUsePowerup("divine_hint")}
                    disabled={!canUsePowerup("divine_hint")}
                    className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                      canUsePowerup("divine_hint")
                        ? "bg-gradient-to-b from-purple-400 to-purple-500 text-white shadow-[0_4px_0_#7c3aed] active:translate-y-1 active:shadow-none"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Lightbulb className="w-5 h-5" />
                    Hint ({inventory.divine_hint || 0})
                  </button>
                  <button
                    onClick={() => handleUsePowerup("heavenly_match")}
                    disabled={!canUsePowerup("heavenly_match")}
                    className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                      canUsePowerup("heavenly_match")
                        ? "bg-gradient-to-b from-yellow-300 to-yellow-400 text-gray-800 shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:shadow-none"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Crown className="w-5 h-5" />
                    Auto ({inventory.heavenly_match || 0})
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-pink-300 shadow-lg px-8 py-6 text-center">
              <p className="text-gray-600 font-medium">
                No more questions available!
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Waiting for game to end...
              </p>
            </div>
          )}
        </div>

        {/* Leaderboard Sidebar */}
        <div
          className={`transition-all duration-300 ${
            showLeaderboard ? "w-full md:w-80" : "w-full md:w-16"
          } bg-white/10 backdrop-blur-lg border-l border-white/20 relative z-10`}
        >
          <button
            className="w-full p-3 flex items-center justify-between bg-white/10 hover:bg-white/20 transition"
            onClick={() => setShowLeaderboard((prev) => !prev)}
          >
            <span className="font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              {showLeaderboard ? "Leaderboard" : ""}
            </span>
            {showLeaderboard ? (
              <ChevronUp className="w-5 h-5 text-white" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white" />
            )}
          </button>

          {showLeaderboard && (
            <div className="p-3 overflow-y-auto max-h-[60vh] md:max-h-[calc(100vh-60px)]">
              <AnimatePresence>
                {leaderboard.map((p, idx) => {
                  const isMe = p.user_id === user.id;
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl mb-2 ${
                        isMe
                          ? "bg-gradient-to-r from-green-400/30 to-green-500/20 border border-green-400"
                          : "bg-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">
                          {medal(idx) || `${idx + 1}.`} {p.player_name}
                        </span>
                        <span className="font-black text-yellow-400">
                          {p.score}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Waiting screen ---
  return (
    <div className="flex items-center justify-center h-screen relative overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900">
      {/* Stars */}
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

      <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-pink-300 shadow-[0_8px_0_#be185d,0_12px_20px_rgba(190,24,93,0.4)] px-8 py-6 text-center">
        <div className="w-12 h-12 border-4 border-pink-300 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xl font-black text-gray-800">
          ⏳ Waiting for game to start...
        </p>
      </div>
    </div>
  );
}
