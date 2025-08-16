import { useEffect, useRef, useState } from "react";
import { playSound } from "utils/sound";

export default function ScriptureMatchWeekly({ quiz, onAnswer, effectsOn = true }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef(Date.now());
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!submitted) {
        setSubmitted(true);
        onAnswer(false, 30);
      }
    }, 30000);

    return () => clearTimeout(timeoutRef.current);
  }, [submitted, onAnswer]);

  const handleSelect = (choice) => {
    if (submitted) return;
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const isCorrect =
      choice.trim().toLowerCase() === quiz.answer?.trim().toLowerCase();
    setSelected(choice);
    setSubmitted(true);
    clearTimeout(timeoutRef.current);
    onAnswer(isCorrect, timeTaken);
  };

  const options = Array.isArray(quiz?.options) ? quiz.options : [];

  if (!quiz || !quiz.question || options.length === 0) {
    return (
      <div className="text-center text-red-600 font-semibold mt-8">
        ⚠️ Error loading Scripture Match question.
      </div>
    );
  }

  return (
    <div className="p-6 text-center max-w-2xl mx-auto bg-white shadow-lg rounded-2xl border border-gray-200">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Scripture Match Challenge
        </h2>
        <p className="mt-4 italic text-gray-700 text-lg leading-relaxed">
          “{quiz.question}”
        </p>
      </div>

      <div className="grid gap-3">
        {options.map((option, idx) => {
          const isCorrectAnswer =
            option.trim().toLowerCase() === quiz.answer.trim().toLowerCase();
          const isSelectedWrong = option === selected && !isCorrectAnswer;

          return (
            <button
              key={idx}
              onClick={() => {
                if (!submitted) {
                  playSound("optionSelect", effectsOn); // 🔊 sound when clicking an option
                  handleSelect(option);
                }
              }}
              disabled={submitted}
              className={`px-5 py-3 rounded-xl text-left font-medium transition-all duration-200 border-2 
                ${
                  submitted
                    ? isCorrectAnswer
                      ? "bg-green-100 border-green-500 text-green-800"
                      : isSelectedWrong
                      ? "bg-red-100 border-red-500 text-red-800"
                      : "bg-gray-100 border-gray-300 text-gray-700"
                    : "bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400"
                }
                ${submitted ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div className="mt-5 text-sm text-gray-600">
          {selected &&
            (selected.trim().toLowerCase() ===
            quiz.answer.trim().toLowerCase() ? (
              <span className="font-semibold text-green-700">✅ Correct!</span>
            ) : (
              <span className="font-semibold text-red-700">
                ❌ Incorrect. Correct answer: {quiz.answer}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
