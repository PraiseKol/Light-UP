// src/modes/ScriptureMatchMode.jsx
import { useEffect, useState, useRef } from "react";
import { useTimer } from "hooks/useTimer";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import { Button } from "components/ui/button";

export default function ScriptureMatchMode({ question, level, onBack, onCorrect }) {
  const [pairs, setPairs] = useState([]);
  const [shuffledVerses, setShuffledVerses] = useState([]);
  const [matches, setMatches] = useState({});
  const [draggedVerse, setDraggedVerse] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, correct, wrong, timeup
  const hasAnswered = useRef(false);

  const { timeLeft, setIsRunning, reset } = useTimer(30, () => {
    if (hasAnswered.current) return;
    const isAnyMatched = Object.keys(matches).length > 0;
    if (isAnyMatched) {
      checkAnswer();
    } else {
      setStatus("timeup");
    }
  });

  useEffect(() => {
    try {
      const parsed = JSON.parse(question);
      setPairs(parsed);
      const shuffled = [...parsed].sort(() => Math.random() - 0.5);
      setShuffledVerses(shuffled);
    } catch (err) {
      console.error("❌ Failed to parse question JSON:", err);
    }
  }, [question]);

  const handleDrop = (ref) => {
    if (draggedVerse) {
      setMatches((prev) => ({
        ...prev,
        [ref]: draggedVerse.verse,
      }));
    }
  };

  const checkAnswer = () => {
    hasAnswered.current = true;
    setIsRunning(false);
    const correct = pairs.every(
      (pair) => matches[pair.reference] === pair.verse
    );
    setStatus(correct ? "correct" : "wrong");
  };

  const resetLevel = () => {
    setMatches({});
    hasAnswered.current = false;
    setStatus("idle");
    reset();
    const reshuffled = [...pairs].sort(() => Math.random() - 0.5);
    setShuffledVerses(reshuffled);
    setIsRunning(true);
  };

  const isMatched = (verse) =>
    Object.values(matches).includes(verse);

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-3xl mx-auto animate-fadeInUp">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-charcoal">Scripture Match</h2>
        <span className="text-sm text-red-500 font-bold">{timeLeft}s</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* References (Drop targets) */}
        <div>
          <h3 className="font-semibold mb-2">References</h3>
          {pairs.map(({ reference }) => (
            <div
              key={reference}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(reference)}
              className="border border-gray-300 rounded-lg p-3 min-h-[60px] mb-3 bg-gray-50 flex items-center justify-between"
            >
              <span>{reference}</span>
              {matches[reference] && (
                <span className="ml-2 text-sm text-blue-700 font-medium">{matches[reference]}</span>
              )}
            </div>
          ))}
        </div>

        {/* Draggable Verses */}
        <div>
          <h3 className="font-semibold mb-2">Verses</h3>
          {shuffledVerses.map(({ verse }) => (
            <div
              key={verse}
              draggable={!isMatched(verse)}
              onDragStart={() => setDraggedVerse({ verse })}
              className={`cursor-move border p-3 rounded-lg mb-3 shadow-sm transition ${
                isMatched(verse)
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-gold text-black hover:bg-yellow-300"
              }`}
            >
              {verse}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <Button
          disabled={hasAnswered.current || Object.keys(matches).length !== pairs.length}
          onClick={checkAnswer}
        >
          ✅ Submit
        </Button>
      </div>

      <RightAnswerModal
        isOpen={status === "correct"}
        onClose={() => onCorrect()}
        onNext={() => onCorrect()}
        onBackToMap={() => window.location.reload()}
      />

      <WrongAnswerModal
        isOpen={status === "wrong"}
        onRetry={resetLevel}
        onBack={onBack}
      />

      <TimeUpModal
        isOpen={status === "timeup"}
        onTryAgain={resetLevel}
        onGoToMap={onBack}
      />
    </div>
  );
}
