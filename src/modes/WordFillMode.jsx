// src/modes/WordFillMode.jsx
import { useState } from "react";
import { Button } from "../components/ui/button";
import RightAnswerModal from "../components/ui/RightAnswerModal";
import WrongAnswerModal from "../components/ui/WrongAnswerModal";
import TimeUpModal from "../components/ui/TimeUpModal";
import { useTimer } from "../hooks/useTimer";
import { wordFillData } from "../data/wordFillData";

export default function WordFillMode({ onComplete, onBack }) {
  const [input, setInput] = useState("");
  const [showRight, setShowRight] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const { clue, answer } = wordFillData[0];

  const handleCheck = () => {
    if (!input || hasChecked) return;
    setHasChecked(true);

    const isCorrect = input.trim().toLowerCase() === answer.toLowerCase();
    if (isCorrect) {
      setShowRight(true);
    } else {
      setShowWrong(true);
    }

    setIsRunning(false); // Stop timer when submitted
  };

  const { timeLeft, setIsRunning, reset } = useTimer(30, () => {
    if (hasChecked) return;

    if (input) {
      handleCheck();
    } else {
      setShowTimeUp(true);
    }
  });

  const resetLevel = () => {
    setInput("");
    setShowRight(false);
    setShowWrong(false);
    setShowTimeUp(false);
    setHasChecked(false);
    reset();
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg text-charcoal animate-fadeInUp max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Word Fill</h2>
        <span className="text-sm text-red-500 font-bold">{timeLeft}s</span>
      </div>

      <p className="mb-4 text-lg font-medium">{clue}</p>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={hasChecked}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
        placeholder="Type your answer"
      />

      <div className="text-center">
        <Button
          onClick={handleCheck}
          disabled={!input || hasChecked}
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
          onBack();
        }}
        onNext={() => {
          setShowRight(false);
          onComplete();
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
