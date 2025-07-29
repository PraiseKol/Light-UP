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

  // UI Feedback

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  if (!questions) {
    return (
      <div className="p-6 text-center text-gray-700">
        Loading Weekly Challenge...
      </div>
    );
  }

  if (isFinished) {
    console.log("🏁 Final score:", score);
    return (
      <div className="p-6 text-center space-y-6 bg-white shadow-md rounded-lg max-w-xl mx-auto mt-12">
        <div className="text-4xl">🎉</div>
        <h2 className="text-3xl font-bold text-green-700">
          Challenge Complete!
        </h2>

        <p className="text-xl font-semibold text-gray-800">
          You scored <span className="text-blue-600">{score} pts</span>
        </p>

        <div className="grid grid-cols-2 gap-4 justify-center text-sm text-gray-700">
          <div className="bg-gray-50 p-4 rounded shadow-inner">
            ✅ <strong>Correct Answers:</strong>
            <div className="text-lg font-bold">{correctCount}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded shadow-inner">
            ❌ <strong>Incorrect Answers:</strong>
            <div className="text-lg font-bold">{incorrectCount}</div>
          </div>
          <div className="col-span-2 bg-gray-50 p-4 rounded shadow-inner">
            📋 <strong>Total Answered:</strong>
            <div className="text-lg font-bold">{questions.length}</div>
          </div>
        </div>

        <button
          onClick={() => {
            console.log("🔙 Returning to /map");
            navigate("/map");
          }}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded shadow"
        >
          Back to Map
        </button>
      </div>
    );
  }

  const current = questions[currentIndex];

  const renderMode = () => {
    const current = questions[currentIndex];
    const key = `${current.mode}-${current.id}`; // 👈 unique per question

    console.log(
      `🎮 Rendering mode: ${current.mode} (Question ${currentIndex + 1})`
    );

    switch (current.mode) {
      case "word-fill":
        return (
          <WordFillWeekly key={key} quiz={current} onAnswer={handleAnswer} />
        );
      case "scripture-match":
        return (
          <ScriptureMatchWeekly
            key={key}
            quiz={current}
            onAnswer={handleAnswer}
          />
        );
      case "trivia":
        return (
          <TriviaWeekly key={key} quiz={current} onAnswer={handleAnswer} />
        );
      default:
        console.warn("⚠️ Unknown mode:", current.mode);
        return <div>Unknown mode</div>;
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto text-center space-y-4">
      <div className="text-gray-600">⏳ Time Left: {timeLeft}s</div>
      <div className="text-gray-800 font-semibold">
        Question {currentIndex + 1} of {questions.length}
      </div>
      <div>{renderMode()}</div>
    </div>
  );
}
