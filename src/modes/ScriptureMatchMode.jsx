import { useEffect, useState, useRef, useCallback } from "react";
import { useTimer } from "@/hooks/useTimer";
import RightAnswerModal from "@/components/ui/RightAnswerModal";
import WrongAnswerModal from "@/components/ui/WrongAnswerModal";
import TimeUpModal from "@/components/ui/TimeUpModal";
import ProgressBar from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { useResetLevel } from "@/hooks/useResetLevel";
import { playSound } from "@/utils/sound";

// Removed background image - using candy gradient instead

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
  const [selectedReference, setSelectedReference] = useState(null);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(null);
  const [hintedRefs, setHintedRefs] = useState(new Set()); // track divine hint references

  const hasAnswered = useRef(false);
  const lifeLostRef = useRef(false);
  const prevHintUsed = useRef(false); // prevents double hint triggering

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

  // Divine Hint → only triggers when hint flips on
  useEffect(() => {
    if (pairs.length === 0) return;

    if (activePowerups?.divine_hint && !prevHintUsed.current) {
      prevHintUsed.current = true; // prevent multiple triggers

      const unmatchedPairs = pairs.filter(
        (p) => !matches[p.reference] && !hintedRefs.has(p.reference)
      );
      if (unmatchedPairs.length === 0) return;

      const randomPair =
        unmatchedPairs[Math.floor(Math.random() * unmatchedPairs.length)];

      setMatches((prev) => ({
        ...prev,
        [randomPair.reference]: randomPair.verse,
      }));

      setHintedRefs((prev) => new Set(prev).add(randomPair.reference));

      setShuffledVerses((prev) =>
        prev.map((v) =>
          v.verse === randomPair.verse ? { ...v, matchedByHint: true } : v
        )
      );

      activePowerups?.setDivineHintUsed?.();
    }

    if (!activePowerups?.divine_hint) {
      prevHintUsed.current = false; // reset when powerup flag turns off
    }
  }, [activePowerups, pairs, matches, hintedRefs]);

  const handleLifeLoss = useCallback(() => {
    if (lifeLostRef.current) return;
    lifeLostRef.current = true;
    onIncorrect?.();
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
        onScore?.(earnedScore);
      } catch (err) {
        console.error("❌ Failed to save ScriptureMatch score:", err);
      }
    },
    [user, level, onScore]
  );

  const checkAnswer = useCallback(() => {
    if (hasAnswered.current) return;
    hasAnswered.current = true;
    
    // Stop timer immediately to prevent any further ticks
    setIsRunning(false);

    const isCorrect = pairs.every(
      (pair) => matches[pair.reference] === pair.verse
    );

    if (isCorrect) {
      lifeLostRef.current = true; // Prevent life loss on back
      playSound("success", effectsOn);
      const earned = calculateScore();
      saveScore(earned);
      setStatus("correct");
    } else {
      playSound("error", effectsOn);
      onIncorrect?.(); // Lose life when wrong answer detected
      setStatus("wrong");
    }
  }, [pairs, matches, calculateScore, saveScore, onIncorrect, effectsOn, setIsRunning]);

  const resetLevel = useResetLevel({
    setModals: {
      setShowRightModal: (open) => !open && setStatus("idle"),
      setShowWrongModal: (open) => !open && setStatus("idle"),
      setShowTimeUpModal: (open) => !open && setStatus("idle"),
    },
    setUserInput: () => {
      // preserve hint-locked matches, clear manual ones
      setMatches((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([ref]) => hintedRefs.has(ref))
        )
      );
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

  // ✅ Drag & Drop
  const handleDrop = (ref) => {
    if (draggedVerse) {
      setMatches((prev) => ({ ...prev, [ref]: draggedVerse.verse }));
      setDraggedVerse(null);
    }
  };

  // ✅ Click-to-Match
  const handleReferenceClick = (reference) => {
    if (matches[reference]) return; // already matched
    setSelectedReference(reference);
    if (selectedVerse) {
      setMatches((prev) => ({ ...prev, [reference]: selectedVerse }));
      setSelectedReference(null);
      setSelectedVerse(null);
    }
  };

  const handleVerseClick = (verse) => {
    if (isMatched(verse)) return;
    setSelectedVerse(verse);
    if (selectedReference) {
      setMatches((prev) => ({ ...prev, [selectedReference]: verse }));
      setSelectedReference(null);
      setSelectedVerse(null);
    }
  };

  // ✅ Undo match (but not Divine Hint matches)
  const handleUndo = (reference) => {
    if (hintedRefs.has(reference)) return; // locked by hint
    setMatches((prev) => {
      const updated = { ...prev };
      delete updated[reference];
      return updated;
    });
  };

  const isMatched = (verse) =>
    Object.values(matches).includes(verse) ||
    shuffledVerses.find((v) => v.verse === verse)?.matchedByHint;

  // Calculate expected lives after loss (accounting for Holy Shield)
  const isShieldActive = gameUser?.holy_shield_until && new Date(gameUser.holy_shield_until) > new Date();
  const livesAfterLoss = isShieldActive 
    ? (gameUser?.lives ?? 0) 
    : Math.max(0, (gameUser?.lives ?? 1) - 1);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#1a365d] via-[#2d3748] to-[#1a202c]">
      <div className="relative z-10 flex justify-center items-center px-4 py-10">
        <div className="w-full max-w-4xl animate-fade-in-up">
          <div className="mb-20 md:mb-auto"></div>
          <div className="p-6 rounded-2xl shadow-[0_8px_0_#be185d,0_12px_20px_rgba(190,24,93,0.4)] bg-gradient-to-br from-white/95 via-pink-50/90 to-purple-50/90 border-2 border-pink-200 space-y-4 md:space-y-6">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="text-xs md:text-sm text-gray-600 font-medium">
                  Phase {level?.phaseNumber} • Level {level?.number} Scripture
                  Match. Tip - Drag R - L or Simply Click to Match
                </div>
                <div className="text-[10px] md:text-xs text-gray-500 font-semibold">
                  {timeLeft}s
                </div>
              </div>
              <ProgressBar value={timeLeft} max={30} />
            </div>

            <div className="grid grid-cols-2 gap-5 md:gap-6 mt-3 md:mt-4">
              {/* References */}
              <div>
                <h3 className="font-semibold mb-1 md:mb-2">📖 References</h3>
                {pairs.map(({ reference }) => (
                  <div
                    key={reference}
                    onClick={() => handleReferenceClick(reference)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(reference)}
                    className={`border p-2 md:p-3 min-h-[40px] md:min-h-[60px] mb-2 md:mb-3 flex items-center justify-between cursor-pointer ${
                      selectedReference === reference
                        ? "bg-blue-100"
                        : "bg-gray-50"
                    }`}
                  >
                    <span>{reference}</span>
                    {matches[reference] && (
                      <span className="ml-2 text-xs md:text-sm text-blue-700 font-medium flex items-center gap-2">
                        {matches[reference]}
                        {!hintedRefs.has(reference) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUndo(reference);
                            }}
                            className="text-red-500 hover:text-red-700 text-[10px]"
                          >
                            ❌
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Verses */}
              <div>
                <h3 className="font-semibold mb-1 md:mb-2">📜 Verses</h3>
                {shuffledVerses.map(({ verse }) => (
                  <div
                    key={verse}
                    draggable={!isMatched(verse)}
                    onDragStart={() => setDraggedVerse({ verse })}
                    onClick={() => handleVerseClick(verse)}
                    className={`cursor-pointer border p-2 md:p-3 rounded-lg mb-2 md:mb-3 transition ${
                      isMatched(verse)
                        ? "bg-green-200 text-gray-700"
                        : selectedVerse === verse
                        ? "bg-yellow-300"
                        : "bg-yellow-100 hover:bg-yellow-200 text-black"
                    }`}
                  >
                    {verse}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
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
                className="bg-gradient-to-b from-pink-400 via-pink-500 to-pink-600 text-white font-bold rounded-full shadow-[0_4px_0_#be185d,0_6px_10px_rgba(190,24,93,0.4)] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#be185d] px-8 py-3"
              >
                ✅ Submit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RightAnswerModal
        isOpen={status === "correct"}
        score={score}
        onClose={onCorrect}
        onNext={onCorrect}
        onBackToMap={() => {
          // ✅ Ensure no life loss when navigating back after correct answer
          hasAnswered.current = true;
          lifeLostRef.current = true;
          setIsRunning(false);
          onBack();
        }}
        effectsOn={effectsOn}
      />
      <WrongAnswerModal
        isOpen={status === "wrong"}
        currentLives={livesAfterLoss}
        onRetry={() => resetLevel({ skipIncorrect: true })}
        onBack={onBack}
        effectsOn={effectsOn}
      />
      <TimeUpModal
        isOpen={status === "timeup"}
        currentLives={livesAfterLoss}
        onTryAgain={() => resetLevel({ skipIncorrect: true })}
        onGoToMap={onBack}
        effectsOn={effectsOn}
      />
    </div>
  );
}
