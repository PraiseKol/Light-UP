import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import RightAnswerModal from "@/components/ui/RightAnswerModal";
import WrongAnswerModal from "@/components/ui/WrongAnswerModal";
import TimeUpModal from "@/components/ui/TimeUpModal";
import ProgressBar from "@/components/ui/progress";
import { useResetLevel } from "@/hooks/useResetLevel";
import { useTimer } from "@/hooks/useTimer";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { playSound } from "@/utils/sound";

const getScoreFromTime = (timeLeft) => {
  if (timeLeft > 20) return 100;
  if (timeLeft > 10) return 75;
  return 50;
};

export default function WordFillMode({
  question,
  answer,
  level,
  onCorrect,
  onScore,
  onIncorrect,
  disableIfNoLives,
  activePowerups,
  effectsOn = true,
  onBack,
  gameUser, // ✅ Add gameUser prop
}) {
  const userContext = useUser();
  const user = userContext?.id ? userContext : null;

  const [userInput, setUserInput] = useState("");
  const [divineHint, setDivineHint] = useState("");
  const [originalHint, setOriginalHint] = useState("");
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(null);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);

  const hasAnsweredCorrectly = useRef(false);
  const lifeLostRef = useRef(false);

  const { timeLeft, setTimeLeft, setIsRunning } = useTimer(30, () => {
    setIsRunning(false); // ✅ Stop timer FIRST
    if (!hasAnsweredCorrectly.current && !userInput.trim()) {
      playSound("error", effectsOn);
      if (onIncorrect && !lifeLostRef.current) {
        lifeLostRef.current = true;
        onIncorrect();
      }
      setShowTimeUpModal(true);
    } else if (!hasAnsweredCorrectly.current) {
      checkAnswer();
    }
  });

  // Grace Period
  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 15);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  // Divine Hint
  useEffect(() => {
    if (activePowerups?.divine_hint && answer) {
      const cleanAnswer = answer.trim();
      if (cleanAnswer.length >= 2) {
        const hint =
          cleanAnswer[0] +
          "_".repeat(cleanAnswer.length - 2) +
          cleanAnswer[cleanAnswer.length - 1];
        setDivineHint(hint);
        setOriginalHint(hint);
        activePowerups?.setDivineHintUsed?.();
      }
    }
  }, [activePowerups, answer]);

  const stopTimer = () => setIsRunning(false);

  const resetLevel = useResetLevel({
    setModals: {
      setShowRightModal,
      setShowWrongModal,
      setShowTimeUpModal,
    },
    setUserInput,
    setStatus,
    setTimeLeft,
    setIsRunning,
    hasAnsweredRef: hasAnsweredCorrectly,
    onIncorrect,
    forceIncorrectLifeLoss: true,
    lifeLostRef,
  });

  const saveScore = async (earnedScore) => {
    if (!user || !level) return;

    const levelId = `phase-${level.phaseNumber}-level-${level.number}`; // unique levelId

    try {
      const { data: existing } = await supabase
        .from("progress")
        .select("score")
        .eq("user_id", user.id)
        .eq("level_id", levelId)
        .maybeSingle();

      const oldScore = existing?.score ?? 0;

      if (earnedScore > oldScore) {
        await supabase.from("progress").upsert(
          {
            user_id: user.id,
            level_id: levelId,
            phase: level.phaseNumber,
            mode: "Word Fill",
            score: earnedScore,
          },
          { onConflict: ["user_id", "level_id"] }
        );
      }
    } catch (err) {
      console.error("Failed to save WordFill score:", err);
    }
  };

  const checkAnswer = useCallback(() => {
    if (hasAnsweredCorrectly.current || disableIfNoLives) return;

    setIsRunning(false); // ✅ Stop timer FIRST

    const isCorrect =
      userInput.trim().toLowerCase() === answer.trim().toLowerCase();
    setStatus(isCorrect ? "correct" : "wrong");

    setTimeout(async () => {
      if (isCorrect) {
        playSound("success", effectsOn);
        hasAnsweredCorrectly.current = true;
        lifeLostRef.current = true; // ✅ Prevent any life loss on correct answer
        const earned = getScoreFromTime(timeLeft);
        setScore(earned);
        await saveScore(earned);
        if (onScore) onScore(earned);
        setShowRightModal(true);
      } else {
        playSound("error", effectsOn);
        if (onIncorrect && !lifeLostRef.current) {
          lifeLostRef.current = true;
          onIncorrect();
        }
        setShowWrongModal(true);
      }
    }, 300);
  }, [userInput, answer, timeLeft, disableIfNoLives, setIsRunning, onIncorrect, onScore, effectsOn]);

  // Calculate expected lives after loss (accounting for Holy Shield)
  const isShieldActive = gameUser?.holy_shield_until && new Date(gameUser.holy_shield_until) > new Date();
  const livesAfterLoss = isShieldActive 
    ? (gameUser?.lives ?? 0) 
    : Math.max(0, (gameUser?.lives ?? 1) - 1);

  return (
    <div className="h-full flex justify-center items-center p-2 sm:p-4">
      <div className="w-full max-w-xl">
        <Card className="bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(255,255,255,0.2),0_0_80px_rgba(236,72,153,0.15)] border-2 border-pink-300/50 rounded-2xl p-3 sm:p-4">
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <div className="text-[10px] sm:text-xs text-gray-600 font-medium">
                Phase {level?.phaseNumber} • Level {level?.number} • Word Fill
              </div>
              <div className="text-xs sm:text-sm text-gray-500 font-semibold">
                {timeLeft}s
              </div>
            </div>
            <ProgressBar value={timeLeft} max={30} />
          </div>

          <CardHeader className="text-sm sm:text-lg text-gray-800 leading-snug p-0 mb-3">
            {question}
          </CardHeader>

          <CardContent className="p-0">
            <Input
              value={userInput}
              onFocus={() => divineHint && setDivineHint("")}
              onBlur={() => {
                if (!userInput.trim() && originalHint) setDivineHint(originalHint);
              }}
              onChange={(e) => {
                setUserInput(e.target.value);
                playSound("switch", effectsOn);
                setStatus("idle");
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !hasAnsweredCorrectly.current &&
                  !disableIfNoLives
                ) {
                  playSound("submitAnswer", effectsOn);
                  checkAnswer();
                }
              }}
              disabled={hasAnsweredCorrectly.current || disableIfNoLives}
              placeholder={
                divineHint
                  ? divineHint
                  : disableIfNoLives
                  ? "Out of lives. Please wait..."
                  : "Type your answer..."
              }
              className={`mb-3 text-sm sm:text-base ${
                status === "wrong"
                  ? "border-red-500"
                  : status === "correct"
                  ? "border-green-500"
                  : ""
              }`}
            />

            <button
              onClick={() => {
                playSound("submitAnswer", effectsOn);
                checkAnswer();
              }}
              disabled={hasAnsweredCorrectly.current || disableIfNoLives}
              className={`w-full py-2 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all ${
                disableIfNoLives
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-b from-pink-400 via-pink-500 to-pink-600 text-white shadow-[0_4px_0_#be185d,0_6px_10px_rgba(190,24,93,0.4)] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#be185d]"
              }`}
            >
              {disableIfNoLives ? "⏰ No Lives Left" : "✅ Submit Answer"}
            </button>
          </CardContent>
        </Card>
      </div>

  <RightAnswerModal
    isOpen={showRightModal}
    score={score}
    onClose={onCorrect}
    onNext={onCorrect}
    onBackToMap={onBack}
    effectsOn={effectsOn}
  />

      <WrongAnswerModal
        isOpen={showWrongModal}
        onRetry={() => resetLevel({ skipIncorrect: true })}
        onBack={onBack}
        effectsOn={effectsOn}
        currentLives={livesAfterLoss}
      />

      <TimeUpModal
        isOpen={showTimeUpModal}
        onTryAgain={() => resetLevel({ skipIncorrect: true })}
        onGoToMap={onBack}
        effectsOn={effectsOn}
        currentLives={livesAfterLoss}
      />
    </div>
  );
}
