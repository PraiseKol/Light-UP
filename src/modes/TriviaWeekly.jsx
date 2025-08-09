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
    <div className="bg-white shadow-xl rounded-2xl p-6 max-w-lg mx-auto text-center animate-fadeIn">
      {/* Question */}
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {quiz.question}
      </h2>

      {/* Options */}
      <div className="grid gap-4">
        {quiz.options.map((option, idx) => {
          const isCorrectAnswer =
            option.trim().toLowerCase() === quiz.answer.trim().toLowerCase();
          const isSelectedWrong = option === selected && !isCorrectAnswer;

          return (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              disabled={submitted}
              className={`px-5 py-3 rounded-xl text-left font-medium shadow-md transition-all transform duration-200
                ${
                  submitted
                    ? isCorrectAnswer
                      ? "bg-green-500 text-white border-2 border-green-700"
                      : isSelectedWrong
                      ? "bg-red-500 text-white border-2 border-red-700"
                      : "bg-gray-200 text-gray-700"
                    : "bg-white border-2 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 hover:scale-[1.02]"
                }
                ${submitted ? "" : "cursor-pointer"}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
