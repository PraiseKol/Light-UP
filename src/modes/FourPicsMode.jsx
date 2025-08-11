import { useState, useEffect, useRef, useCallback } from "react";
import { getQuestion } from "lib/getQuestion";
import { useTimer } from "hooks/useTimer";
import RightAnswerModal from "components/ui/RightAnswerModal";
import WrongAnswerModal from "components/ui/WrongAnswerModal";
import TimeUpModal from "components/ui/TimeUpModal";
import { Button } from "components/ui/button";
import { useResetLevel } from "hooks/useResetLevel";
import ProgressBar from "components/ui/progress";
import { supabase } from "lib/supabaseClient";
import { loseLife } from "utils/loseLife";

export default function FourPicsMode({
  level,
  onBack,
  onCorrect = () => {},
  onScore = () => {},
  activePowerups,
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

  const hasAnswered = useRef(false);
  const lifeLostRef = useRef(false);
  const [user, setUser] = useState(null);

  

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error) setUser(user);
    };
    getUser();
  }, []);

  const handleLifeLoss = async () => {
    if (lifeLostRef.current || !user?.id) return;
    lifeLostRef.current = true;
    try {
      const { data } = await supabase
        .from("game_users")
        .select("lives")
        .eq("user_id", user.id)
        .maybeSingle();
      const currentLives = data?.lives;
      if (currentLives > 0) {
        await loseLife(user.id, currentLives);
      }
    } catch (err) {
      console.error("❌ Error reducing life:", err.message);
    }
  };

  const { timeLeft, setTimeLeft, setIsRunning } = useTimer(INITIAL_TIME, () => {
    if (input.every((slot) => slot === "")) {
      handleLifeLoss();
      setShowTimeUpModal(true);
    } else {
      checkAnswer();
    }
  });

  // Grace Period powerup
  useEffect(() => {
    if (activePowerups?.grace_period) {
      setTimeLeft((prev) => prev + 10);
      activePowerups?.setGraceUsed?.();
    }
  }, [activePowerups, setTimeLeft]);

  // Load question
  useEffect(() => {
    setLoading(true);
    const load = async () => {
      const data = await getQuestion(level.phaseNumber, level.number);
      if (data) {
        setQuestion(data);
        const letters = data.letters?.split("") || [];
        setShuffledLetters(letters.sort(() => Math.random() - 0.5));
        setInput(Array(data.answer.length).fill(""));
        setUsedIndexes([]);
        setDivineHintApplied(false); // allow hint on first load
        setTimeLeft(INITIAL_TIME); // reset timer at load
        setIsRunning(true);
      }
      setLoading(false);
    };
    load();
  }, [level, setIsRunning, setTimeLeft]);

  // Divine Hint — just fill last N slots, no locking
  const applyDivineHint = useCallback(() => {
    if (!question?.hint_letters || divineHintApplied) return;
    const hintArr = question.hint_letters.toUpperCase().split("");
    const answerLength = question.answer.length;

    setInput((prev) => {
      const newInput = [...prev];
      for (let i = 0; i < hintArr.length; i++) {
        newInput[answerLength - hintArr.length + i] = hintArr[i];
      }
      return newInput;
    });

    setDivineHintApplied(true);
    activePowerups?.setDivineHintUsed?.();
  }, [question, divineHintApplied, activePowerups]);

  // Auto-apply on first load if active
  useEffect(() => {
    if (activePowerups?.divine_hint && !divineHintApplied) {
      applyDivineHint();
    }
  }, [activePowerups, divineHintApplied, applyDivineHint]);

  const calculateScore = () => {
    if (timeLeft > 20) return 100;
    if (timeLeft > 10) return 75;
    return 50;
  };

  const saveScore = async (newScore) => {
    if (!user || !level) return;
    const levelId = level.id || `P${level.phaseNumber}-L${level.number}`;
    const { data: existingData } = await supabase
      .from("progress")
      .select("id, score")
      .eq("user_id", user.id)
      .eq("level_id", levelId)
      .maybeSingle();

    const existingScore = existingData?.score;

    if (existingScore === undefined || existingScore === null) {
      await supabase.from("progress").insert({
        user_id: user.id,
        level_id: levelId,
        phase: level.phaseNumber,
        mode: "FourPics",
        score: newScore,
        updated_at: new Date().toISOString(),
      });
    } else if (newScore > existingScore) {
      await supabase
        .from("progress")
        .update({
          score: newScore,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("level_id", levelId);
    }

    // ✅ Always show current attempt's score in modal
    setScore(newScore);
    onScore(newScore);
  };

  const checkAnswer = () => {
    if (!question?.answer || hasAnswered.current) return;
    hasAnswered.current = true;
    setIsRunning(false);
    const correct =
      input.join("").toLowerCase() === question.answer.toLowerCase();
    if (correct) {
      const earned = calculateScore();
      setScore(earned); // ✅ set state
      saveScore(earned);
      setShowRightModal(true);
    } else {
      handleLifeLoss();
      setShowWrongModal(true);
    }
  };

  const handleLetterClick = useCallback(
    (letter, idx) => {
      if (hasAnswered.current || usedIndexes.includes(idx)) return;
      const emptyIndex = input.findIndex((ch) => ch === "");
      if (emptyIndex !== -1) {
        setInput((prev) => {
          const arr = [...prev];
          arr[emptyIndex] = letter;
          return arr;
        });
        setUsedIndexes((prev) => [...prev, idx]);
      }
    },
    [usedIndexes, input]
  );

  const handleBackspace = () => {
    if (hasAnswered.current) return;
    for (let i = input.length - 1; i >= 0; i--) {
      if (input[i] !== "") {
        const removedLetter = input[i];
        setInput((prev) => {
          const arr = [...prev];
          arr[i] = "";
          return arr;
        });
        setUsedIndexes((prev) => {
          const idxToRemove = prev.find(
            (uIdx) => shuffledLetters[uIdx] === removedLetter
          );
          return prev.filter((p) => p !== idxToRemove);
        });
        break;
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "Enter" &&
        !hasAnswered.current &&
        !input.includes("")
      ) {
        event.preventDefault();
        checkAnswer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [input, checkAnswer]);

  const resetLevel = useResetLevel({
    setModals: {
      setShowRightModal,
      setShowWrongModal,
      setShowTimeUpModal,
    },
    setUserInput: () => {
      setInput(Array(question?.answer?.length || 0).fill(""));
      setUsedIndexes([]);
      setDivineHintApplied(false); // allow hint after retry
    },
    setTimeLeft: () => {
      setTimeLeft(INITIAL_TIME);
      setIsRunning(true);
    },
    hasAnsweredRef: hasAnswered,
    onReset: () => {
      lifeLostRef.current = false;
    },
    reshuffleLetters: () => {
      if (question?.letters) {
        const reshuffled = question.letters
          .split("")
          .sort(() => Math.random() - 0.5);
        setShuffledLetters(reshuffled);
        setUsedIndexes([]);
      }
    },
  });



  if (loading)
    return <div className="p-6 text-center">Loading question...</div>;
  if (!question?.answer || !question?.image_urls)
    return (
      <div className="p-6 text-center text-red-600">
        ❌ Invalid question data.
      </div>
    );
  if (!user) return <div className="p-6 text-center">Loading user...</div>;

  const images = question.image_urls.split(",").map((url) => url.trim());

  return (
    <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl shadow-lg max-w-2xl mx-auto animate-fadeInUp">
      <div className="space-y-1 mb-4">
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500 mb-2">
            Phase {level?.phaseNumber} • Level {level?.number} Four Pics One
            Word
          </div>
          <span className="text-sm text-gray-600 font-semibold">
            {timeLeft}s
          </span>
        </div>
        <ProgressBar value={timeLeft} max={INITIAL_TIME} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`Hint ${idx + 1}`}
            className="w-full h-32 object-contain rounded-lg border border-gray-200 shadow-sm"
          />
        ))}
      </div>

      <div className="flex justify-center gap-2 mb-4 text-xl font-semibold tracking-wide">
        {input.map((ch, i) => (
          <div key={i} className="w-10 h-10 border-b-4 border-gold text-center">
            {ch || ""}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-3 max-w-md mx-auto mb-6">
        {shuffledLetters.map((ltr, idx) => (
          <button
            key={idx}
            onClick={() => handleLetterClick(ltr, idx)}
            disabled={usedIndexes.includes(idx) || hasAnswered.current}
            className={`w-10 h-10 text-lg font-bold rounded-lg transition shadow ${
              usedIndexes.includes(idx)
                ? "bg-gray-300 text-gray-500"
                : "bg-gold text-black hover:bg-yellow-400"
            }`}
          >
            {ltr}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-4">
        <Button
          onClick={handleBackspace}
          disabled={input.every((slot) => slot === "") || hasAnswered.current}
          className="bg-gray-200 hover:bg-gray-300 text-black"
        >
          ⌫
        </Button>
        <Button
          onClick={checkAnswer}
          disabled={hasAnswered.current || input.includes("")}
        >
          ✅ Submit
        </Button>
        {activePowerups?.divine_hint && (
          <Button
            onClick={applyDivineHint}
            disabled={divineHintApplied}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            ✨ Divine Hint
          </Button>
        )}
      </div>

      <RightAnswerModal
        isOpen={showRightModal}
        onClose={onCorrect}
        onNext={onCorrect}
        onBackToMap={() => window.location.reload()}
        score={score}
      />
      <WrongAnswerModal
        isOpen={showWrongModal}
        onRetry={resetLevel}
        onBack={onBack}
      />
      <TimeUpModal
        isOpen={showTimeUpModal}
        onTryAgain={resetLevel}
        onGoToMap={onBack}
      />
    </div>
  );
}
