import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "lib/supabaseClient.js";
import { useUser } from "@supabase/auth-helpers-react";

import WordFillWeekly from "modes/WordFillWeekly";
import ScriptureMatchWeekly from "modes/ScriptureMatchWeekly";
import TriviaWeekly from "modes/TriviaWeekly";

console.log("🟣 WeeklyChallengeScreen component mounted");

const SCORING_TIERS = [
  { maxSeconds: 5, points: 100 },
  { maxSeconds: 10, points: 90 },
  { maxSeconds: 15, points: 80 },
  { maxSeconds: 20, points: 70 },
  { maxSeconds: 25, points: 60 },
  { maxSeconds: 30, points: 50 },
  { maxSeconds: Infinity, points: 25 },
];

const CHALLENGE_DURATION = 180; // seconds
const STORAGE_KEY_TIME = "weeklyChallengeStartTime";
const STORAGE_KEY_SCORE = "weeklyChallengeScore";
const STORAGE_KEY_CORRECT = "weeklyChallengeCorrect";
const STORAGE_KEY_INCORRECT = "weeklyChallengeIncorrect";
const STORAGE_KEY_FINISHED = "weeklyChallengeFinished";

// ✅ Helper to compute the current week's Friday 12PM start
function getCurrentWeekStartDate() {
  const now = new Date();
  const day = now.getDay(); // Sunday = 0 ... Saturday = 6
  const daysSinceFriday = day >= 5 ? day - 5 : 7 - (5 - day);
  const friday = new Date(now);
  friday.setDate(now.getDate() - daysSinceFriday);
  friday.setHours(12, 0, 0, 0);
  return friday.toISOString();
}

