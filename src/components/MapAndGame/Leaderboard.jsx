import React from "react";

export default function Leaderboard({ title, players = [], currentUserId }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold mb-3">{title}</h3>
      {players.length === 0 ? (
        <p className="text-gray-500 text-sm">No leaderboard data yet</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {players.map((player, index) => {
            const isCurrentUser = player.id === currentUserId;
            return (
              <li
                key={player.id}
                className={`flex items-center justify-between py-2 ${
                  isCurrentUser ? "bg-blue-50 rounded-md" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold w-6 text-center">
                    {index + 1}
                  </span>
                  <img
                    src={player.avatar || "/default-avatar.png"}
                    alt={player.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-sm">{player.name}</span>
                </div>
                <span className="text-sm font-medium">{player.score}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
