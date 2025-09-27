// src/screens/GameScreen.jsx
import { useNavigate } from "react-router-dom";
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

import HolyShieldButton from "components/HolyShieldButton";
import { playSound } from "utils/sound";
import { awardBonus } from "utils/talentUtils";

export default function GameScreen({
  level,
  onBack,
  onComplete,
  onScore,
  effectsOn,
}) {
  const maybeUser = useUser();
  const user = maybeUser ?? null;

  const [gameOver, setGameOver] = useState(false);

  const {
    gameUser,
    loading: loadingGameUser,
    refetch,
  } = useGameUser(user?.id ?? null);

  // Mark player as in game when screen mounts
  useEffect(() => {
    if (!user?.id) return;

    const markInGame = async () => {
      await supabase
        .from("game_users")
        .update({ in_game: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      await refetch(); // ✅ refresh state
    };

    const markOutOfGame = async () => {
      await supabase
        .from("game_users")
        .update({ in_game: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    };

    markInGame();

    // On unmount, mark player as NOT in game
    return () => {
      // Fire and forget — we don't await inside cleanup
      markOutOfGame();
    };
  }, [user?.id, refetch]);

  const [questionData, setQuestionData] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [userScore, setUserScore] = useState(0);
  const [activePowerups, setActivePowerups] = useState({});
  const navigate = useNavigate();

  // Load current question
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

  const [consecutivePerfects, setConsecutivePerfects] = useState(0);

  const handleScoreEarned = async (scoreForLevel) => {
    setUserScore((prev) => prev + scoreForLevel);
    onScore?.(scoreForLevel);

    if (scoreForLevel === 100) {
      setConsecutivePerfects((prev) => {
        const newCount = prev + 1;
        if (newCount > 0 && newCount % 5 === 0) {
          // 🎯 Award accuracy bonus every 5 perfects in a row
          awardBonus(user.id, "accuracy", `streak-${newCount}`);
        }

        return newCount;
      });
    } else {
      setConsecutivePerfects(0); // reset streak
    }
  };

  const handleIncorrect = async () => {
    if (!user?.id || gameUser?.lives <= 0) return;

    // ✅ Block life loss if Holy Shield is active
    if (
      gameUser?.holy_shield_until &&
      new Date(gameUser.holy_shield_until).getTime() > Date.now()
    ) {
      console.log("🛡️ Holy Shield active – no life lost");
      return;
    }

    await loseLife(user.id, gameUser.lives);

    // If that was their last life, mark them as out of game
    if (gameUser.lives - 1 <= 0) {
      await supabase
        .from("game_users")
        .update({ in_game: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      await refetch();
    }

    await refetch();
  };

  const onPowerupUsed = async (key) => {
    if (!gameUser?.powerups_inventory?.[key]) return;
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
    playSound("divineHint", effectsOn); // 🔊 play sound
    onPowerupUsed("divine_hint");
  };

  const handleGracePeriod = () => {
    if (!gameUser?.powerups_inventory?.grace_period) return;
    setActivePowerups((prev) => ({ ...prev, grace_period: true }));
    playSound("gracePeriod", effectsOn); // 🔊 play sound
    onPowerupUsed("grace_period");
  };

  // ✅ Allow modes to reset Grace Period after applying it
  const setGraceUsed = () => {
    setActivePowerups((prev) => ({ ...prev, grace_period: false }));
  };

  const handleHeavenlyMatch = () => {
    if (!gameUser?.powerups_inventory?.heavenly_match) return;
    handleScoreEarned(100);
    playSound("heavenlyMatch", effectsOn); // 🔊 play sound
    onPowerupUsed("heavenly_match");
    onComplete();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-200 via-blue-50 to-white">
        <div className="flex flex-col items-center bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl p-8 max-w-sm w-full animate-fadeIn">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-1">
            Loading user...
          </h2>
          <p className="text-sm text-gray-500 text-center">
            Hang tight ⚡ Preparing your adventure
          </p>
        </div>
      </div>
    );
  }

  if (loadingQuestion || loadingGameUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-green-200 via-green-50 to-white">
        <div className="flex flex-col items-center bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl p-8 max-w-sm w-full animate-fadeIn">
          <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-1">
            Loading game...
          </h2>
          <p className="text-sm text-gray-500 text-center">
            Setting the stage for your next challenge 🎯
          </p>
        </div>
      </div>
    );
  }

  if (!questionData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-200 via-blue-50 to-white px-4">
        <div className="text-6xl mb-4 animate-bounce">😢</div>
        <div className="text-2xl font-bold mb-2 text-blue-700">
          No Question Yet
        </div>
        <p className="text-sm text-gray-600 text-center max-w-xs">
          This level hasn’t been unlocked yet. Try another challenge or check
          back soon.
        </p>
        <button
          onClick={() => navigate("/map")}
          className="mt-6 px-5 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-md transition-all"
        >
          Return to Map
        </button>
      </div>
    );
  }

  const handleLevelComplete = async () => {
    // Run the existing callback
    onComplete?.();

    // 🔍 Now check if this phase is fully completed with perfect 100s
    if (!user?.id || !level?.phaseNumber) return;

    try {
      // Get all level IDs in this phase from progress table
      const { data: phaseLevels, error: levelError } = await supabase
        .from("progress")
        .select("level_id")
        .eq("phase", level.phaseNumber)
        .order("created_at"); // optional: keep order consistent

      if (levelError || !phaseLevels?.length) return;

      const levelIds = phaseLevels.map((lvl) => lvl.level_id);

      // Get this player's scores for those levels
      const { data: scores, error: scoreError } = await supabase
        .from("progress")
        .select("score, level_id")
        .eq("user_id", user.id)
        .in("level_id", levelIds);

      if (scoreError || !scores) return;

      const allPerfect =
        scores.length === levelIds.length &&
        scores.every((row) => row.score === 100);

      if (allPerfect) {
        console.log("🏆 Awarding perfect phase bonus");
        await awardBonus(
          user.id,
          "perfect_phase",
          `phase-${level.phaseNumber}`
        );
      }

      if (scores.length === levelIds.length) {
        console.log("✅ Awarding phase completion bonus");
        await awardBonus(
          user.id,
          "phase_completion",
          `phase-${level.phaseNumber}`
        );
      }
    } catch (err) {
      console.error("❌ Error checking perfect_phase:", err);
    }
  };

  const { mode } = questionData;
  const isHolyShieldActive =
    gameUser?.holy_shield_until &&
    new Date(gameUser.holy_shield_until).getTime() > Date.now();

    const handleBack = () => {
      if (level?.phaseNumber && level?.number) {
        console.log(
          `🔙 Back pressed from Phase ${level.phaseNumber}, Level ${level.number}`
        );
      }
      onBack?.(level?.phaseNumber, level?.number);
    };
    
    const commonProps = {
      level,
      onBack: handleBack, // 👈 smarter version here
      onCorrect: handleLevelComplete,
      onIncorrect: handleIncorrect,
      onScore: handleScoreEarned,
      disableIfNoLives: gameUser?.lives <= 0,
      activePowerups: { ...activePowerups, setGraceUsed },
    };
    

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-blue-50 to-blue-100">
      {/* Constrain width on mobile */}
      <div className="w-full sm:max-w-full md:max-w-2xl lg:max-w-3xl mx-auto h-[calc(100vh-120px)] overflow-y-auto p-2 text-sm sm:p-4 sm:text-base bg-white/70 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-lg">
        {/* Top HUD (fixed) */}
        <div className="flex justify-between items-center px-2 md:px-3 py-1 md:py-2 bg-white/40 backdrop-blur-md rounded-xl shadow-md text-sm sm:text-base sticky top-0 z-20">
          <span className="flex items-center gap-2">
            <span className="text-lg">📜</span> Level {level?.number}
          </span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              ⭐ <span>{userScore}</span>
            </span>
            <span
              className={`flex items-center gap-1 ${
                isHolyShieldActive
                  ? "animate-pulse text-yellow-500 font-bold drop-shadow-[0_0_6px_rgba(255,223,0,0.8)]"
                  : ""
              }`}
            >
              ❤️ {gameUser?.lives ?? "?"}
            </span>
          </span>
        </div>

        {/* Scrollable Game mode area */}
        <div className="flex-1 overflow-y-auto p-1 md:p-2 spcae-y-1 md:space-y-2">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-lg p-1 md:p-2 sm:p-4 text-sm sm:text-base">
            {mode === "word-fill" && (
              <WordFillMode
                {...commonProps}
                question={questionData.question}
                answer={questionData.answer}
                effectsOn={effectsOn}
              />
            )}
            {mode === "trivia" && (
              <TriviaMode
                {...commonProps}
                question={questionData.question}
                options={questionData.options}
                answer={questionData.answer}
                effectsOn={effectsOn}
              />
            )}
            {mode === "four-pics" && (
              <FourPicsMode
                {...commonProps}
                answer={questionData.answer}
                imageUrls={questionData.image_urls}
                letters={questionData.letters}
                effectsOn={effectsOn}
              />
            )}
            {mode === "scripture-match" && (
              <ScriptureMatchMode
                {...commonProps}
                question={questionData.question}
                effectsOn={effectsOn}
              />
            )}
            {!["word-fill", "trivia", "four-pics", "scripture-match"].includes(
              mode
            ) && (
              <div className="p-6 text-center text-gray-700">
                Mode not supported yet: <strong>{mode}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Power-Up Bar (fixed at bottom) */}

      {gameUser?.powerups_inventory && (
        <div className="sticky bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-300 p-2 sm:p-3 flex justify-around items-center z-50 shadow-lg text-[10px] sm:text-xs">
          <button
            onClick={handleDivineHint}
            disabled={!gameUser.powerups_inventory.divine_hint}
            className="flex flex-col items-center font-semibold w-[22%] px-1 sm:px-2 py-1 rounded-lg bg-gradient-to-b from-blue-200 to-blue-300 hover:from-blue-300 hover:to-blue-400 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 transition"
          >
            🧩<span>Divine Hint</span>
            <span className="text-[10px] sm:text-xs">
              x{gameUser.powerups_inventory.divine_hint ?? 0}
            </span>
          </button>
          <button
            onClick={handleGracePeriod}
            disabled={!gameUser.powerups_inventory.grace_period}
            className="flex flex-col items-center text-xs font-semibold w-[23%] px-2 py-1 rounded-lg bg-gradient-to-b from-purple-200 to-purple-300 hover:from-purple-300 hover:to-purple-400 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 transition"
          >
            ⏳<span> Grace Period +15s</span>
            <span className="text-[10px] sm:text-xs">
              x{gameUser.powerups_inventory.grace_period ?? 0}
            </span>
          </button>

          <HolyShieldButton
            user={user}
            gameUser={gameUser}
            refetch={refetch}
            effectsOn={effectsOn}
          />

          <button
            onClick={handleHeavenlyMatch}
            disabled={!gameUser.powerups_inventory.heavenly_match}
            className="flex flex-col items-center text-[10px] sm:text-xs font-semibold w-[22%] px-1 sm:px-2 py-1 rounded-lg bg-gradient-to-b from-yellow-200 to-yellow-300 hover:from-yellow-300 hover:to-yellow-400 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 transition"
          >
            👑<span>Heavenly Match</span>
            <span className="text-[10px] sm:text-xs">
              x{gameUser.powerups_inventory.heavenly_match ?? 0}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
