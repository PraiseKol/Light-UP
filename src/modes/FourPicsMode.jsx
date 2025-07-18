import { useState, useEffect, useCallback } from "react";
import { useTimer } from "../hooks/useTimer";
import RightAnswerModal from "../components/ui/RightAnswerModal";
import WrongAnswerModal from "../components/ui/WrongAnswerModal";
import TimeUpModal from "../components/ui/TimeUpModal";
import { Button } from "../components/ui/button";
import getQuestion from "../lib/getQuestion";

export default function FourPicsMode({ onComplete, onBack, levelKey }) {
  const [input, setInput] = useState("");
  const [usedIndexes, setUsedIndexes] = useState([]);
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [question, setQuestion] = useState(null);
  const [showRight, setShowRight] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  const { timeLeft, setIsRunning, reset } = useTimer(60, () => {
    if (hasChecked) return;
    input.length > 0 ? handleCheck() : setShowTimeUp(true);
  });

  useEffect(() => {
    const load = async () => {
      const data = await getQuestion(levelKey.phase || 1, levelKey.level, "four-pics");
      setQuestion(data);
      if (data?.letters) {
        const shuffled = data.letters.split("").sort(() => Math.random() - 0.5);
        setShuffledLetters(shuffled);
      }
      setLoading(false);
    };
    load();
  }, [levelKey]);

  const handleLetterClick = useCallback(
    (letter, index) => {
      if (hasChecked || usedIndexes.includes(index)) return;
      setInput((prev) => prev + letter);
      setUsedIndexes((prev) => [...prev, index]);
    },
    [hasChecked, usedIndexes]
  );

  const handleBackspace = useCallback(() => {
    if (hasChecked || input.length === 0) return;
    const lastLetter = input[input.length - 1];
    const indexToRemove = [...usedIndexes].reverse().find(
      (i) => shuffledLetters[i] === lastLetter
    );
    setInput((prev) => prev.slice(0, -1));
    setUsedIndexes((prev) => prev.filter((i) => i !== indexToRemove));
  }, [input, usedIndexes, shuffledLetters, hasChecked]);

  const handleKeyDown = useCallback(
    (e) => {
      if (hasChecked) return;
      if (e.key === "Backspace") {
        handleBackspace();
        return;
      }
      const key = e.key.toUpperCase();
      const index = shuffledLetters.findIndex(
        (ltr, idx) => ltr === key && !usedIndexes.includes(idx)
      );
      if (index !== -1) {
        handleLetterClick(key, index);
      }
    },
    [shuffledLetters, usedIndexes, handleLetterClick, handleBackspace, hasChecked]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleCheck = () => {
    if (!question?.answer) return;
    setHasChecked(true);
    setIsRunning(false);
    const correct = input.toLowerCase() === question.answer.toLowerCase();
    correct ? setShowRight(true) : setShowWrong(true);
  };

  const resetLevel = () => {
    setInput("");
    setUsedIndexes([]);
    setHasChecked(false);
    setShowRight(false);
    setShowWrong(false);
    setShowTimeUp(false);
    reset();
    if (question?.letters) {
      const reshuffled = question.letters.split("").sort(() => Math.random() - 0.5);
      setShuffledLetters(reshuffled);
    }
    setIsRunning(true);
  };

  if (loading) return <div className="p-6 text-center">Loading question...</div>;
  if (!question?.answer || !question?.image_urls) {
    return <div className="p-6 text-center text-red-600">❌ Invalid question data.</div>;
  }

  const images = question.image_urls.split(",").map((url) => url.trim());
  const answerLength = question.answer.length;

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-2xl mx-auto animate-fadeInUp">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-charcoal">Four Pics One Word</h2>
        <span className="text-sm text-red-500 font-bold">{timeLeft}s</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`Hint ${idx + 1}`}
            className="w-full h-32 object-contain rounded-lg shadow bg-white"
          />
        ))}
      </div>

      <div className="flex justify-center gap-2 text-2xl font-bold mb-4">
        {Array.from({ length: answerLength }).map((_, i) => (
          <div
            key={i}
            className="w-10 h-10 border-b-4 border-gold text-center"
          >
            {input[i] || ""}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-3 max-w-md mx-auto mb-6">
        {shuffledLetters.map((letter, idx) => (
          <button
            key={idx}
            onClick={() => handleLetterClick(letter, idx)}
            disabled={usedIndexes.includes(idx) || hasChecked}
            className={`w-10 h-10 text-lg font-bold rounded-lg transition shadow ${
              usedIndexes.includes(idx)
                ? "bg-gray-300 text-gray-500"
                : "bg-gold text-black hover:bg-yellow-400"
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-4">
        <Button
          onClick={handleBackspace}
          disabled={input.length === 0 || hasChecked}
          className="bg-gray-200 hover:bg-gray-300 text-black"
        >
          ⌫
        </Button>
        <Button
          onClick={handleCheck}
          disabled={hasChecked || input.length !== answerLength}
        >
          ✅ Submit
        </Button>
      </div>

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
