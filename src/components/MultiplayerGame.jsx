import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "lib/supabaseClient";
import { useAuth } from "auth/AuthProvider";
import { useMultiplayerStore } from "store/useMultiplayerStore";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";

export default function MultiplayerGame() {
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
  const [playerId, setPlayerId] = useState(null);
  const [lastAnswerStatus, setLastAnswerStatus] = useState(null); // NEW for bounce/shake
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  const countdownRef = useRef(null);
  const gameTimerRef = useRef(null);
  const leaderboardRef = useRef(null);

  const [powerupUsage, setPowerupUsage] = useState([]);
  const [inventory, setInventory] = useState({});
  const [isInputFocused, setIsInputFocused] = useState(false);


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

        const { data: usedPowerups } = await supabase
          .from("multiplayer_powerups")
          .select("*")
          .eq("game_id", gameId)
          .eq("player_id", myPlayer.id);

        setPowerupUsage(usedPowerups || []);

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

  useEffect(() => {
    const channel = supabase
      .channel(`powerups-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "multiplayer_powerups",
          filter: `game_id=eq.${gameId}`,
        },
        async () => {
          const { data: updated } = await supabase
            .from("multiplayer_powerups")
            .select("*")
            .eq("game_id", gameId)
            .eq("player_id", playerId);

          setPowerupUsage(updated || []);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [gameId, playerId]);

  const canUsePowerup = (type) => {
    if (!game?.allow_powerups) return false;

    const maxUsage = type === "divine_hint" ? 3 : 1;
    const usedCount = powerupUsage.filter(
      (p) => p.powerup_type === type
    ).length;
    const available = inventory[type] || 0;

    return usedCount < maxUsage && available > 0;
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
    setLastAnswerStatus(null); // reset animation status
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
    if (isCorrect) earned = getScoreForAnswerTime(elapsed);

    await supabase.from("multiplayer_answers").insert({
      game_id: gameId,
      player_id: playerId,
      question_id: currentQ.id,
    });
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
      }
    } catch (err) {
      console.error("[DEBUG] Share failed", err);
    }
  };

  const handleUsePowerup = async (type) => {
    if (!canUsePowerup(type) || !currentQ) return;

    // 1. Insert usage record
    await supabase.from("multiplayer_powerups").insert({
      game_id: gameId,
      player_id: playerId,
      powerup_type: type,
      used_at: new Date().toISOString(),
    });

    // 2. Update inventory in game_users
    const updatedInventory = { ...inventory };
    updatedInventory[type] = (updatedInventory[type] || 0) - 1;
    setInventory(updatedInventory);
    await supabase
      .from("game_users")
      .update({ powerups_inventory: updatedInventory })
      .eq("user_id", user.id);

    // 3. Apply effect
    if (type === "divine_hint") {
      if (currentQ.mode === "word-fill") {
        const first = currentQ.answer[0];
        const last = currentQ.answer[currentQ.answer.length - 1];
        setTextAnswer(`${first}...${last}`);
      } else if (
        currentQ.mode === "trivia" ||
        currentQ.mode === "scripture-match"
      ) {
        const wrongOpts = currentQ.options.filter(
          (opt) => opt !== currentQ.answer
        );
        const toRemove = wrongOpts[0]; // remove just one
        const reducedOptions = currentQ.options.filter(
          (opt) => opt !== toRemove
        );
        setCurrentQ({ ...currentQ, options: reducedOptions });
      }
    }

    if (type === "heavenly_match") {
      handleAnswer(currentQ.answer); // auto-submit correct answer
    }
  };

  // --- Pre-countdown screen ---
  if (preCountdown !== null && preCountdown > 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={preCountdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: 2,
              opacity: 1,
              color: preCountdown <= 3 ? "#ff0000" : "#ffffff",
            }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="text-[8rem] font-bold"
          >
            {preCountdown}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // --- Finished screen ---
  // Inside the finished state rendering section:
  if (game?.status === "finished") {
    const matchCode = game?.token || "N/A";
    const finishedAt = new Date().toLocaleString();

    const medal = (idx) => {
      if (idx === 0) return "🥇";
      if (idx === 1) return "🥈";
      if (idx === 2) return "🥉";
      return "";
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-6xl mb-4"
        >
          🏆
        </motion.div>

        {/* Title */}
        <h2 className="text-4xl font-bold mb-2">Final Leaderboard</h2>
        <p className="text-sm text-gray-400">
          Match Code: {matchCode} • Finished: {finishedAt}
        </p>

        {/* Leaderboard Card */}
        <motion.div
          ref={leaderboardRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 w-full max-w-md backdrop-blur-lg bg-white/10 rounded-2xl p-4 shadow-lg border border-white/20"
        >
          <AnimatePresence>
            {leaderboard.map((p, idx) => {
              const isMe = p.user_id === user.id;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex justify-between items-center p-3 rounded-xl mb-2 ${
                    isMe
                      ? "bg-gradient-to-r from-green-500/40 to-green-400/20 border border-green-400 shadow-lg"
                      : "bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{medal(idx) || idx + 1}.</span>
                    <span className="font-medium">{p.player_name}</span>
                    {isMe && (
                      <span className="text-xs text-green-300">(You)</span>
                    )}
                  </div>
                  <span className="font-semibold">{p.score} pts</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate("/map")}
            className="px-5 py-2 rounded-full bg-green-500 hover:bg-green-400 transition-colors shadow-lg"
          >
            Return to Map
          </button>
          <button
            onClick={handleShare}
            className="px-5 py-2 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors shadow-lg"
          >
            Share
          </button>
        </div>
      </div>
    );
  }

  // --- In-progress screen ---
  if (game?.status === "in_progress") {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        {/* Question Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-lg mb-2">⏳ Time Left: {gameTimer}s</div>

          




          {/* <div className="text-xl font-bold mb-6">
          Your Score: {players.find((p) => p.user_id === user.id)?.score || 0}
        </div> */}
          {currentQ ? (
            <motion.div
              key={currentQ.id}
              className="w-full max-w-2xl text-center backdrop-blur-lg bg-white/5 p-6 rounded-2xl border border-white/20 shadow-lg"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{
                rotateY: 0,
                opacity: 1,
                scale:
                  lastAnswerStatus === "correct"
                    ? [1, 1.1, 1]
                    : lastAnswerStatus === "wrong"
                    ? [1, 0.9, 1.05, 0.95, 1]
                    : 1,
              }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-2xl font-bold mb-4">{currentQ.question}</h3>
              {currentQ.mode === "trivia" ||
              currentQ.mode === "scripture-match" ? (
                <div className="grid gap-3">
                  {currentQ.options?.map((opt, i) => (
                    <button
                      key={i}
                      className="p-3 rounded-xl bg-blue-500 hover:bg-blue-400 shadow-lg transition"
                      onClick={() => handleAnswer(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : currentQ.mode === "word-fill" ? (
                <div className="flex gap-2 justify-center">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Your answer"
                    className="border p-2 rounded-xl w-64 text-black"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAnswer(textAnswer);
                    }}
                  />
                  <button
                    onClick={() => handleAnswer(textAnswer)}
                    className="px-4 py-2 bg-green-500 rounded-xl hover:bg-green-400 shadow-lg transition"
                  >
                    Submit
                  </button>
                </div>
              ) : null}

              


              {["trivia", "scripture-match", "word-fill"].includes(
            currentQ.mode
          ) && (
            <div className="mt-4 flex gap-4 justify-center">
              <button
                onClick={() => handleUsePowerup("divine_hint")}
                disabled={!canUsePowerup("divine_hint")}
                className="px-4 py-2 rounded-lg bg-purple-600 disabled:bg-gray-600 hover:bg-purple-500 transition"
              >
                ✨ Divine Hint
              </button>

              <button
                onClick={() => handleUsePowerup("heavenly_match")}
                disabled={!canUsePowerup("heavenly_match")}
                className="px-4 py-2 rounded-lg bg-yellow-400 text-black disabled:bg-gray-600 hover:bg-yellow-300 transition"
              >
                🔥 Heavenly Match
              </button>
            </div>
          )}



            </motion.div>
          ) : (
            <p className="text-gray-400 mt-4">
              No more questions, waiting for game to end...
            </p>
          )}
        </div>

        {/* Leaderboard Collapsible */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            showLeaderboard ? "w-full md:w-80" : "w-0 md:w-12"
          } overflow-hidden bg-white/10 backdrop-blur-lg border-l border-white/20`}
        >
          <div className="flex justify-between items-center p-4">
            <h2 className="text-lg font-semibold">Leaderboard</h2>
            <button
              className="text-sm px-2 py-1 bg-gray-700 rounded-lg hover:bg-gray-600"
              onClick={() => setShowLeaderboard((prev) => !prev)}
            >
              {showLeaderboard ? "Hide" : "Show"}
            </button>
          </div>
          <div className="p-4 overflow-y-auto">
            <AnimatePresence>
              {leaderboard.map((p, idx) => {
                const isMe = p.user_id === user.id;
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`p-2 rounded-xl mb-2 ${
                      isMe
                        ? "bg-gradient-to-r from-green-500/30 to-green-400/10 border border-green-400"
                        : "bg-white/5"
                    }`}
                  >
                    <span className="font-medium">
                      {idx + 1}. {p.player_name}
                    </span>
                    <span className="float-right font-semibold">
                      {p.score} pts
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // --- Waiting screen ---
  return (
    <div className="flex items-center justify-center h-screen text-center">
      <p className="text-xl font-semibold">⏳ Waiting for game to start...</p>
    </div>
  );
}
