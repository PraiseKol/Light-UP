import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "lib/supabaseClient";
import { useAuth } from "auth/AuthProvider";
import { useMultiplayerStore } from "store/useMultiplayerStore";
import { motion, AnimatePresence } from "framer-motion";

export default function MultiplayerGame() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const { players = [], setPlayers, game, setGame } = useMultiplayerStore();

  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [gameTimer, setGameTimer] = useState(0);
  const [answeredQIds, setAnsweredQIds] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");

  const countdownRef = useRef(null);
  const gameTimerRef = useRef(null);

  useEffect(() => {
    const fetchGameData = async () => {
      const { data: gameData } = await supabase
        .from("multiplayer_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (gameData) {
        setGame(gameData);
        setGameTimer(gameData.duration_seconds || 180);
        initCountdown(gameData.start_at);
      }

      const { data: playerData } = await supabase
        .from("multiplayer_players")
        .select("*")
        .eq("game_id", gameId);

      setPlayers(playerData || []);
    };
    fetchGameData();
  }, [gameId, setGame, setPlayers]);

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
        { event: "UPDATE", schema: "public", table: "multiplayer_players", filter: `game_id=eq.${gameId}` },
        fetchLeaderboard
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [gameId]);

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

  const initCountdown = (startAt) => {
    if (!startAt) return;
    const startTime = new Date(startAt).getTime();
    const diff = Math.max(0, Math.ceil((startTime - Date.now()) / 1000));
    setCountdown(diff);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      clearTimeout(countdownRef.current);
      startGame();
    }
    return () => clearTimeout(countdownRef.current);
  }, [countdown]);

  const startGame = () => {
    setQuestionStartTime(Date.now());
    pickNextQuestion();
    gameTimerRef.current = setInterval(() => {
      setGameTimer((t) => {
        if (t <= 1) {
          clearInterval(gameTimerRef.current);
          setGameOver(true);
        }
        return t - 1;
      });
    }, 1000);
  };

  const pickNextQuestion = () => {
    const available = questions.filter((q) => !answeredQIds.includes(q.id));
    if (available.length === 0) {
      setCurrentQ(null);
      return;
    }
    const randomQ = available[Math.floor(Math.random() * available.length)];
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
    if (!currentQ) return;
    const elapsed = (Date.now() - questionStartTime) / 1000;
    let earned = 0;
    if (answer.toLowerCase().trim() === currentQ.answer.toLowerCase().trim()) {
      earned = getScoreForAnswerTime(elapsed);
    }
    setAnsweredQIds((prev) => [...prev, currentQ.id]);

    await supabase.rpc("increment_multiplayer_score", {
      p_game_id: gameId,
      p_user_id: user.id,
      p_points: earned
    });

    pickNextQuestion();
  };

  if (countdown > 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1, color: countdown <= 3 ? "#ff0000" : "#ffffff" }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="text-[8rem] font-bold"
          >
            {countdown}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-3xl font-bold mb-6">🏆 Final Leaderboard</h2>
        <div className="max-w-md mx-auto">
          {leaderboard.map((p, idx) => {
            const isMe = p.user_id === user.id;
            return (
              <div key={p.id} className={`mb-2 p-2 rounded ${isMe ? "bg-yellow-200 font-bold" : "bg-gray-100"}`}>
                {idx + 1}. {p.player_name} — {p.score} pts {isMe && " (You)"}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-lg mb-2">⏳ Time Left: {gameTimer}s</div>
        <div className="text-xl font-bold mb-6">
          Your Score: {players.find((p) => p.user_id === user.id)?.score || 0}
        </div>

        <AnimatePresence mode="wait">
          {currentQ ? (
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-2xl text-center"
            >
              <h3 className="text-2xl font-bold mb-4">{currentQ.question}</h3>
              {currentQ.mode === "trivia" || currentQ.mode === "scripture-match" ? (
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
            </motion.div>
          ) : (
            <motion.p
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-500 mt-4"
            >
              No more questions, waiting for game to end...
            </motion.p>
          )}
        </AnimatePresence>
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
                className={`text-sm p-2 rounded mb-2 ${isMe ? "bg-yellow-200 font-bold" : "bg-white"}`}
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
