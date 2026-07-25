import { useCallback, useEffect, useRef, useState } from "react";
import RightAnswerModal from "@/components/ui/RightAnswerModal";
import WrongAnswerModal from "@/components/ui/WrongAnswerModal";
import TimeUpModal from "@/components/ui/TimeUpModal";
import ProgressBar from "@/components/ui/progress";
import { useResetLevel } from "@/hooks/useResetLevel";
import { useTimer } from "@/hooks/useTimer";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { playSound } from "@/utils/sound";

const getScoreFromTime = (timeLeft) => {
  if (timeLeft > 20) return 100;
  if (timeLeft > 10) return 75;
  return 50;
};

export default function WordFillMode({
  question,
  answer,
  level,
  onCorrect,
  onScore,
  onIncorrect,
  disableIfNoLives,
  activePowerups,
  effectsOn = true,
  onBack,
  gameUser,
}) {
  const userContext = useUser();
  const user = userContext?.id ? userContext : null;

  const [userInput, setUserInput] = useState("");
  const [divineHint, setDivineHint] = useState("");
  const [originalHint, setOriginalHint] = useState("");
  const [status, setStatus] = useState("idle"); // idle | correct | wrong
  const [score, setScore] = useState(null);
  const [showRightModal, setShowRightModal] = useState(false);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const inputRef = useRef(null);

  const hasAnsweredCorrectly = useRef(false);
  const lifeLostRef = useRef(false);

  const { timeLeft, setTimeLeft, setIsRunning } = useTimer(30, () => {
    setIsRunning(false);
    if (!hasAnsweredCorrectly.current && !userInput.trim()) {
      playSound("error", effectsOn);
      if (onIncorrect && !lifeLostRef.current) {
        lifeLostRef.current = true;
        onIncorrect();
      }
      setShowTimeUpModal(true);
    } else if (!hasAnsweredCorrectly.current) {
      checkAnswer();
    }
  });

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 15);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  useEffect(() => {
    if (activePowerups?.divine_hint && answer) {
      const cleanAnswer = answer.trim();
      if (cleanAnswer.length >= 2) {
        const hint = cleanAnswer[0] + "_".repeat(cleanAnswer.length - 2) + cleanAnswer[cleanAnswer.length - 1];
        setDivineHint(hint);
        setOriginalHint(hint);
        activePowerups?.setDivineHintUsed?.();
      }
    }
  }, [activePowerups, answer]);

  const resetLevel = useResetLevel({
    setModals: { setShowRightModal, setShowWrongModal, setShowTimeUpModal },
    setUserInput: () => { setUserInput(""); setStatus("idle"); },
    setStatus,
    setTimeLeft,
    setIsRunning,
    hasAnsweredRef: hasAnsweredCorrectly,
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
          { user_id: user.id, level_id: levelId, phase: level.phaseNumber, mode: "Word Fill", score: earnedScore },
          { onConflict: ["user_id", "level_id"] }
        );
      }
    } catch (err) { console.error("Failed to save WordFill score:", err); }
  };

  const checkAnswer = useCallback(() => {
    if (hasAnsweredCorrectly.current || disableIfNoLives) return;
    setIsRunning(false);
    const isCorrect = userInput.trim().toLowerCase() === answer.trim().toLowerCase();
    setStatus(isCorrect ? "correct" : "wrong");
    setTimeout(async () => {
      if (isCorrect) {
        playSound("success", effectsOn);
        hasAnsweredCorrectly.current = true;
        lifeLostRef.current = true;
        const earned = getScoreFromTime(timeLeft);
        setScore(earned);
        await saveScore(earned);
        if (onScore) onScore(earned);
        setShowRightModal(true);
      } else {
        playSound("error", effectsOn);
        if (onIncorrect && !lifeLostRef.current) {
          lifeLostRef.current = true;
          onIncorrect();
        }
        setShowWrongModal(true);
      }
    }, 150);
  }, [userInput, answer, timeLeft, disableIfNoLives, setIsRunning, onIncorrect, onScore, effectsOn]);

  const isShieldActive = gameUser?.holy_shield_until && new Date(gameUser.holy_shield_until) > new Date();
  const livesAfterLoss = isShieldActive
    ? (gameUser?.lives ?? 0)
    : Math.max(0, (gameUser?.lives ?? 1) - 1);

  const timerPct = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 15 ? "text-emerald-400" : timeLeft > 8 ? "text-amber-400" : "text-red-400";

  const borderColor =
    status === "correct" ? "border-emerald-400 ring-2 ring-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.4)]"
    : status === "wrong"  ? "border-red-400   ring-2 ring-red-300   shadow-[0_0_18px_rgba(239,68,68,0.4)]"
    : "border-purple-200";

  return (
    <div className="h-full flex flex-col justify-center items-center p-2 sm:p-4 overflow-hidden">
      <div className="w-full max-w-md lg:max-w-2xl">
        <div className="card-3d p-3 sm:p-5 lg:p-7">

          {/* Header row */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] sm:text-xs font-black text-purple-600 tracking-widest uppercase">
              ✍️ Word Fill · Phase {level?.phaseNumber} · Level {level?.number}
            </span>
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

          <ProgressBar value={timeLeft} max={30} />

          {/* Question */}
          <div className="my-4 sm:my-5 px-1">
            <p className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 leading-snug text-center">
              {question}
            </p>
          </div>

          {/* Divine hint display */}
          {divineHint && !userInput && (
            <div className="text-center mb-3">
              <span className="inline-block bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-1.5 text-sm font-bold tracking-[0.25em]">
                🧩 {divineHint}
              </span>
            </div>
          )}

          {/* Big text input */}
          <input
            ref={inputRef}
            value={userInput}
            onFocus={() => divineHint && setDivineHint("")}
            onBlur={() => { if (!userInput.trim() && originalHint) setDivineHint(originalHint); }}
            onChange={(e) => {
              setUserInput(e.target.value);
              playSound("switch", effectsOn);
              setStatus("idle");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !hasAnsweredCorrectly.current && !disableIfNoLives) {
                playSound("submitAnswer", effectsOn);
                checkAnswer();
              }
            }}
            disabled={hasAnsweredCorrectly.current || disableIfNoLives}
            placeholder={
              disableIfNoLives ? "Out of lives. Please wait..." : "Type your answer here…"
            }
            className={`w-full mb-3 px-4 py-3 sm:py-4 rounded-2xl border-2 bg-white/80
              text-center text-base sm:text-lg font-bold text-gray-800
              placeholder:text-gray-400 placeholder:font-normal
              outline-none transition-all duration-200 ${borderColor}`}
          />

          <button
            onClick={() => { playSound("submitAnswer", effectsOn); checkAnswer(); }}
            disabled={hasAnsweredCorrectly.current || disableIfNoLives}
            className={`btn-orb w-full py-2.5 sm:py-3 font-black text-sm sm:text-base
              !rounded-2xl transition-opacity disabled:opacity-40 disabled:cursor-not-allowed
              ${disableIfNoLives ? "btn-orb-white" : "btn-orb-green"}`}
          >
            {disableIfNoLives ? "⏰ No Lives Left" : "✅ Submit Answer"}
          </button>
        </div>
      </div>

      <RightAnswerModal isOpen={showRightModal} score={score} onClose={onCorrect} onNext={onCorrect} onBackToMap={onBack} effectsOn={effectsOn} />
      <WrongAnswerModal isOpen={showWrongModal} onRetry={() => resetLevel({ skipIncorrect: true })} onBack={onBack} effectsOn={effectsOn} currentLives={livesAfterLoss} />
      <TimeUpModal isOpen={showTimeUpModal} onTryAgain={() => resetLevel({ skipIncorrect: true })} onGoToMap={onBack} effectsOn={effectsOn} currentLives={livesAfterLoss} />
    </div>
  );
}
