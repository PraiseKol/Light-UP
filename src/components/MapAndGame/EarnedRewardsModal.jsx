import React from "react";

export default function EarnedRewardsModal({
  isOpen,
  onClose,
  rewards = [],
  title = "Rewards Earned"
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 text-center">
        <h2 className="text-2xl font-bold mb-4 text-yellow-600">{title}</h2>

        {rewards.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {rewards.map((reward, idx) => (
              <li
                key={idx}
                className="bg-gray-100 px-3 py-2 rounded-lg text-gray-700 text-sm"
              >
                {reward}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 mb-4">No rewards available</p>
        )}

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
