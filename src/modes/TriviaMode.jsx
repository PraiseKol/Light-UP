import { useState, useRef, useEffect } from "react";
import ProgressBar from "@/components/ui/progress";
import RightAnswerModal from "@/components/ui/RightAnswerModal";
import WrongAnswerModal from "@/components/ui/WrongAnswerModal";
import TimeUpModal from "@/components/ui/TimeUpModal";
import { useTimer } from "@/hooks/useTimer";
import { useResetLevel } from "@/hooks/useResetLevel";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { playSound } from "@/utils/sound";

const getScoreFromTime = (timeLeft) => {
  if (timeLeft > 20) return 100;
  if (timeLeft > 10) return 75;
  return 50;
};

const OPTION_STYLES = [
  "from-blue-400 to-blue-600 shadow-[0_4px_0_#1d4ed8] hover:from-blue-300 hover:to-blue-500",
  "from-amber-400 to-amber-600 shadow-[0_4px_0_#b45309] hover:from-amber-300 hover:to-amber-500",
  "from-emerald-400 to-emerald-600 shadow-[0_4px_0_#065f46] hover:from-emerald-300 hover:to-emerald-500",
  "from-purple-400 to-purple-600 shadow-[0_4px_0_#581c87] hover:from-purple-300 hover:to-purple-500",
];

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function TriviaMode({
  level,
  question,
  answer,
  options,
  onBack,
  onCorrect,
  onScore,
  onIncorrect,
  activePowerups,
  effectsOn = true,
  gameUser,
}) {
  const userContext = useUser();
  const user = userContext?.id ? userContext : null;

  const [selected, setSelected] = useState(null);
  const [displayOptions, setDisplayOptions] = useState(options || []);
  const [status, setStatus] = useState("idle");
  const [score, setScore] = useState(0);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [revealResult, setRevealResult] = useState(null); // "correct" | "wrong" | null

  const hasAnswered = useRef(false);
  const lifeLostRef = useRef(false);

  const { timeLeft, reset, setIsRunning, setTimeLeft } = useTimer(30, () => {
    setIsRunning(false);
    if (hasAnswered.current) return;
    if (selected) {
      checkAnswer();
    } else {
      hasAnswered.current = true;
      setStatus("timeup");
      playSound("error", effectsOn);
      if (!lifeLostRef.current && onIncorrect) {
        lifeLostRef.current = true;
        onIncorrect();
      }
      setShowTimeUpModal(true);
    }
  });

  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 15);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  useEffect(() => {
    if (activePowerups?.divine_hint && Array.isArray(options) && options.length > 2) {
      const wrongOptions = options.filter(
        (opt) => opt.trim().toLowerCase() !== answer.trim().toLowerCase()
      );
      if (wrongOptions.length >= 2) {
        const keepWrong = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
        setDisplayOptions([answer, keepWrong].sort(() => Math.random() - 0.5));
        activePowerups?.setDivineHintUsed?.();
      }
    }
  }, [activePowerups?.divine_hint, options, answer]);

  const resetLevel = useResetLevel({
    setModals: { setShowRightModal, setShowWrongModal, setShowTimeUpModal },
    setUserInput: () => { setSelected(null); setRevealResult(null); },
    setStatus,
    setTimeLeft: reset,
    setIsRunning,
    hasAnsweredRef: hasAnswered,
    onIncorrect,
    forceIncorrectLifeLoss: true,
    lifeLostRef,
  });

  const saveScore = async (earnedScore) => {
    if (!user || !level) return;
    const levelId = `phase-${level.phaseNumber}-level-${level.number}`;
    try {
      const { data: existing } = await supabase
        .from("progress").select("score")
        .eq("user_id", user.id).eq("level_id", levelId).maybeSingle();
      if (earnedScore > (existing?.score ?? 0)) {
        await supabase.from("progress").upsert(
          { user_id: user.id, level_id: levelId, phase: level.phaseNumber, mode: "Trivia", score: earnedScore },
          { onConflict: ["user_id", "level_id"] }
        );
      }
    } catch (err) { console.error("Failed to save Trivia score:", err); }
  };

  const checkAnswer = () => {
    if (hasAnswered.current) return;
    hasAnswered.current = true;
    setIsRunning(false);
    const isCorrect = selected?.trim().toLowerCase() === answer.trim().toLowerCase();
    setStatus(isCorrect ? "correct" : "wrong");
    setRevealResult(isCorrect ? "correct" : "wrong");
    setTimeout(() => {
      if (isCorrect) {
        playSound("success", effectsOn);
        lifeLostRef.current = true;
        const earned = getScoreFromTime(timeLeft);
        setScore(earned);
        saveScore(earned);
        if (onScore) onScore(earned);
        setShowRightModal(true);
      } else {
        playSound("error", effectsOn);
        if (!lifeLostRef.current && onIncorrect) {
          lifeLostRef.current = true;
          onIncorrect();
        }
        setShowWrongModal(true);
      }
    }, 600);
  };

  const isShieldActive = gameUser?.holy_shield_until && new Date(gameUser.holy_shield_until) > new Date();
  const livesAfterLoss = isShieldActive
    ? (gameUser?.lives ?? 0)
    : Math.max(0, (gameUser?.lives ?? 1) - 1);

  const timerPct = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 15 ? "text-emerald-400" : timeLeft > 8 ? "text-amber-400" : "text-red-400";

  return (
    <div className="h-full flex flex-col justify-center items-center p-2 sm:p-4 overflow-hidden">
      <div className="w-full max-w-md lg:max-w-2xl">
        {/* Card */}
        <div className="card-3d p-3 sm:p-5 lg:p-7">

          {/* Header row */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] sm:text-xs font-black text-purple-600 tracking-widest uppercase">
              ⚡ Trivia · Phase {level?.phaseNumber} · Level {level?.number}
            </span>
            {/* Circular timer */}
            <div className={`relative flex items-center justify-center w-11 h-11 ${timerColor}`}>
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - timerPct / 100)}`}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <span className="text-sm font-black z-10">{timeLeft}</span>
            </div>
          </div>

          {/* Progress bar */}
          <ProgressBar value={timeLeft} max={30} />

          {/* Question */}
          <div className="my-4 sm:my-5 px-1">
            <p className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 leading-snug text-center">
              {question}
            </p>
          </div>

          {/* Options — 2-column on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
            {displayOptions.map((opt, i) => {
              const isSelected = selected === opt;
              const isCorrectOpt = opt.trim().toLowerCase() === answer.trim().toLowerCase();
              const showFeedback = revealResult !== null;

              let extraClass = "";
              if (showFeedback) {
                if (isCorrectOpt) extraClass = "ring-4 ring-green-400 scale-105";
                else if (isSelected && revealResult === "wrong") extraClass = "ring-4 ring-red-400 opacity-70";
                else extraClass = "opacity-40";
              } else if (isSelected) {
                extraClass = "ring-4 ring-white/80 scale-105";
              }

              return (
                <button
                  key={i}
                  disabled={hasAnswered.current}
                  onClick={() => {
                    if (!hasAnswered.current) setSelected(opt);
                    playSound("optionSelect", effectsOn);
                  }}
                  className={`relative flex items-center gap-3 w-full px-3 py-2.5 sm:py-3 rounded-2xl
                    bg-gradient-to-b border-2 border-white/60 text-white font-bold text-sm sm:text-base
                    transition-all duration-150 active:translate-y-1
                    ${OPTION_STYLES[i % OPTION_STYLES.length]} ${extraClass}`}
                >
                  <span className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-xs font-black shrink-0">
                    {OPTION_LETTERS[i]}
                  </span>
                  <span className="text-left leading-tight">{opt}</span>
                  {showFeedback && isCorrectOpt && (
                    <span className="ml-auto text-lg">✅</span>
                  )}
                  {showFeedback && isSelected && !isCorrectOpt && (
                    <span className="ml-auto text-lg">❌</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Submit */}
          <button
            onClick={() => { playSound("submitAnswer", effectsOn); checkAnswer(); }}
            disabled={!selected || hasAnswered.current}
            className="btn-orb btn-orb-green w-full font-black text-sm sm:text-base py-2.5 sm:py-3 !rounded-2xl
              disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            ✅ Submit Answer
          </button>
        </div>
      </div>

      <RightAnswerModal isOpen={showRightModal} onClose={onCorrect} onNext={onCorrect} onBackToMap={onBack} score={score} effectsOn={effectsOn} />
      <WrongAnswerModal isOpen={showWrongModal} onRetry={() => resetLevel({ skipIncorrect: true })} onBack={onBack} effectsOn={effectsOn} currentLives={livesAfterLoss} />
      <TimeUpModal isOpen={showTimeUpModal} onTryAgain={() => resetLevel({ skipIncorrect: true })} onGoToMap={onBack} effectsOn={effectsOn} currentLives={livesAfterLoss} />
    </div>
  );
}
