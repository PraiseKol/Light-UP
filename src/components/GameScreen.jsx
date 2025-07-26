// src/screens/GameScreen.jsx
import { useEffect, useState } from "react";
import { getQuestion } from "lib/getQuestion";
import { fetchTotalScore } from "lib/fetchTotalScore";
import { useUser } from "@supabase/auth-helpers-react";

import WordFillMode from "modes/WordFillMode";
import TriviaMode from "modes/TriviaMode";
import FourPicsMode from "modes/FourPicsMode";
import ScriptureMatchMode from "modes/ScriptureMatchMode";

export default function GameScreen({ level, onBack, onComplete, onScore }) {
  const [questionData, setQuestionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userScore, setUserScore] = useState(0);

  const user = useUser();

  // Load the current question
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (!level?.phaseNumber || !level?.number) {
        console.warn("Invalid level:", level);
        setLoading(false);
        return;
      }

      const q = await getQuestion(level.phaseNumber, level.number);
      if (q) {
        setQuestionData(q);
      } else {
        console.error("No question found for this level.");
      }

      setLoading(false);
    };

    load();
  }, [level]);

  // Load total score from DB
  useEffect(() => {
    const loadScore = async () => {
      if (user?.id) {
        const total = await fetchTotalScore(user.id);
        setUserScore(total);
      }
    };

    loadScore();
  }, [user]);

  // Handle score update on correct answer
  const handleScoreEarned = (scoreForLevel) => {
    setUserScore((prev) => prev + scoreForLevel);
    if (onScore) onScore(scoreForLevel); // if parent needs it
  };

  if (loading) return <div className="p-6">Loading game...</div>;
  if (!questionData) return <div className="p-6">No question found.</div>;

  const { mode } = questionData;

  const commonProps = {
    level,
    onBack,
    onCorrect: onComplete,
    onScore: handleScoreEarned, // 👈 inject score handler
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center text-sm font-medium text-gray-800">
        <span>Level: {level?.number}</span>
        <span>Total Score: {userScore}</span>
      </div>

      {mode === "word-fill" && (
        <WordFillMode
          {...commonProps}
          question={questionData.question}
          answer={questionData.answer}
        />
      )}

      {mode === "trivia" && (
        <TriviaMode
          {...commonProps}
          question={questionData.question}
          options={questionData.options}
          answer={questionData.answer}
        />
      )}

      {mode === "four-pics" && (
        <FourPicsMode
          {...commonProps}
          answer={questionData.answer}
          imageUrls={questionData.image_urls}
          letters={questionData.letters}
        />
      )}

      {mode === "scripture-match" && (
        <ScriptureMatchMode
          {...commonProps}
          question={questionData.question}
        />
      )}

      {!["word-fill", "trivia", "four-pics", "scripture-match"].includes(mode) && (
        <div className="p-6">
          Mode not supported yet: <strong>{mode}</strong>
        </div>
      )}
    </div>
  );
}
