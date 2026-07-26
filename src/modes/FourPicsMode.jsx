import { useState, useEffect, useRef, useCallback } from "react";
import { getQuestion } from "@/lib/getQuestion";
import { useTimer } from "@/hooks/useTimer";
import RightAnswerModal from "@/components/ui/RightAnswerModal";
import WrongAnswerModal from "@/components/ui/WrongAnswerModal";
import TimeUpModal from "@/components/ui/TimeUpModal";
import { useResetLevel } from "@/hooks/useResetLevel";
import ProgressBar from "@/components/ui/progress";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/utils/sound";

export default function FourPicsMode({
  level,
  onBack,
  onCorrect = () => {},
  onScore = () => {},
  onIncorrect,
  activePowerups,
  effectsOn = true,
  gameUser,
}) {
  const INITIAL_TIME = 30;

  const [input, setInput] = useState([]);
  const [usedIndexes, setUsedIndexes] = useState([]);
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [score, setScore] = useState(null);
  const [divineHintApplied, setDivineHintApplied] = useState(false);
  const [user, setUser] = useState(null);
  const [flipIn, setFlipIn] = useState([]); // which tile indices should animate in

  const hasAnswered = useRef(false);
  const lifeLostRef = useRef(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error) setUser(user);
    };
    getUser();
  }, []);

  const { timeLeft, setTimeLeft, setIsRunning } = useTimer(INITIAL_TIME, () => {
    setIsRunning(false);
    if (input.every((slot) => slot === "")) {
      playSound("error", effectsOn);
      handleLifeLoss();
      setShowTimeUpModal(true);
    } else {
      checkAnswer();
    }
  });

  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 15);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  useEffect(() => {
    setLoading(true);
    const loadQuestion = async () => {
      const data = await getQuestion(level.phaseNumber, level.number);
      if (data) {
        setQuestion(data);
        const letters = data.letters?.split("") || [];
        setShuffledLetters(letters.sort(() => Math.random() - 0.5));
        setInput(Array(data.answer.length).fill(""));
        setUsedIndexes([]);
        setDivineHintApplied(false);
        setTimeLeft(INITIAL_TIME);
        setIsRunning(true);
        setFlipIn([]);
      }
      setLoading(false);
    };
    loadQuestion();
  }, [level, setIsRunning, setTimeLeft]);

  const applyDivineHint = useCallback(() => {
    if (!question?.hint_letters || divineHintApplied) return;
    const hintArr = question.hint_letters.toUpperCase().split("");
    const answerLength = question.answer.length;
    setInput((prev) => {
      const arr = [...prev];
      for (let i = 0; i < hintArr.length; i++) {
        arr[answerLength - hintArr.length + i] = hintArr[i];
      }
      return arr;
    });
    setDivineHintApplied(true);
    activePowerups?.setDivineHintUsed?.();
  }, [question, divineHintApplied, activePowerups]);

  useEffect(() => {
    if (activePowerups?.divine_hint && !divineHintApplied) applyDivineHint();
  }, [activePowerups, divineHintApplied, applyDivineHint]);

  const calculateScore = () => {
    if (timeLeft > 20) return 100;
    if (timeLeft > 10) return 75;
    return 50;
  };

  const saveScore = async (earnedScore) => {
    if (!user || !question) return;
    const levelId = question.id || `P${level.phaseNumber}-L${level.number}`;
    try {
      const { data: existing } = await supabase
        .from("progress").select("score")
        .eq("user_id", user.id).eq("level_id", levelId).maybeSingle();
      if (earnedScore > (existing?.score ?? 0)) {
        await supabase.from("progress").upsert(
          { user_id: user.id, level_id: levelId, phase: level.phaseNumber, mode: "FourPics", score: earnedScore },
          { onConflict: ["user_id", "level_id"] }
        );
      }
      setScore(earnedScore);
      onScore(earnedScore);
    } catch (err) { console.error("Failed to save FourPics score:", err); }
  };

  const handleLifeLoss = async () => {
    if (lifeLostRef.current || !user?.id) return;
    lifeLostRef.current = true;
    if (onIncorrect) onIncorrect();
  };

  const checkAnswer = () => {
    if (!question?.answer || hasAnswered.current) return;
    hasAnswered.current = true;
    setIsRunning(false);
    const correct = input.join("").toLowerCase() === question.answer.toLowerCase();
    if (correct) {
      playSound("success", effectsOn);
      lifeLostRef.current = true;
      saveScore(calculateScore());
      setShowRightModal(true);
    } else {
      playSound("error", effectsOn);
      handleLifeLoss();
      setShowWrongModal(true);
    }
  };

  const handleLetterClick = useCallback((letter, idx) => {
    if (hasAnswered.current || usedIndexes.includes(idx)) return;
    const emptyIndex = input.findIndex((ch) => ch === "");
    if (emptyIndex !== -1) {
      setInput((prev) => { const arr = [...prev]; arr[emptyIndex] = letter; return arr; });
      setUsedIndexes((prev) => [...prev, idx]);
      setFlipIn((prev) => [...prev, emptyIndex]);
      setTimeout(() => setFlipIn((prev) => prev.filter((i) => i !== emptyIndex)), 350);
    }
  }, [usedIndexes, input]);

  const handleBackspace = () => {
    if (hasAnswered.current) return;
    for (let i = input.length - 1; i >= 0; i--) {
      if (input[i] !== "") {
        const removed = input[i];
        setInput((prev) => { const arr = [...prev]; arr[i] = ""; return arr; });
        setUsedIndexes((prev) => prev.filter((idx) => shuffledLetters[idx] !== removed));
        break;
      }
    }
  };

  // ⌨️ Enter key submits — this mode has no text <input> to attach a
  // keydown handler to directly (answers are built by clicking letter
  // tiles), so the listener lives on window instead. It's guarded by
  // the exact same condition as the Submit button's `disabled` prop
  // below, so pressing Enter never does anything the button itself
  // wouldn't already allow.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Enter") return;
      if (hasAnswered.current || input.includes("")) return;
      playSound("submitAnswer", effectsOn);
      checkAnswer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [input, effectsOn]);

  const resetLevel = useResetLevel({
    setModals: { setShowRightModal, setShowWrongModal, setShowTimeUpModal },
    setUserInput: () => { setInput(Array(question?.answer?.length || 0).fill("")); setUsedIndexes([]); setDivineHintApplied(false); },
    setTimeLeft: () => { setTimeLeft(INITIAL_TIME); setIsRunning(true); },
    hasAnsweredRef: hasAnswered,
    onReset: () => { lifeLostRef.current = false; },
    reshuffleLetters: () => {
      if (question?.letters) {
        setShuffledLetters(question.letters.split("").sort(() => Math.random() - 0.5));
        setUsedIndexes([]);
      }
    },
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-6 gap-3">
      <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-sm text-gray-500 font-medium">Loading puzzle…</span>
    </div>
  );

  if (!question?.answer || !question?.image_urls) return (
    <div className="p-6 text-center text-red-500 font-bold">❌ Invalid question data.</div>
  );
  if (!user) return <div className="p-6 text-center text-gray-400">Loading user…</div>;

  const images = question.image_urls.split(",").map((url) => url.trim());
  const isShieldActive = gameUser?.holy_shield_until && new Date(gameUser.holy_shield_until) > new Date();
  const livesAfterLoss = isShieldActive ? (gameUser?.lives ?? 0) : Math.max(0, (gameUser?.lives ?? 1) - 1);
  const timerPct = (timeLeft / INITIAL_TIME) * 100;
  const timerColor = timeLeft > 15 ? "text-emerald-400" : timeLeft > 8 ? "text-amber-400" : "text-red-400";

  return (
    <div className="h-full p-1.5 sm:p-3 overflow-hidden flex flex-col">
      <div className="card-3d p-2.5 sm:p-4 lg:p-5 flex-1 flex flex-col min-h-0 gap-2 sm:gap-3">

        {/* Header */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] sm:text-xs font-black text-purple-600 tracking-widest uppercase">
            🖼️ 4 Pics · Phase {level?.phaseNumber} · Level {level?.number}
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

        <ProgressBar value={timeLeft} max={INITIAL_TIME} />

        {/* 4-image grid — desktop gets bigger images */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {images.map((src, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] bg-white aspect-[4/3]">
              <img src={src} alt={`Clue ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white text-[10px] font-black">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Answer tiles — Wordle-style */}
        <div className="flex justify-center gap-1 sm:gap-1.5">
          {input.map((ch, i) => (
            <div
              key={i}
              className={`
                w-8 h-9 sm:w-10 sm:h-11 rounded-lg border-2 flex items-center justify-center
                text-sm sm:text-base font-black transition-all duration-200
                ${ch
                  ? "border-amber-400 bg-amber-50 text-amber-900 shadow-[0_3px_0_#b45309] scale-105"
                  : "border-gray-300 bg-white/60 text-transparent"}
                ${flipIn.includes(i) ? "scale-125" : ""}
              `}
            >
              {ch || "·"}
            </div>
          ))}
        </div>

        {/* Letter tiles */}
        <div className="grid grid-cols-6 gap-1 sm:gap-1.5 max-w-sm mx-auto w-full">
          {shuffledLetters.map((ltr, idx) => {
            const used = usedIndexes.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => { playSound("click", effectsOn); handleLetterClick(ltr, idx); }}
                disabled={used || hasAnswered.current}
                className={`
                  aspect-square rounded-xl border-2 font-black text-xs sm:text-sm
                  transition-all duration-150 active:translate-y-0.5
                  ${used
                    ? "border-gray-200 bg-gray-100 text-gray-300 shadow-none"
                    : "border-white/70 bg-gradient-to-b from-amber-300 to-amber-500 text-white shadow-[0_3px_0_#b45309] hover:from-amber-200 hover:to-amber-400 active:shadow-[0_1px_0_#b45309]"}
                `}
              >
                {ltr}
              </button>
            );
          })}
        </div>

        {/* Action row */}
        <div className="flex justify-center gap-2 mt-auto">
          <button
            onClick={() => { playSound("back", effectsOn); handleBackspace(); }}
            disabled={input.every((slot) => slot === "") || hasAnswered.current}
            className="btn-orb btn-orb-white font-black px-5 py-2 text-sm sm:text-base disabled:opacity-40"
          >
            ⌫ Delete
          </button>
          <button
            onClick={() => { playSound("submitAnswer", effectsOn); checkAnswer(); }}
            disabled={hasAnswered.current || input.includes("")}
            className="btn-orb btn-orb-green font-black px-5 py-2 text-sm sm:text-base disabled:opacity-40"
          >
            ✅ Submit
          </button>
        </div>
      </div>

      <RightAnswerModal isOpen={showRightModal} onClose={onCorrect} onNext={onCorrect} onBackToMap={onBack} score={score} effectsOn={effectsOn} />
      <WrongAnswerModal isOpen={showWrongModal} onRetry={() => resetLevel({ skipIncorrect: true })} onBack={onBack} effectsOn={effectsOn} currentLives={livesAfterLoss} />
      <TimeUpModal isOpen={showTimeUpModal} onTryAgain={() => resetLevel({ skipIncorrect: true })} onGoToMap={onBack} effectsOn={effectsOn} currentLives={livesAfterLoss} />
    </div>
  );
}
