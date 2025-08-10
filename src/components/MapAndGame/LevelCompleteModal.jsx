import React from "react";

export default function LevelCompleteModal({
  isOpen,
  onClose,
  levelNumber,
  rewards = [],
  onContinue
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 text-center">
        <h2 className="text-2xl font-bold mb-2 text-green-600">
          🎉 Level {levelNumber} Complete!
        </h2>
        <p className="text-gray-700 mb-4">Great job completing this level.</p>

        {rewards.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Rewards Earned:</h3>
            <ul className="space-y-1">
              {rewards.map((reward, idx) => (
                <li key={idx} className="text-sm text-gray-600">
                  {reward}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={onContinue}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Continue
          </button>
          <button
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
