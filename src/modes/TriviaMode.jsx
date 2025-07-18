import React, { useEffect, useState } from "react";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import { Button } from "components/ui/button";
import ProgressBar from "components/ui/progress";
import { Card } from "components/ui/card";

export default function TriviaMode({ question, answer, options, level, onCorrect }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [status, setStatus] = useState("idle");
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(true);

  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, timerActive]);

  useEffect(() => {
    if (timeLeft === 0) {
      setTimerActive(false);
      if (selectedOption) {
        handleSubmit(); // Auto-submit
      } else {
        setShowTimeUpModal(true);
      }
    }
  }, [timeLeft]);

  const handleSubmit = () => {
    setTimerActive(false);

    if (!selectedOption) return;

    if (selectedOption === answer) {
      setStatus("correct");
      setTimeout(() => {
        setShowRightModal(true);
      }, 300);
    } else {
      setStatus("wrong");
      setTimeout(() => {
        setShowWrongModal(true);
      }, 300);
    }
  };

  const resetLevel = () => {
    setSelectedOption(null);
    setStatus("idle");
    setTimeLeft(30);
    setTimerActive(true);
    setShowRightModal(false);
    setShowWrongModal(false);
    setShowTimeUpModal(false);
  };

  const handleNext = () => {
    setShowRightModal(false);
    onCorrect();
  };

  const backgroundUrl =
    "https://rhanvchqlilmzxmufode.supabase.co/storage/v1/object/public/backgrounds/BG%202.png";

  return (
    <div
      className="min-h-screen flex justify-center items-center bg-cover bg-center px-4"
      style={{ backgroundImage: `url(${backgroundUrl})` }}
    >
      <div className="w-full max-w-xl animate-fade-in-up">
        <Card className="p-8 backdrop-blur-md bg-white/90 border border-gray-200 shadow-xl space-y-6">
          <div className="text-sm text-gray-500 font-medium">
            Phase {level?.phaseNumber} • Level {level?.number}
          </div>

          <div className="text-xl font-bold text-gray-800">{question}</div>

          <div className="space-y-3">
            {options?.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedOption(opt);
                  setStatus("idle");
                }}
                className={`w-full py-3 px-4 rounded-lg border transition text-left ${
                  selectedOption === opt
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {status === "wrong" && (
            <div className="text-sm text-red-500 mt-1">Incorrect. Try again.</div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!selectedOption}
            className="w-full mt-4"
          >
            Submit Answer
          </Button>

          <ProgressBar value={timeLeft} max={30} className="mt-6" />
        </Card>
      </div>

      {/* MODALS */}
      <RightAnswerModal
        isOpen={showRightModal}
        onClose={() => onCorrect()}
        onNext={() => onCorrect()} // stays as next level
        onBackToMap={() => window.location.reload()} // or navigate to Map screen if using React Router
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
