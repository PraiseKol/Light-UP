// src/screens/GameScreen.jsx
import { useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { useGameUser } from "hooks/useGameUser";

import { getQuestion } from "lib/getQuestion";
import { fetchTotalScore } from "lib/fetchTotalScore";
import { loseLife } from "utils/loseLife";

import WordFillMode from "modes/WordFillMode";
import TriviaMode from "modes/TriviaMode";
import FourPicsMode from "modes/FourPicsMode";
import ScriptureMatchMode from "modes/ScriptureMatchMode";

export default function GameScreen({ level, onBack, onComplete, onScore }) {
  const maybeUser = useUser();
  const user = maybeUser ?? null;

  const { gameUser, loading: loadingGameUser, refetch } = useGameUser(user?.id ?? null);

  const [questionData, setQuestionData] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [userScore, setUserScore] = useState(0);

  // Load the current question
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingQuestion(true);

        if (!level?.phaseNumber || !level?.number) {
          console.warn("⚠️ Invalid level object:", level);
          setLoadingQuestion(false);
          return;
        }

        const q = await getQuestion(level.phaseNumber, level.number);
        if (q) {
          setQuestionData(q);
        } else {
          console.error("❌ No question returned for this level.");
        }
      } catch (err) {
        console.error("‼️ Error while loading question:", err);
      } finally {
        setLoadingQuestion(false);
      }
    };

    if (level) load();
  }, [level]);

  // Load total score
  useEffect(() => {
    const loadScore = async () => {
      if (user?.id) {
        const total = await fetchTotalScore(user.id);
        setUserScore(total);
      }
    };

    loadScore();
  }, [user]);

  const handleScoreEarned = (scoreForLevel) => {
    setUserScore((prev) => prev + scoreForLevel);
    if (onScore) onScore(scoreForLevel);
  };

  const handleIncorrect = async () => {
    if (!user?.id || gameUser?.lives <= 0) return;

    console.log("💔 handleIncorrect: Losing a life...");
    await loseLife(user.id, gameUser.lives);

    // 🔁 Refresh gameUser lives
    await refetch();
  };

  if (!user) return <div className="p-6">Loading user...</div>;
  if (loadingQuestion || loadingGameUser)
    return <div className="p-6">Loading game...</div>;
  if (!questionData) return <div className="p-6">No question found.</div>;

  const { mode } = questionData;

  const commonProps = {
    level,
    onBack,
    onCorrect: onComplete,
    onIncorrect: handleIncorrect,
    onScore: handleScoreEarned,
    disableIfNoLives: gameUser?.lives <= 0,
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center text-sm font-medium text-gray-800">
        <span>Level: {level?.number}</span>
        <span>
          Score: {userScore} | Lives: ❤️ {gameUser?.lives ?? "?"}
        </span>
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
