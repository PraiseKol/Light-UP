import { useEffect, useRef, useState } from "react";

export default function ScriptureMatchWeekly({ quiz, onAnswer }) {
  console.log("📦 ScriptureMatchWeekly received quiz:", quiz);

  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!submitted) {
        setSubmitted(true);
        onAnswer(false, 30); // Auto-fallback on timeout
      }
    }, 30000);

    return () => clearTimeout(timeoutRef.current);
  }, [submitted, onAnswer]);

  const handleSelection = (choice) => {
    if (submitted) return;

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const isCorrect =
      choice.trim().toLowerCase() === quiz.answer?.trim().toLowerCase();

    setSelected(choice);
    setSubmitted(true);
    clearTimeout(timeoutRef.current);
    onAnswer(isCorrect, timeTaken);
  };

  // Guard against missing or malformed data
  const options = Array.isArray(quiz?.options) ? quiz.options : [];

  if (!quiz || !quiz.question || options.length === 0) {
    return (
      <div className="text-center text-red-600 font-semibold mt-8">
        ⚠️ Error loading Scripture Match question.
      </div>
    );
  }

  return (
    <div className="p-4 text-center">
      <div className="mb-6 text-lg font-semibold">
        “{quiz.question}”
      </div>

      <div className="grid gap-4 max-w-md mx-auto">
        {options.map((option, idx) => {
          const isCorrectAnswer = option === quiz.answer;
          const isSelectedWrong = option === selected && !isCorrectAnswer;

          return (
            <button
              key={idx}
              onClick={() => handleSelection(option)}
              disabled={submitted}
              className={`border px-4 py-2 rounded text-left transition-all duration-150 ${
                submitted
                  ? isCorrectAnswer
                    ? "bg-green-200 border-green-600"
                    : isSelectedWrong
                    ? "bg-red-200 border-red-600"
                    : "bg-gray-100"
                  : "hover:bg-blue-100"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
