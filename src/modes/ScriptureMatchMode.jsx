import { useEffect, useState, useRef } from "react";
import { useTimer } from "hooks/useTimer";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import ProgressBar from "components/ui/progress";
import { Button } from "components/ui/button";

const scriptureMatchBackground =
  "https://rhanvchqlilmzxmufode.supabase.co/storage/v1/object/public/backgrounds//ScriptureMatchBackground.png";

export default function ScriptureMatchMode({ question, level, onBack, onCorrect }) {
  const [pairs, setPairs] = useState([]);
  const [shuffledVerses, setShuffledVerses] = useState([]);
  const [matches, setMatches] = useState({});
  const [draggedVerse, setDraggedVerse] = useState(null);
  const [status, setStatus] = useState("idle");
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
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* ✅ Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${scriptureMatchBackground})` }}
      />

      {/* ✅ Foreground Game Content */}
      <div className="relative z-10 flex justify-center items-center px-4 py-10">
        <div className="w-full max-w-4xl animate-fade-in-up">
          <div className="p-6 rounded-xl shadow-lg bg-white/90 border border-gray-200 space-y-6">
            {/* Header and Timer */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 font-medium">
                  Phase {level?.phaseNumber} • Level {level?.number} Scripture Match (Drag and Drop)
                </div>
                <div className="text-xs text-gray-500 font-semibold">
                  {timeLeft}s
                </div>
              </div>
              <ProgressBar value={timeLeft} max={30} />
            </div>

            {/* Matching Grid */}
            <div className="grid grid-cols-2 gap-6 mt-4">
              {/* References (Drop Targets) */}
              <div>
                <h3 className="font-semibold mb-2">📖 References</h3>
                {pairs.map(({ reference }) => (
                  <div
                    key={reference}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(reference)}
                    className="border border-gray-300 rounded-lg p-3 min-h-[60px] mb-3 bg-gray-50 flex items-center justify-between"
                  >
                    <span>{reference}</span>
                    {matches[reference] && (
                      <span className="ml-2 text-sm text-blue-700 font-medium">
                        {matches[reference]}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Draggable Verses */}
              <div>
                <h3 className="font-semibold mb-2">📜 Verses</h3>
                {shuffledVerses.map(({ verse }) => (
                  <div
                    key={verse}
                    draggable={!isMatched(verse)}
                    onDragStart={() => setDraggedVerse({ verse })}
                    className={`cursor-move border p-3 rounded-lg mb-3 shadow-sm transition ${
                      isMatched(verse)
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-yellow-100 hover:bg-yellow-200 text-black"
                    }`}
                  >
                    {verse}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mt-6">
              <Button
                disabled={
                  hasAnswered.current ||
                  Object.keys(matches).length !== pairs.length
                }
                onClick={checkAnswer}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                ✅ Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Modals */}
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
