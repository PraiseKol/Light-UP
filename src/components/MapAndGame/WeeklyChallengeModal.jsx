import React from "react";

export default function WeeklyChallengeModal({
  isOpen,
  onClose,
  challenge,
  onStart
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Weekly Challenge</h2>

        {challenge ? (
          <>
            <p className="text-gray-700 mb-4">{challenge.description}</p>
            <div className="bg-gray-100 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium">
                Progress: {challenge.progress} / {challenge.goal}
              </p>
            </div>
            <button
              onClick={onStart}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Start Challenge
            </button>
          </>
        ) : (
          <p className="text-gray-500 text-sm">No challenge available</p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