export default function WeeklyChallengeScreen({ sound, setSound, effectsOn }) {
  const [questions, setQuestions] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(() =>
    parseInt(localStorage.getItem(STORAGE_KEY_SCORE) || "0", 10)
  );
  const [isFinished, setIsFinished] = useState(
    () => localStorage.getItem(STORAGE_KEY_FINISHED) === "true"
  );

  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
  const [correctCount, setCorrectCount] = useState(() =>
    parseInt(localStorage.getItem(STORAGE_KEY_CORRECT) || "0", 10)
  );
  const [incorrectCount, setIncorrectCount] = useState(() =>
    parseInt(localStorage.getItem(STORAGE_KEY_INCORRECT) || "0", 10)
  );
  const [error, setError] = useState(null);
  const [previousAttempt, setPreviousAttempt] = useState(null);

  const navigate = useNavigate();
  const user = useUser();
  const submittedRef = useRef(false);
  const questionStartTimeRef = useRef(Date.now());

  // ✅ On mount: check if this user already attempted this week's challenge
  useEffect(() => {
    const checkPreviousAttempt = async () => {
      if (!user) return;

      console.log("🔍 Checking for previous attempt this week...");
      const { data, error } = await supabase
        .from("weekly_challenges")
        .select("id, score, correct_answers, incorrect_answers, questions_answered, week_start_date")
        .eq("user_id", user.id)
        .order("attempted_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("❌ Error checking attempts:", error);
        return;
      }

      if (data && data.length > 0) {
        const lastAttempt = data[0];
        const currentWeekStart = getCurrentWeekStartDate();

        if (lastAttempt.week_start_date === currentWeekStart) {
          console.log("⛔ User already attempted this week's challenge:", lastAttempt);
          setPreviousAttempt(lastAttempt);
          setIsFinished(true);
        }
      }
    };

    checkPreviousAttempt();
  }, [user]);

  // ✅ Fetch quiz questions
  useEffect(() => {
    const fetchQuestions = async () => {
      console.log("🔄 Fetching weekly quiz questions...");
      const { data, error } = await supabase
        .from("weekly_quiz")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("❌ Failed to load weekly quiz:", error);
        setError("Unable to load challenge.");
        return;
      }

      if (!data || data.length === 0) {
        console.warn("⚠️ No weekly quiz available.");
        setError("No challenge available this week.");
        return;
      }

      console.log("✅ Loaded questions:", data);
      setQuestions(data);
    };

    fetchQuestions();
  }, []);

  // ✅ Countdown timer
  useEffect(() => {
    if (!questions || isFinished) return;

    let startTime = localStorage.getItem(STORAGE_KEY_TIME);
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem(STORAGE_KEY_TIME, startTime);
    } else {
      startTime = parseInt(startTime, 10);
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = CHALLENGE_DURATION - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        setIsFinished(true);
        clearInterval(timer);
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [questions, isFinished]);

  // ✅ Persist score changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SCORE, score.toString());
  }, [score]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CORRECT, correctCount.toString());
  }, [correctCount]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INCORRECT, incorrectCount.toString());
  }, [incorrectCount]);

  // ✅ Submit score when finished (only if new attempt)
  useEffect(() => {
    if (isFinished && !submittedRef.current && user && !previousAttempt) {
      submittedRef.current = true;
      localStorage.setItem(STORAGE_KEY_FINISHED, "true");

      const payload = {
        user_id: user.id,
        score,
        attempted_at: new Date().toISOString(),
        questions_answered: questions?.length || 0,
        correct_answers: correctCount,
        incorrect_answers: incorrectCount,
      };

      console.log("📦 Payload to insert into weekly_challenges:", payload);

      supabase
        .from("weekly_challenges")
        .insert(payload)
        .then(({ error }) => {
          if (error) {
            console.error("❌ Failed to save weekly challenge:", error);
          } else {
            console.log("✅ Weekly challenge submitted successfully");
            // 🧹 Clear storage for a clean next run
            localStorage.removeItem(STORAGE_KEY_TIME);
            localStorage.removeItem(STORAGE_KEY_SCORE);
            localStorage.removeItem(STORAGE_KEY_CORRECT);
            localStorage.removeItem(STORAGE_KEY_INCORRECT);
            localStorage.removeItem(STORAGE_KEY_FINISHED);
          }
        });
    }
  }, [isFinished, score, user, correctCount, incorrectCount, questions, previousAttempt]);

  const getPoints = (timeTaken) => {
    for (const tier of SCORING_TIERS) {
      if (timeTaken <= tier.maxSeconds) return tier.points;
    }
    return 25;
  };

  const handleAnswer = (isCorrect, timeTaken) => {
    if (isCorrect) {
      const earned = getPoints(timeTaken);
      setScore((s) => s + earned);
      setCorrectCount((c) => c + 1);
    } else {
      setIncorrectCount((c) => c + 1);
    }
    goToNextQuestion();
  };

  const goToNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      questionStartTimeRef.current = Date.now();
    } else {
      setIsFinished(true);
    }
  };

  // UI States
  if (error) {
    return (
      <div className="p-6 text-center text-gray-700">
        {error}
        <div>
          <button
            onClick={() => navigate("/map")}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl shadow"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-gray-700 text-lg font-medium animate-pulse">
          Loading Weekly Challenge...
        </div>
      </div>
    );
  }

  // ✅ If user already attempted, show their saved results
  if (previousAttempt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-yellow-50 to-white p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center space-y-6 animate-fadeIn">
          <h2 className="text-3xl font-bold text-gray-700">Weekly Challenge</h2>
          <p className="text-gray-600">You already attempted this week.</p>

          <p className="text-xl font-semibold text-gray-800">
            Score:{" "}
            <span className="text-blue-600">{previousAttempt.score} pts</span>
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="bg-green-50 p-4 rounded-xl shadow-inner">
              ✅ <strong>Correct:</strong>
              <div className="text-lg font-bold">{previousAttempt.correct_answers}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-xl shadow-inner">
              ❌ <strong>Incorrect:</strong>
              <div className="text-lg font-bold">{previousAttempt.incorrect_answers}</div>
            </div>
            <div className="col-span-2 bg-indigo-50 p-4 rounded-xl shadow-inner">
              📋 <strong>Total:</strong>
              <div className="text-lg font-bold">{previousAttempt.questions_answered}</div>
            </div>
          </div>

          <button
            onClick={() => navigate("/map")}
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl shadow transition-transform transform hover:scale-105"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  // Normal finished state
  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-white p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center space-y-6 animate-fadeIn">
          <div className="text-5xl">🎉</div>
          <h2 className="text-3xl font-bold text-green-700">
            Challenge Complete!
          </h2>

          <p className="text-xl font-semibold text-gray-800">
            You scored <span className="text-blue-600">{score} pts</span>
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="bg-green-50 p-4 rounded-xl shadow-inner">
              ✅ <strong>Correct:</strong>
              <div className="text-lg font-bold">{correctCount}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-xl shadow-inner">
              ❌ <strong>Incorrect:</strong>
              <div className="text-lg font-bold">{incorrectCount}</div>
            </div>
            <div className="col-span-2 bg-indigo-50 p-4 rounded-xl shadow-inner">
              📋 <strong>Total:</strong>
              <div className="text-lg font-bold">{questions.length}</div>
            </div>
          </div>

          <button
            onClick={() => navigate("/map")}
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl shadow transition-transform transform hover:scale-105"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  // Active challenge
  const renderMode = () => {
    const current = questions[currentIndex];
    const key = `${current.mode}-${current.id}`;
    switch (current.mode) {
      case "word-fill":
        return (
          <WordFillWeekly key={key} quiz={current} onAnswer={handleAnswer} effectsOn={effectsOn} />
        );
      case "scripture-match":
        return (
          <ScriptureMatchWeekly key={key} quiz={current} onAnswer={handleAnswer} effectsOn={effectsOn} />
        );
      case "trivia":
        return (
          <TriviaWeekly key={key} quiz={current} onAnswer={handleAnswer} effectsOn={effectsOn} />
        );
      default:
        return <div>Unknown mode</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-white to-blue-50 relative overflow-hidden">
      {/* HUD */}
      <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-md shadow-md rounded-b-2xl">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow">
          ⏳ <span className="font-bold text-gray-800">{timeLeft}s</span>
        </div>
        <div className="text-lg font-bold text-indigo-700">
          Score: <span className="text-orange-500">{score}</span>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow">
          Q {currentIndex + 1}/{questions.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 mt-4">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-orange-400 to-pink-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="p-6 flex justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-3xl space-y-6 border border-yellow-100 animate-[fadeIn_0.5s_ease]">
          {renderMode()}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 flex justify-center gap-4">
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full shadow-sm">
          ✅ Correct: <span className="font-bold">{correctCount}</span>
        </div>
        <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full shadow-sm">
          ❌ Incorrect: <span className="font-bold">{incorrectCount}</span>
        </div>
      </div>
    </div>
  );
}
