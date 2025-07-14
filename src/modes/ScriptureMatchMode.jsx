// src/modes/ScriptureMatchMode.jsx
import { useEffect, useState, useMemo } from "react";
import { useTimer } from "../hooks/useTimer";
import RightAnswerModal from "../components/ui/RightAnswerModal";
import WrongAnswerModal from "../components/ui/WrongAnswerModal";
import TimeUpModal from "../components/ui/TimeUpModal";
import { scripturePairs } from "../data/scriptureMatchData";
import { Button } from "../components/ui/button";

export default function ScriptureMatchMode({ onComplete, onBack }) {
  const [matches, setMatches] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);

  const leftItems = useMemo(() => scripturePairs.map((pair) => pair.reference), []);
  const rightItems = useMemo(() => {
    const verses = scripturePairs.map((pair) => pair.verse);
    for (let i = verses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [verses[i], verses[j]] = [verses[j], verses[i]];
    }
    return verses;
  }, []);

  const { timeLeft, setIsRunning, reset } = useTimer(30, () => {
    if (hasChecked) return;
    if (matches.length === scripturePairs.length) {
      handleCheck();
    } else {
      setShowTimeUp(true);
    }
  });

  const handleDrop = (ref) => {
    if (!dragging) return;
    const exists = matches.find((m) => m.left === ref);
    if (!exists) {
      setMatches((prev) => [...prev, { left: ref, right: dragging }]);
    }
    setDragging(null);
  };

  const handleRemoveMatch = (ref) => {
    setMatches(matches.filter((m) => m.left !== ref));
  };

  const handleCheck = () => {
    setHasChecked(true);
    setIsRunning(false);

    const allCorrect = scripturePairs.every((pair) =>
      matches.find((m) => m.left === pair.reference && m.right === pair.verse)
    );

    if (allCorrect && matches.length === scripturePairs.length) {
      setShowRight(true);
    } else {
      setShowWrong(true);
    }
  };

  const resetLevel = () => {
    setMatches([]);
    setDragging(null);
    setHasChecked(false);
    setShowRight(false);
    setShowWrong(false);
    setShowTimeUp(false);
    reset();
  };

  const isMatched = (verse) => matches.find((m) => m.right === verse);

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-5xl mx-auto animate-fadeInUp">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-charcoal">Scripture Match</h2>
        <span className="text-sm text-red-500 font-bold">{timeLeft}s</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* References (Droppable) */}
        <div>
          <h3 className="text-lg font-medium mb-2">Scripture References</h3>
          {leftItems.map((ref) => {
            const matched = matches.find((m) => m.left === ref);
            return (
              <div
                key={ref}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => !hasChecked && handleDrop(ref)}
                className="p-3 rounded-lg border mb-2 bg-gray-100 hover:bg-gray-200 border-gray-300 transition"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{ref}</span>
                  {matched && (
                    <button
                      className="ml-2 text-sm text-red-500 hover:underline"
                      onClick={() => handleRemoveMatch(ref)}
                      disabled={hasChecked}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {matched ? matched.right : <span className="italic text-gray-400">Drop verse here</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verses (Draggable) */}
        <div>
          <h3 className="text-lg font-medium mb-2">Verses (Drag to Reference)</h3>
          {rightItems.map((verse) => (
            <div
              key={verse}
              draggable={!hasChecked && !isMatched(verse)}
              onDragStart={() => setDragging(verse)}
              className={`p-3 rounded-lg border mb-2 transition cursor-move 
                ${isMatched(verse)
                  ? "bg-green-100 border-green-500 cursor-not-allowed"
                  : "bg-white hover:bg-blue-50 border-gray-300"
                }`}
            >
              {verse}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Button
          onClick={handleCheck}
          disabled={hasChecked || matches.length < scripturePairs.length}
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
