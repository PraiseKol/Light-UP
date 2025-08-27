import { useEffect, useState, useRef, useCallback } from "react";
import { useTimer } from "hooks/useTimer";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import ProgressBar from "components/ui/progress";
import { Button } from "components/ui/button";
import { supabase } from "lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { useResetLevel } from "hooks/useResetLevel";
import { playSound } from "utils/sound";

const scriptureMatchBackground =
  "https://rhanvchqlilmzxmufode.supabase.co/storage/v1/object/public/backgrounds//ScriptureMatchBackground.png";

export default function ScriptureMatchMode({
  question,
  level,
  onBack,
  onCorrect,
  onScore,
  onIncorrect,
  activePowerups,
  effectsOn = true,
}) {
  const [pairs, setPairs] = useState([]);
  const [shuffledVerses, setShuffledVerses] = useState([]);
  const [matches, setMatches] = useState({});
  const [draggedVerse, setDraggedVerse] = useState(null);
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(null);

  const hasAnswered = useRef(false);
  const lifeLostRef = useRef(false);

  const userContext = useUser();
  const user = userContext?.id ? userContext : null;

  const { timeLeft, setIsRunning, setTimeLeft, reset } = useTimer(30, () => {
    if (!hasAnswered.current) checkAnswer();
  });

  // Grace Period
  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 15);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  // Load question JSON
  useEffect(() => {
    try {
      const parsed = JSON.parse(question);
      setPairs(parsed);
      setShuffledVerses([...parsed].sort(() => Math.random() - 0.5));
    } catch (err) {
      console.error("❌ Failed to parse question JSON:", err);
    }
  }, [question]);

  // Divine Hint
  useEffect(() => {
    if (pairs.length > 0 && activePowerups?.divine_hint) {
      const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
      setMatches((prev) => ({
        ...prev,
        [randomPair.reference]: randomPair.verse,
      }));

      setShuffledVerses((prev) =>
        prev.map((v) =>
          v.verse === randomPair.verse ? { ...v, matchedByHint: true } : v
        )
      );

      activePowerups?.setDivineHintUsed?.();
    }
  }, [pairs, activePowerups]);

  const handleLifeLoss = useCallback(() => {
    if (lifeLostRef.current) return;
    lifeLostRef.current = true;
    if (onIncorrect) onIncorrect();
  }, [onIncorrect]);

  const calculateScore = useCallback(() => {
    if (timeLeft > 20) return 100;
    if (timeLeft > 10) return 75;
    return 50;
  }, [timeLeft]);

  const saveScore = useCallback(
    async (earnedScore) => {
      if (!user) return;
      try {
        const levelId = level.id || `P${level.phaseNumber}-L${level.number}`;
        const { data: existing } = await supabase
          .from("progress")
          .select("score")
          .eq("user_id", user.id)
          .eq("level_id", levelId)
          .maybeSingle();

        const oldScore = existing?.score ?? 0;

        if (earnedScore > oldScore) {
          await supabase.from("progress").upsert(
            {
              user_id: user.id,
              level_id: levelId,
              phase: level.phaseNumber,
              mode: "ScriptureMatch",
              score: earnedScore,
            },
            { onConflict: ["user_id", "level_id"] }
          );
        }

        setScore(earnedScore);
        if (onScore) onScore(earnedScore);
      } catch (err) {
        console.error("❌ Failed to save ScriptureMatch score:", err);
      }
    },
    [user, level, onScore]
  );

  const checkAnswer = useCallback(() => {
    if (hasAnswered.current) return;
    hasAnswered.current = true;
    setIsRunning(false);

    const isCorrect = pairs.every(
      (pair) => matches[pair.reference] === pair.verse
    );
    if (isCorrect) {
      playSound("success", effectsOn);
      const earned = calculateScore();
      saveScore(earned);
      setStatus("correct");
    } else {
      playSound("error", effectsOn);
      handleLifeLoss();
      setStatus("wrong");
    }
  }, [
    pairs,
    matches,
    calculateScore,
    saveScore,
    handleLifeLoss,
    effectsOn,
    setIsRunning,
  ]);

  const resetLevel = useResetLevel({
    setModals: {
      setShowRightModal: (open) => {
        if (!open) setStatus("idle");
      },
      setShowWrongModal: (open) => {
        if (!open) setStatus("idle");
      },
      setShowTimeUpModal: (open) => {
        if (!open) setStatus("idle");
      },
    },
    setUserInput: () => {
      setMatches({});
    },
    setTimeLeft: reset,
    setIsRunning,
    hasAnsweredRef: hasAnswered,
    reshuffleLetters: () => {
      setShuffledVerses([...pairs].sort(() => Math.random() - 0.5));
    },
    onReset: () => {
      lifeLostRef.current = false;
    },
  });

  const handleDrop = (ref) => {
    if (draggedVerse)
      setMatches((prev) => ({ ...prev, [ref]: draggedVerse.verse }));
  };

  const isMatched = (verse) =>
    Object.values(matches).includes(verse) ||
    shuffledVerses.find((v) => v.verse === verse)?.matchedByHint;

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${scriptureMatchBackground})` }}
      />
      <div className="relative z-10 flex justify-center items-center px-4 py-10">
        <div className="w-full max-w-4xl animate-fade-in-up">
        <div className="mb-20 md:mb-auto"></div>
          <div className="p-6 rounded-xl shadow-lg bg-white/90 border space-y-4 md:space-y-6">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="text-xs md:text-sm text-gray-600 font-medium">
                  Phase {level?.phaseNumber} • Level {level?.number} Scripture
                  Match
                </div>
                <div className="text-[10px] md:text-xs text-gray-500 font-semibold">
                  {timeLeft}s
                </div>
              </div>
              <ProgressBar value={timeLeft} max={30} />
            </div>

            <div className="grid grid-cols-2 gap-5 md:gap-6 mt-3 md:mt-4">
              <div>
                <h3 className="font-semibold mb-1 md:mb-2">📖 References</h3>
                {pairs.map(({ reference }) => (
                  <div
                    key={reference}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={() => handleDrop(reference)}
                    className="border p-2 md:p-3 min-h[40px] md:min-h-[60px] mb-2 md:mb-3 bg-gray-50 flex items-center justify-between"
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
                <h3 className="font-semibold mb-1 md:mb-2">📜 Verses</h3>
                {shuffledVerses.map(({ verse }) => (
                  <div
                    key={verse}
                    draggable={!isMatched(verse)}
                    onDragStart={() => setDraggedVerse({ verse })}
                    className={`cursor-move border p-2 md:p-3 rounded-lg mb-2 md:mb-3 transition ${
                      isMatched(verse)
                        ? "bg-green-200 text-gray-700"
                        : "bg-yellow-100 hover:bg-yellow-200 text-black"
                    }`}
                  >
                    {verse}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-5 md:mt-6">
              <Button
                disabled={
                  hasAnswered.current ||
                  Object.keys(matches).length !== pairs.length
                }
                onClick={() => {
                  playSound("submitAnswer", effectsOn);
                  checkAnswer();
                }}
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
        score={score}
        onClose={onCorrect}
        onNext={onCorrect}
        onBackToMap={onBack}
        effectsOn={effectsOn}
      />
      <WrongAnswerModal
        isOpen={status === "wrong"}
        onRetry={() => resetLevel({ skipIncorrect: true })}
        onBack={onBack}
        effectsOn={effectsOn}
      />
      <TimeUpModal
        isOpen={status === "timeup"}
        onTryAgain={() => resetLevel({ skipIncorrect: true })}
        onGoToMap={onBack}
        effectsOn={effectsOn}
      />
    </div>
  );
}
