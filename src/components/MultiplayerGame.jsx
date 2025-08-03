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

  const countdownRef = useRef(null);
  const gameTimerRef = useRef(null);
  const leaderboardRef = useRef(null);

  // Fetch initial game + players
  useEffect(() => {
    const fetchGameData = async () => {
      console.log("[DEBUG] Fetching initial game data...");
      const { data: gameData, error: gameError } = await supabase
        .from("multiplayer_games")
        .select("*")
        .eq("id", gameId)
        .single();
      if (gameError) console.error("[DEBUG] Game fetch error:", gameError);
      console.log("[DEBUG] Game data:", gameData);
      if (!gameData) return;
      setGame(gameData);

      if (gameData.status === "starting") {
        console.log("[DEBUG] Game already in 'starting' state — triggering countdown.");
        setPreCountdown(5);
      }

      const { data: playerData, error: playerError } = await supabase
        .from("multiplayer_players")
        .select("*")
        .eq("game_id", gameId);
      if (playerError) console.error("[DEBUG] Players fetch error:", playerError);
      console.log("[DEBUG] Players:", playerData);
      setPlayers(playerData || []);

      const myPlayer = playerData?.find((p) => p.user_id === user.id);
      if (myPlayer) {
        setPlayerId(myPlayer.id);
        const { data: answers, error: answersError } = await supabase
          .from("multiplayer_answers")
          .select("question_id")
          .eq("game_id", gameId)
          .eq("player_id", myPlayer.id);
        if (answersError) console.error("[DEBUG] Answers fetch error:", answersError);
        console.log("[DEBUG] Existing answered questions:", answers);
        setAnsweredQIds(answers?.map((a) => a.question_id) || []);
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
          console.log("[DEBUG] Game status update detected:", payload.new);
          if (payload.new) {
            setGame(payload.new);
            if (payload.new.status === "starting") {
              console.log("[DEBUG] Pre-start countdown triggered.");
              setPreCountdown(5); // start 5s countdown
            }
            if (payload.new.status === "finished") {
              clearInterval(gameTimerRef.current);
              navigate(`/multiplayer/game/${gameId}`);
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(statusChannel);
  }, [gameId, setGame, setPlayers, user.id, navigate]);

  // Leaderboard subscription
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from("multiplayer_players")
        .select("*")
        .eq("game_id", gameId)
        .order("score", { ascending: false });
      if (error) console.error("[DEBUG] Leaderboard fetch error:", error);
      console.log("[DEBUG] Leaderboard:", data);
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

  // Fetch questions once
  useEffect(() => {
    const fetchQuestions = async () => {
      console.log("[DEBUG] Fetching questions...");
      const { data, error } = await supabase
        .from("multiplayer_quiz")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error("[DEBUG] Questions fetch error:", error);
      console.log("[DEBUG] Questions fetched:", data);
      setQuestions(data || []);
    };
    fetchQuestions();
  }, []);

  // Countdown before game starts
  useEffect(() => {
    if (preCountdown === null) return;
    if (preCountdown > 0) {
      countdownRef.current = setTimeout(
        () => setPreCountdown((c) => c - 1),
        1000
      );
    } else if (preCountdown === 0) {
      clearTimeout(countdownRef.current);
      // Immediately mark game as in_progress locally
      setGame((prev) => ({ ...prev, status: "in_progress" }));
      startGame();
    }
    return () => clearTimeout(countdownRef.current);
  }, [preCountdown, setGame]);

  // Game timer logic
  useEffect(() => {
    if (!game || game.status !== "in_progress") return;
    const endTime = Date.now() + (game.duration_seconds || 60) * 1000;
    const updateTimer = () => {
      const timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setGameTimer(timeLeft);
      if (timeLeft <= 0) finishGame();
    };
    updateTimer();
    gameTimerRef.current = setInterval(updateTimer, 1000);
    return () => clearInterval(gameTimerRef.current);
  }, [game]);

  const startGame = async () => {
    console.log("[DEBUG] Starting game...");
    await supabase
      .from("multiplayer_games")
      .update({ status: "in_progress" })
      .eq("id", gameId);
    pickNextQuestion();
  };

  const finishGame = async () => {
    console.log("[DEBUG] Finishing game...");
    await supabase
      .from("multiplayer_games")
      .update({ status: "finished" })
      .eq("id", gameId);
  };

  const pickNextQuestion = () => {
    console.log("[DEBUG] Picking next question. Answered IDs:", answeredQIds);
    const available = questions.filter((q) => !answeredQIds.includes(q.id));
    console.log("[DEBUG] Available questions:", available);
    if (available.length === 0) {
      console.log("[DEBUG] No more questions available.");
      setCurrentQ(null);
      return;
    }
    const randomQ = available[Math.floor(Math.random() * available.length)];
    console.log("[DEBUG] Selected question:", randomQ);
    setCurrentQ(randomQ);
    setQuestionStartTime(Date.now());
    setTextAnswer("");
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
    if (answer.toLowerCase().trim() === currentQ.answer.toLowerCase().trim()) {
      earned = getScoreForAnswerTime(elapsed);
    }
    console.log("[DEBUG] Answer submitted:", answer, "Earned:", earned);
    await supabase.from("multiplayer_answers").insert({
      game_id: gameId,
      player_id: playerId,
      question_id: currentQ.id,
    });
    setAnsweredQIds((prev) => [...prev, currentQ.id]);
    await supabase.rpc("increment_multiplayer_score", {
      p_game_id: gameId,
      p_user_id: user.id,
      p_points: earned,
    });
    pickNextQuestion();
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

  // Pre-start countdown screen
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

  // Final results screen
  if (game?.status === "finished") {
    const matchCode = game?.token || "N/A";
    const finishedAt = new Date().toLocaleString();
    return (
      <div className="p-6 text-center">
        <div
          ref={leaderboardRef}
          className="max-w-md mx-auto bg-white rounded-lg shadow p-4"
        >
          <h2 className="text-3xl font-bold mb-4">🏆 Final Leaderboard</h2>
          <p className="text-sm text-gray-500 mb-2">Match Code: {matchCode}</p>
          <p className="text-sm text-gray-500 mb-4">Finished: {finishedAt}</p>
          {leaderboard.map((p, idx) => {
            const isMe = p.user_id === user.id;
            return (
              <div
                key={p.id}
                className={`mb-2 p-2 rounded ${
                  isMe ? "bg-yellow-200 font-bold" : "bg-gray-100"
                }`}
              >
                {idx + 1}. {p.player_name} — {p.score} pts {isMe && " (You)"}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={() => navigate("/map")}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Return to Map
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Share
          </button>
        </div>
      </div>
    );
  }

  // In-game screen
  if (game?.status === "in_progress") {
    return (
      <div className="flex flex-col md:flex-row h-screen">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-lg mb-2">⏳ Time Left: {gameTimer}s</div>
          <div className="text-xl font-bold mb-6">
            Your Score: {players.find((p) => p.user_id === user.id)?.score || 0}
          </div>
          {currentQ ? (
            <div className="w-full max-w-2xl text-center">
              <h3 className="text-2xl font-bold mb-4">{currentQ.question}</h3>
              {currentQ.mode === "trivia" ||
              currentQ.mode === "scripture-match" ? (
                <div className="grid gap-3">
                  {currentQ.options?.map((opt, i) => (
                    <button
                      key={i}
                      className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
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
                    className="border p-2 rounded w-64"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAnswer(textAnswer);
                    }}
                  />
                  <button
                    onClick={() => handleAnswer(textAnswer)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Submit
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-gray-500 mt-4">
              No more questions, waiting for game to end...
            </p>
          )}
        </div>
        <div className="w-full md:w-72 bg-gray-50 border-l p-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
          <AnimatePresence>
            {leaderboard.map((p, idx) => {
              const isMe = p.user_id === user.id;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0, scale: [1, 1.05, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`text-sm p-2 rounded mb-2 ${
                    isMe ? "bg-yellow-200 font-bold" : "bg-white"
                  }`}
                >
                  {idx + 1}. {p.player_name} — {p.score} pts {isMe && " (You)"}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Waiting screen
  return (
    <div className="flex items-center justify-center h-screen text-center">
      <p className="text-xl font-semibold">⏳ Waiting for game to start...</p>
    </div>
  );
}
