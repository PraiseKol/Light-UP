import { useCallback, useRef, useState } from "react";
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
  if (timeLeft > 0) return 50;
  return 0;
};

export default function WordFillMode({
  question,
  answer,
  level,
  onCorrect,
  onScore,
}) {
  const userContext = useUser();
  const user = userContext?.id ? userContext : null;

  const [userInput, setUserInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(null);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const hasAnswered = useRef(false);

  const { timeLeft, setTimeLeft, setIsRunning } = useTimer(30, () => {
    if (hasAnswered.current) return;
    if (userInput.trim()) {
      checkAnswer();
    } else {
      setShowTimeUpModal(true);
    }
  });

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
    hasAnsweredRef: hasAnswered,
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
    stopTimer();
    hasAnswered.current = true;

    const isCorrect =
      userInput.trim().toLowerCase() === answer.trim().toLowerCase();

    setStatus(isCorrect ? "correct" : "wrong");

    setTimeout(async () => {
      if (isCorrect) {
        const earned = getScoreFromTime(timeLeft);
        setScore(earned);
        await saveScore(earned);
        if (onScore) onScore(earned);
        setShowRightModal(true);
      } else {
        setShowWrongModal(true);
      }
    }, 500);
  }, [userInput, answer, timeLeft]);

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
              onChange={(e) => {
                setUserInput(e.target.value);
                setStatus("idle");
              }}
              disabled={status === "correct"}
              placeholder="Type your answer..."
              className={`mb-3 ${
                status === "wrong"
                  ? "border-red-500"
                  : status === "correct"
                  ? "border-green-500"
                  : ""
              }`}
            />

            {status === "wrong" && (
              <div className="text-sm text-red-500">Incorrect. Try again.</div>
            )}
            {status === "correct" && (
              <div className="text-sm text-green-600 animate-pulse">
                Correct! 🎉
              </div>
            )}

            <button
              onClick={checkAnswer}
              disabled={status === "correct"}
              className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Submit Answer
            </button>
          </CardContent>
        </Card>
      </div>

      <RightAnswerModal
        isOpen={showRightModal}
        score={score} // ✅ Pass earned score
        onClose={() => onCorrect()}
        onNext={() => onCorrect()}
        onBackToMap={() => window.location.reload()}
      />

      <WrongAnswerModal
        isOpen={showWrongModal}
        onRetry={resetLevel}
        onBack={() => window.location.reload()}
      />

      <TimeUpModal
        isOpen={showTimeUpModal}
        onTryAgain={resetLevel}
        onGoToMap={() => window.location.reload()}
      />
    </div>
  );
}
