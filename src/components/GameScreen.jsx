// src/screens/GameScreen.jsx
import { useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { useGameUser } from "hooks/useGameUser";
import { supabase } from "lib/supabaseClient";

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

  const {
    gameUser,
    loading: loadingGameUser,
    refetch,
  } = useGameUser(user?.id ?? null);

  const [questionData, setQuestionData] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [userScore, setUserScore] = useState(0);

  // Power‑Up states
  const [activePowerups, setActivePowerups] = useState({});
  const [holyShieldActiveUntil, setHolyShieldActiveUntil] = useState(null);

  // Load the current question
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingQuestion(true);
        if (!level?.phaseNumber || !level?.number) return;

        const q = await getQuestion(level.phaseNumber, level.number);
        setQuestionData(q || null);
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
    onScore?.(scoreForLevel);
  };

  const handleIncorrect = async () => {
    if (!user?.id || gameUser?.lives <= 0) return;
    if (holyShieldActiveUntil && Date.now() < holyShieldActiveUntil) {
      console.log("🛡️ Holy Shield active – no life lost");
      return;
    }
    await loseLife(user.id, gameUser.lives);
    await refetch();
  };

  const onPowerupUsed = async (key) => {
    if (!gameUser?.powerups_inventory?.[key]) return;
    // Deduct from inventory
    await supabase
      .from("game_users")
      .update({
        powerups_inventory: {
          ...gameUser.powerups_inventory,
          [key]: (gameUser.powerups_inventory[key] ?? 0) - 1,
        },
      })
      .eq("user_id", user.id);
    await refetch();
    setActivePowerups((prev) => ({ ...prev, [key]: false }));
  };

  const handleDivineHint = () => {
    if (!gameUser?.powerups_inventory?.divine_hint) return;
    setActivePowerups((prev) => ({ ...prev, divine_hint: true }));
    onPowerupUsed("divine_hint");
  };

  const handleGracePeriod = () => {
    if (!gameUser?.powerups_inventory?.grace_period) return;
    setActivePowerups((prev) => ({ ...prev, grace_period: true }));
    onPowerupUsed("grace_period");
  };

  const handleHolyShield = () => {
    if (!gameUser?.powerups_inventory?.holy_shield) return;
    setHolyShieldActiveUntil(Date.now() + 5 * 60 * 1000);
    onPowerupUsed("holy_shield");
  };

  const handleHeavenlyMatch = () => {
    if (!gameUser?.powerups_inventory?.heavenly_match) return;
  
    // Award max points (100) for this level
    handleScoreEarned(100);
  
    // Deduct from inventory
    onPowerupUsed("heavenly_match");
  
    // Complete the level
    onComplete();
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
    activePowerups,
    holyShieldActiveUntil,
  };

  return (
    <div className="pb-20 p-4 space-y-4 relative">
      {" "}
      {/* pb-20 leaves space for bottom bar */}
      {/* Top bar */}
      <div className="flex justify-between items-center text-sm font-medium text-gray-800">
        <span>Level: {level?.number}</span>
        <span>
          Score: {userScore} | Lives: ❤️ {gameUser?.lives ?? "?"}
        </span>
      </div>
      {/* Game mode rendering */}
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
        <ScriptureMatchMode {...commonProps} question={questionData.question} />
      )}
      {!["word-fill", "trivia", "four-pics", "scripture-match"].includes(
        mode
      ) && (
        <div className="p-6">
          Mode not supported yet: <strong>{mode}</strong>
        </div>
      )}
      {/* Bottom-fixed Power‑Up Bar */}
      {gameUser?.powerups_inventory && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-2 flex justify-around items-center z-50">
          <button
            onClick={handleDivineHint}
            disabled={!gameUser.powerups_inventory.divine_hint}
            className="flex flex-col items-center text-xs"
          >
            💡<span>Divine Hint</span>
            <span>{gameUser.powerups_inventory.divine_hint ?? 0}</span>
          </button>
          <button
            onClick={handleGracePeriod}
            disabled={!gameUser.powerups_inventory.grace_period}
            className="flex flex-col items-center text-xs"
          >
            ⏳<span>Grace Period (+10s)</span>
            <span>{gameUser.powerups_inventory.grace_period ?? 0}</span>
          </button>
          <button
            onClick={handleHolyShield}
            disabled={!gameUser.powerups_inventory.holy_shield}
            className="flex flex-col items-center text-xs"
          >
            🛡️<span>Holy Shield (5 mins)</span>
            <span>{gameUser.powerups_inventory.holy_shield ?? 0}</span>
          </button>
          <button
            onClick={handleHeavenlyMatch}
            disabled={!gameUser.powerups_inventory.heavenly_match}
            className="flex flex-col items-center text-xs"
          >
            ✨<span>Heavenly Match</span>
            <span>{gameUser.powerups_inventory.heavenly_match ?? 0}</span>
          </button>
        </div>
      )}
    </div>
  );
}
