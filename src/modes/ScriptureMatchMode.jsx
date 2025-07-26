import { useEffect, useState, useRef } from "react";
import { useTimer } from "hooks/useTimer";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import ProgressBar from "components/ui/progress";
import { Button } from "components/ui/button";
import { supabase } from "lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";

const scriptureMatchBackground = "https://rhanvchqlilmzxmufode.supabase.co/storage/v1/object/public/backgrounds//ScriptureMatchBackground.png";

export default function ScriptureMatchMode({ question, level, onBack, onCorrect, onScore }) {
  const [pairs, setPairs] = useState([]);
  const [shuffledVerses, setShuffledVerses] = useState([]);
  const [matches, setMatches] = useState({});
  const [draggedVerse, setDraggedVerse] = useState(null);
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(null); // ✅ added

  const hasAnswered = useRef(false);
  const { timeLeft, setIsRunning, reset } = useTimer(30, () => {
    if (hasAnswered.current) return;
    if (Object.keys(matches).length > 0) {
      checkAnswer();
    } else {
      setStatus("timeup");
    }
  });

  const userContext = useUser();
  const user = userContext?.id ? userContext : null;

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

  const calculateScore = () => {
    if (timeLeft > 20) return 100;
    if (timeLeft > 10) return 75;
    if (timeLeft > 0) return 50;
    return 0;
  };

  const saveScore = async (score) => {
    if (!user) return;
    const levelId = level?.id;
    try {
      const { error } = await supabase.from("progress").upsert({
        user_id: user.id,
        level_id: levelId,
        mode: "ScriptureMatch",
        score,
      }, { onConflict: ['user_id', 'level_id'] });
      if (error) console.error("❌ Failed to save score:", error);
    } catch (err) {
      console.error("❌ Unexpected error saving score:", err);
    }
  };

  const checkAnswer = async () => {
    if (hasAnswered.current) return;
    hasAnswered.current = true;
    setIsRunning(false);

    const isCorrect = pairs.every((pair) => matches[pair.reference] === pair.verse);
    if (isCorrect) {
      const calculated = calculateScore();
      setScore(calculated); // ✅ store score in state
      await saveScore(calculated);
      if (onScore) onScore(calculated);
    }
    setStatus(isCorrect ? "correct" : "wrong");
  };

  const resetLevel = () => {
    setMatches({});
    hasAnswered.current = false;
    setStatus("idle");
    setScore(null); // ✅ reset score
    reset();
    const reshuffled = [...pairs].sort(() => Math.random() - 0.5);
    setShuffledVerses(reshuffled);
    setIsRunning(true);
  };

  const isMatched = (verse) => Object.values(matches).includes(verse);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${scriptureMatchBackground})` }}
      />
      <div className="relative z-10 flex justify-center items-center px-4 py-10">
        <div className="w-full max-w-4xl animate-fade-in-up">
          <div className="p-6 rounded-xl shadow-lg bg-white/90 border space-y-6">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 font-medium">
                  Phase {level?.phaseNumber} • Level {level?.number} Scripture Match
                </div>
                <div className="text-xs text-gray-500 font-semibold">
                  {timeLeft}s
                </div>
              </div>
              <ProgressBar value={timeLeft} max={30} />
            </div>

            <div className="grid grid-cols-2 gap-6 mt-4">
              <div>
                <h3 className="font-semibold mb-2">📖 References</h3>
                {pairs.map(({ reference }) => (
                  <div
                    key={reference}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(reference)}
                    className="border p-3 min-h-[60px] mb-3 bg-gray-50 flex items-center justify-between"
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

              <div>
                <h3 className="font-semibold mb-2">📜 Verses</h3>
                {shuffledVerses.map(({ verse }) => (
                  <div
                    key={verse}
                    draggable={!isMatched(verse)}
                    onDragStart={() => setDraggedVerse({ verse })}
                    className={`cursor-move border p-3 rounded-lg mb-3 transition ${
                      isMatched(verse)
                        ? "bg-gray-200 text-gray-500"
                        : "bg-yellow-100 hover:bg-yellow-200 text-black"
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                ✅ Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <RightAnswerModal
        isOpen={status === "correct"}
        score={score} // ✅ show this in the modal
        onClose={onCorrect}
        onNext={onCorrect}
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
