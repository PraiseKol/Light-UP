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

export default function WeeklyChallengeScreen() {
  const [questions, setQuestions] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const user = useUser();
  const submittedRef = useRef(false);
  const questionStartTimeRef = useRef(Date.now());

  // ✅ Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      console.log("🔄 Fetching weekly quiz questions...");
      const { data, error } = await supabase
        .from("weekly_quiz")
        .select("*")
        .order("id", { ascending: true });

      if (error || !data || data.length === 0) {
        console.error("❌ Failed to load weekly quiz:", error);
        setError("Unable to load challenge. Returning to map...");
        setTimeout(() => {
          console.log("🔙 Navigating back to /map due to error");
          navigate("/map");
        }, 3000);
      } else {
        console.log("✅ Loaded questions:", data);
        setQuestions(data);
      }
    };

    fetchQuestions();
  }, [navigate]);

  // ✅ Countdown timer
  useEffect(() => {
    if (!questions) return;

    console.log("⏳ Starting challenge timer...");
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          console.log("⏰ Timer finished");
          setIsFinished(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log("🧹 Timer cleanup");
      clearInterval(timer);
    };
  }, [questions]);

  // ✅ Submit score after challenge ends
  useEffect(() => {
    if (isFinished && !submittedRef.current && user) {
      submittedRef.current = true;

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
          }
        });
    }
  }, [isFinished, score, user, correctCount, incorrectCount, questions]);

  const getPoints = (timeTaken) => {
    for (const tier of SCORING_TIERS) {
      if (timeTaken <= tier.maxSeconds) return tier.points;
    }
    return 25;
  };

  const handleAnswer = (isCorrect, timeTaken) => {
    console.log(
      `📝 Answer received. Correct: ${isCorrect}, Time: ${timeTaken}s`
    );

    if (isCorrect) {
      const earned = getPoints(timeTaken);
      console.log(`🏅 Earned points: ${earned}`);
      setScore((s) => s + earned);
      setCorrectCount((c) => c + 1);
    } else {
      setIncorrectCount((c) => c + 1);
    }

    goToNextQuestion();
  };

  const goToNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      console.log("➡️ Moving to next question");
      setCurrentIndex((prev) => prev + 1);
      questionStartTimeRef.current = Date.now();
    } else {
      console.log("✅ All questions answered. Ending challenge");
      setIsFinished(true);
    }
  };

  // UI States
  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
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

  if (isFinished) {
    console.log("🏁 Final score:", score);
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

  const renderMode = () => {
    const current = questions[currentIndex];
    const key = `${current.mode}-${current.id}`;

    console.log(
      `🎮 Rendering mode: ${current.mode} (Question ${currentIndex + 1})`
    );

    switch (current.mode) {
      case "word-fill":
        return <WordFillWeekly key={key} quiz={current} onAnswer={handleAnswer} />;
      case "scripture-match":
        return <ScriptureMatchWeekly key={key} quiz={current} onAnswer={handleAnswer} />;
      case "trivia":
        return <TriviaWeekly key={key} quiz={current} onAnswer={handleAnswer} />;
      default:
        console.warn("⚠️ Unknown mode:", current.mode);
        return <div>Unknown mode</div>;
    }
  };

  // Active challenge screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-white to-blue-50 relative overflow-hidden">
      {/* Floating bubbles background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-50" />
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-pink-100 rounded-full blur-2xl opacity-50" />
        <div className="absolute top-1/3 right-10 w-20 h-20 bg-yellow-100 rounded-full blur-2xl opacity-40" />
      </div>
  
      {/* Top HUD */}
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
  
      {/* Main Question Card */}
      <div className="p-6 flex justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-3xl space-y-6 border border-yellow-100 animate-[fadeIn_0.5s_ease]">
          {renderMode()}
        </div>
      </div>
  
      {/* Score feedback badges */}
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
