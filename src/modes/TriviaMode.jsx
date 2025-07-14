// src/modes/TriviaMode.jsx
import { useState, useCallback } from "react";
import { Button } from "../components/ui/button";
import RightAnswerModal from "../components/ui/RightAnswerModal";
import WrongAnswerModal from "../components/ui/WrongAnswerModal";
import TimeUpModal from "../components/ui/TimeUpModal";
import { useTimer } from "../hooks/useTimer";
import { triviaQuestions } from "../data/triviaModeData";

export default function TriviaMode({ onComplete, onBack }) {
  const [selected, setSelected] = useState(null);
  const [showRight, setShowRight] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const question = triviaQuestions[0]; // static for now

  const {
    timeLeft,
    setIsRunning,
    reset
  } = useTimer(30, () => {
    if (hasChecked) return;

    if (selected) {
      handleCheck(); // auto-check if player made a choice
    } else {
      setShowTimeUp(true); // no attempt
    }
  });

  const handleCheck = useCallback(() => {
    if (!selected || hasChecked) return;

    const isCorrect = selected === question.answer;
    setHasChecked(true);
    setIsRunning(false); // ✅ Stop timer when user clicks Submit

    if (isCorrect) {
      setShowRight(true);
    } else {
      setShowWrong(true);
    }
  }, [selected, question.answer, hasChecked, setIsRunning]);

  const resetLevel = () => {
    setSelected(null);
    setShowRight(false);
    setShowWrong(false);
    setShowTimeUp(false);
    setHasChecked(false);
    reset();            // 🔄 Reset timer to full
    setIsRunning(true); // ▶️ Resume countdown
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg text-charcoal animate-fadeInUp max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Trivia Challenge</h2>
        <span className="text-sm text-red-500 font-bold">{timeLeft}s</span>
      </div>

      <h3 className="mb-4 font-medium">{question.question}</h3>

      <div className="grid gap-3">
        {question.options.map((option) => (
          <button
            key={option}
            onClick={() => setSelected(option)}
            disabled={hasChecked}
            className={`py-2 px-4 rounded-lg border font-semibold transition-all
              ${
                selected === option
                  ? "bg-blue-100 border-blue-500"
                  : "bg-gray-100 hover:bg-gray-200 border-gray-300"
              }
            `}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Button
          onClick={handleCheck}
          disabled={!selected || hasChecked}
          className="px-6"
        >
          ✅ Submit
        </Button>
      </div>

      {/* Modals */}
      <RightAnswerModal
        isOpen={showRight}
        onClose={() => {
          setShowRight(false);
          setTimeout(() => {
            onBack(); // Return to map
          }, 250);
        }}
        onNext={() => {
          setShowRight(false);
          setTimeout(() => {
            onComplete(); // Go to next level
          }, 250);
        }}
      />

      <WrongAnswerModal
        isOpen={showWrong}
        onRetry={resetLevel}
        onBack={onBack}
      />

      <TimeUpModal
        isOpen={showTimeUp}
        onTryAgain={resetLevel}
        onGoToMap={onBack}
      />
    </div>
  );
}
