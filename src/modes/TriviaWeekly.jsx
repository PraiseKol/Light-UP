import { useEffect, useRef, useState } from "react";

export default function TriviaWeekly({ quiz, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!submitted) {
        setSubmitted(true);
        onAnswer(false, 30); // timeout fallback
      }
    }, 30000);

    return () => clearTimeout(timeoutRef.current);
  }, [submitted, onAnswer]);

  const handleSelect = (option) => {
    if (submitted) return;

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const isCorrect =
      option.trim().toLowerCase() === quiz.answer.trim().toLowerCase();

    setSelected(option);
    setSubmitted(true);
    clearTimeout(timeoutRef.current);
    onAnswer(isCorrect, timeTaken);
  };

  if (!quiz || !quiz.question || !Array.isArray(quiz.options)) {
    return (
      <div className="text-center text-red-600 font-semibold mt-8">
        ⚠️ Error loading Trivia question.
      </div>
    );
  }

  return (
    <div className="p-4 text-center">
      <h2 className="text-lg font-semibold mb-4">{quiz.question}</h2>

      <div className="grid gap-4 max-w-md mx-auto">
        {quiz.options.map((option, idx) => {
          const isCorrectAnswer =
            option.trim().toLowerCase() === quiz.answer.trim().toLowerCase();
          const isSelectedWrong = option === selected && !isCorrectAnswer;

          return (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
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
