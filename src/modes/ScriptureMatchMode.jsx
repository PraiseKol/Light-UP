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
  gameUser, // ✅ Add gameUser prop
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


  const timerPct = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 15 ? "text-emerald-400" : timeLeft > 8 ? "text-amber-400" : "text-red-400";
  const allMatched = Object.keys(matches).length === pairs.length;

  return (
    <div className="h-full p-1.5 sm:p-3 overflow-hidden flex flex-col">
      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col min-h-0">
        <div className="card-3d p-2.5 sm:p-4 lg:p-5 flex-1 flex flex-col min-h-0 gap-2 sm:gap-3">

          {/* Header */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] sm:text-xs font-black text-purple-600 tracking-widest uppercase">
              📖 Scripture Match · Phase {level?.phaseNumber} · Level {level?.number}
            </span>
            <div className={`relative flex items-center justify-center w-10 h-10 ${timerColor}`}>
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - timerPct / 100)}`}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <span className="text-xs font-black z-10">{timeLeft}</span>
            </div>
          </div>

          <ProgressBar value={timeLeft} max={30} />

          {/* Match grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 flex-1 min-h-0 overflow-auto">

            {/* References column */}
            <div className="flex flex-col gap-1.5">
              <h3 className="font-black text-[11px] sm:text-sm text-indigo-700 mb-0.5">📖 References</h3>
              {pairs.map(({ reference }) => {
                const isSelected = selectedReference === reference;
                const isMatched = !!matches[reference];
                return (
                  <div
                    key={reference}
                    onClick={() => handleReferenceClick(reference)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(reference)}
                    className={`
                      min-h-[38px] sm:min-h-[48px] px-2.5 py-1.5 rounded-xl border-2 cursor-pointer
                      flex items-center justify-between gap-1
                      text-[11px] sm:text-sm font-semibold transition-all duration-150
                      ${isMatched
                        ? "bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-400 text-emerald-800"
                        : isSelected
                        ? "bg-indigo-100 border-indigo-400 text-indigo-800 ring-2 ring-indigo-300"
                        : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"}
                    `}
                  >
                    <span className="font-bold truncate">{reference}</span>
                    {isMatched && (
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] sm:text-[10px] text-emerald-600 max-w-[60px] truncate">
                          {matches[reference].substring(0, 12)}…
                        </span>
                        {!hintedRefs.has(reference) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUndo(reference); }}
                            className="text-red-400 hover:text-red-600 leading-none text-base"
                          >✕</button>
                        )}
                      </span>
                    )}
                    {!isMatched && (
                      <span className="text-gray-300 text-base">→</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Verses column */}
            <div className="flex flex-col gap-1.5">
              <h3 className="font-black text-[11px] sm:text-sm text-amber-700 mb-0.5">📜 Verses</h3>
              {shuffledVerses.map(({ verse }) => {
                const matched = isMatched(verse);
                const isSelected = selectedVerse === verse;
                return (
                  <div
                    key={verse}
                    draggable={!matched}
                    onDragStart={() => setDraggedVerse({ verse })}
                    onClick={() => handleVerseClick(verse)}
                    className={`
                      min-h-[38px] sm:min-h-[48px] px-2.5 py-1.5 rounded-xl border-2 cursor-pointer
                      text-[11px] sm:text-sm leading-snug transition-all duration-150
                      ${matched
                        ? "bg-emerald-100 border-emerald-300 text-emerald-700 opacity-60 cursor-default"
                        : isSelected
                        ? "bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-300 shadow-md"
                        : "bg-white border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50"}
                    `}
                  >
                    {verse}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              {pairs.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < Object.keys(matches).length ? "bg-emerald-400 scale-125" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <button
              disabled={hasAnswered.current || !allMatched}
              onClick={() => { playSound("submitAnswer", effectsOn); checkAnswer(); }}
              className="btn-orb btn-orb-green font-black px-5 py-2 text-sm sm:text-base
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {allMatched ? "✅ Submit" : `Match ${Object.keys(matches).length}/${pairs.length}`}
            </button>
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
