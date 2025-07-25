import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "components/ui/card";
import ProgressBar from "components/ui/progress";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import { Button } from "components/ui/button";
import { useTimer } from "hooks/useTimer";
import { useResetLevel } from "hooks/useResetLevel";

const triviaBackground =
  "https://rhanvchqlilmzxmufode.supabase.co/storage/v1/object/public/backgrounds/TriviaBackground.png";

export default function TriviaMode({ level, question, answer, options, onBack, onCorrect }) {
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("idle");
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const hasAnswered = useRef(false);

  const { timeLeft, reset, setIsRunning } = useTimer(30, () => {
    if (hasAnswered.current) return;
    if (selected) {
      checkAnswer();
    } else {
      setStatus("timeup");
      setShowTimeUpModal(true);
    }
  });

  const resetLevel = useResetLevel({
    setModals: {
      setShowRightModal,
      setShowWrongModal,
      setShowTimeUpModal,
    },
    setUserInput: null,
    setStatus,
    setTimeLeft: reset,        // ⬅️ key fix: reset timer back to 30
    setIsRunning,
    hasAnsweredRef: hasAnswered,
  });
  

  const checkAnswer = () => {
    if (hasAnswered.current) return;
    hasAnswered.current = true;
    setIsRunning(false);

    const isCorrect = selected?.trim().toLowerCase() === answer.trim().toLowerCase();
    setStatus(isCorrect ? "correct" : "wrong");

    setTimeout(() => {
      if (isCorrect) {
        setShowRightModal(true);
      } else {
        setShowWrongModal(true);
      }
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex justify-center items-center bg-cover bg-center px-4"
      style={{ backgroundImage: `url(${triviaBackground})` }}
    >
      <div className="w-full max-w-xl animate-fadeInUp">
        <Card className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl p-6">
        <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 font-medium">
                  Phase {level?.phaseNumber} • Level {level?.number} Trivia
                </div>
                <div className="text-xs text-gray-500 font-semibold">
                  {timeLeft}s
                </div>
              </div>
              <ProgressBar value={timeLeft} max={30} />
            </div>

          <CardHeader className="text-xl text-gray-800 mb-4">{question}</CardHeader>

          <CardContent>
            <div className="space-y-3 mb-6">
              {options.map((opt, i) => {
                const isSelected = selected === opt;
                const isDisabled = hasAnswered.current;

                return (
                  <button
                    key={i}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!hasAnswered.current) setSelected(opt);
                    }}
                    className={`w-full px-4 py-3 rounded-md text-left border transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-100 font-semibold"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={checkAnswer}
              disabled={!selected || hasAnswered.current}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              ✅ Submit
            </Button>
          </CardContent>
        </Card>
      </div>

      <RightAnswerModal
        isOpen={showRightModal}
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
