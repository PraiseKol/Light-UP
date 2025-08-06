// WordFillMode.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "components/ui/card";
import { Input } from "components/ui/input";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import ProgressBar from "components/ui/progress";
import { useResetLevel } from "hooks/useResetLevel";
import { useTimer } from "hooks/useTimer";
import { supabase } from "lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

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
}) {
  const userContext = useUser();
  const user = userContext?.id ? userContext : null;

  const [userInput, setUserInput] = useState("");
  const [divineHint, setDivineHint] = useState("");
  const [originalHint, setOriginalHint] = useState(""); // store hint to restore
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(null);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);

  const hasAnsweredCorrectly = useRef(false);
  const lifeLostRef = useRef(false);

  const { timeLeft, setTimeLeft, setIsRunning } = useTimer(30, () => {
    if (!hasAnsweredCorrectly.current && !userInput.trim()) {
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

  // ✅ Grace Period
  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 10);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups?.grace_period, activePowerups, setTimeLeft]);

  // ✅ Divine Hint logic
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
  }, [activePowerups?.divine_hint, answer, activePowerups]);

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

  const saveScore = async (scoreToSave) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("progress").upsert(
        {
          user_id: user.id,
          level_id: level.id,
          mode: "Word Fill",
          score: scoreToSave,
        },
        { onConflict: ["user_id", "level_id"] }
      );
      if (error) console.error("Failed to save WordFill score:", error);
    } catch (err) {
      console.error("Unexpected error saving WordFill score:", err);
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
        hasAnsweredCorrectly.current = true;
        const earned = getScoreFromTime(timeLeft);
        setScore(earned);
        await saveScore(earned);
        if (onScore) onScore(earned);
        setShowRightModal(true);
      } else {
        if (onIncorrect && !lifeLostRef.current) {
          onIncorrect();
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
      className="min-h-screen flex justify-center items-center bg-cover bg-center px-4"
      style={{ backgroundImage: `url(${backgroundUrl})` }}
    >
      <div className="w-full max-w-xl animate-fadeInUp">
        <Card className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl p-6">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 font-medium">
                Phase {level?.phaseNumber} • Level {level?.number} Word Fill
              </div>
              <div className="text-xs text-gray-500 font-semibold">
                {timeLeft}s
              </div>
            </div>
            <ProgressBar value={timeLeft} max={30} />
          </div>

          <CardHeader className="text-xl text-gray-800 leading-snug">
            {question}
          </CardHeader>

          <CardContent>
            <Input
              value={userInput}
              onFocus={() => {
                if (divineHint) setDivineHint(""); // hide hint on focus
              }}
              onBlur={() => {
                if (!userInput.trim() && originalHint) {
                  setDivineHint(originalHint); // restore hint if empty
                }
              }}
              onChange={(e) => {
                setUserInput(e.target.value);
                setStatus("idle");
              }}
              disabled={hasAnsweredCorrectly.current || disableIfNoLives}
              placeholder={
                divineHint
                  ? divineHint
                  : disableIfNoLives
                  ? "Out of lives. Please wait..."
                  : "Type your answer..."
              }
              className={`mb-3 ${
                status === "wrong"
                  ? "border-red-500"
                  : status === "correct"
                  ? "border-green-500"
                  : ""
              }`}
            />

            {status === "wrong" && !disableIfNoLives && (
              <div className="text-sm text-red-500">Incorrect. Try again.</div>
            )}
            {status === "correct" && (
              <div className="text-sm text-green-600 animate-pulse">
                Correct! 🎉
              </div>
            )}

            <button
              onClick={checkAnswer}
              disabled={hasAnsweredCorrectly.current || disableIfNoLives}
              className={`mt-6 w-full py-3 rounded-lg transition ${
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
        onClose={() => onCorrect()}
        onNext={() => onCorrect()}
        onBackToMap={() => window.location.reload()}
      />

      <WrongAnswerModal
        isOpen={showWrongModal}
        onRetry={() => resetLevel({ skipIncorrect: true })}
        onBack={() => window.location.reload()}
      />

      <TimeUpModal
        isOpen={showTimeUpModal}
        onTryAgain={() => resetLevel({ skipIncorrect: true })}
        onGoToMap={() => window.location.reload()}
      />
    </div>
  );
}
