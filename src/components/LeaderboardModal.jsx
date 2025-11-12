import Modal from "./ui/modal";
import { useState } from "react";

export default function LeaderboardModal({ 
  isOpen, 
  onClose, 
  totalLeaderboard = [], 
  weeklyLeaderboard = [],
  currentUserId 
}) {
  const [showTotal, setShowTotal] = useState(true);

  const leaderboard = showTotal ? totalLeaderboard : weeklyLeaderboard;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="🏆 Leaderboards"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Toggle between Overall and Weekly */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setShowTotal(true)}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              showTotal
                ? "candy-gradient text-white shadow-lg"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            Overall Top 10
          </button>
          <button
            onClick={() => setShowTotal(false)}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
              !showTotal
                ? "candy-gradient text-white shadow-lg"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            Weekly Top 10
          </button>
        </div>

        {/* Leaderboard list */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => {
              const isCurrentUser = entry.user_id === currentUserId;
              const rank = index + 1;
              
              // Medal colors for top 3
              const medalColor = 
                rank === 1 ? "text-yellow-500" :
                rank === 2 ? "text-gray-400" :
                rank === 3 ? "text-amber-600" :
                "text-gray-500";

              return (
                <div
                  key={entry.user_id || index}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    isCurrentUser
                      ? "bg-gradient-to-r from-candyBlue/20 to-candyPurple/20 ring-2 ring-candyBlue shadow-lg"
                      : "bg-white hover:shadow-md"
                  }`}
                >
                  {/* Rank */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                    rank <= 3 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}>
                    {rank <= 3 ? (
                      <span className={medalColor}>
                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                      </span>
                    ) : (
                      rank
                    )}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${isCurrentUser ? "text-candyBlue" : "text-gray-800"}`}>
                      {entry.player_name || "Anonymous"}
                      {isCurrentUser && " (You)"}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 bg-gradient-to-r from-candyYellow to-yellow-500 text-white font-black px-4 py-2 rounded-full shadow-md">
                    ⭐ {entry.total_score || entry.weekly_score || 0}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-semibold">No leaderboard data yet</p>
              <p className="text-sm mt-2">Be the first to score!</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
