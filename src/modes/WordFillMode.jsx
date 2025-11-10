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
    if (!hasAnsweredCorrectly.current && !userInput.trim()) {
      playSound("error", effectsOn);
      setShowTimeUpModal(true);
      if (onIncorrect && !lifeLostRef.current) {
        onIncorrect();
        lifeLostRef.current = true;
      }
    } else if (!hasAnsweredCorrectly.current) {
      checkAnswer();
    }
    setIsRunning(false);
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

    stopTimer();

    const isCorrect =
      userInput.trim().toLowerCase() === answer.trim().toLowerCase();
    setStatus(isCorrect ? "correct" : "wrong");

    setTimeout(async () => {
      if (isCorrect) {
        playSound("success", effectsOn);
        hasAnsweredCorrectly.current = true;
        const earned = getScoreFromTime(timeLeft);
        setScore(earned);
        await saveScore(earned);
        if (onScore) onScore(earned);
        setShowRightModal(true);
      } else {
        if (onIncorrect && !lifeLostRef.current) {
          onIncorrect();
          playSound("error", effectsOn);
          lifeLostRef.current = true;
        }
        setShowWrongModal(true);
      }
    }, 300);
  }, [userInput, answer, timeLeft, disableIfNoLives]);

  const backgroundUrl =
    "https://rhanvchqlilmzxmufode.supabase.co/storage/v1/object/public/backgrounds//WordFillBackground.jpg";

  return (
    <div
      className="min-h-screen flex justify-center items-center bg-cover bg-center px-4 " 
      style={{ backgroundImage: `url(${backgroundUrl})` }}
    >
      <div className="w-full max-w-xl animate-fadeInUp ">
        <Card className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl p-4 md:p-6">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="text-xs md:text-sm text-gray-600 font-normal md:font-medium">
                Phase {level?.phaseNumber} • Level {level?.number} Word Fill
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 font-semibold">
                {timeLeft}s
              </div>
            </div>
            <ProgressBar value={timeLeft} max={30} />
          </div>

          <CardHeader className="text-sm md:text-xl text-gray-800 leading-snug">
            {question}
          </CardHeader>

          <CardContent>
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
              className={`mb-2 md:mb-3 ${
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
              className={`mt-4 md:mt-6 w-full py-2 md:py-3 rounded-lg transition ${
                disableIfNoLives
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {disableIfNoLives ? "No Lives Left" : "Submit Answer"}
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
      />

      <TimeUpModal
        isOpen={showTimeUpModal}
        onTryAgain={() => resetLevel({ skipIncorrect: true })}
        onGoToMap={onBack}
        effectsOn={effectsOn}
      />
    </div>
  );
}
