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
    }, 150);
  }, [userInput, answer, timeLeft, disableIfNoLives, setIsRunning, onIncorrect, onScore, effectsOn]);

  // Calculate expected lives after loss (accounting for Holy Shield)
  const isShieldActive = gameUser?.holy_shield_until && new Date(gameUser.holy_shield_until) > new Date();
  const livesAfterLoss = isShieldActive 
    ? (gameUser?.lives ?? 0) 
    : Math.max(0, (gameUser?.lives ?? 1) - 1);

  return (
    <div className="h-full flex flex-col justify-center items-center p-1.5 sm:p-3 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="card-3d p-2.5 sm:p-4">
          <div className="space-y-1.5 mb-2">
            <div className="flex justify-between items-center">
              <div className="text-[10px] sm:text-xs text-gray-600 font-bold truncate">
                P{level?.phaseNumber} • L{level?.number} • Word Fill
              </div>
              <div className="chip-3d chip-3d-star text-[10px] sm:text-sm !py-0.5 !px-2">
                ⏱️ {timeLeft}s
              </div>
            </div>
            <ProgressBar value={timeLeft} max={30} />
          </div>

          <CardHeader className="text-xs sm:text-base text-gray-800 leading-snug p-0 mb-2 max-h-[28vh] overflow-auto">
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
              className={`mb-2 text-sm sm:text-base rounded-2xl border-2 shadow-inner ${
                status === "wrong"
                  ? "border-red-500"
                  : status === "correct"
                  ? "border-green-500"
                  : "border-purple-200"
              }`}
            />

            <button
              onClick={() => {
                playSound("submitAnswer", effectsOn);
                checkAnswer();
              }}
              disabled={hasAnsweredCorrectly.current || disableIfNoLives}
              className={`btn-orb w-full py-2 sm:py-3 font-black text-sm sm:text-base ${
                disableIfNoLives ? "btn-orb-white" : "btn-orb-pink"
              }`}
            >
              {disableIfNoLives ? "⏰ No Lives Left" : "✅ Submit Answer"}
            </button>
          </CardContent>
        </div>
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
