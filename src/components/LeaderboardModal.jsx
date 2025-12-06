import Modal from "./ui/modal";
import { useState } from "react";
import { playSound } from "@/utils/sound";

export default function LeaderboardModal({
  isOpen, 
  onClose, 
  totalLeaderboard = [], 
  weeklyLeaderboard = [],
  monthlyLeaderboard = [],
  currentUserOverallRank = null,
  currentUserWeeklyRank = null,
  currentUserMonthlyRank = null,
  currentUserId 
}) {
  const [selectedTab, setSelectedTab] = useState('overall'); // 'overall', 'weekly', 'monthly'

  const leaderboard = 
    selectedTab === 'overall' ? totalLeaderboard :
    selectedTab === 'weekly' ? weeklyLeaderboard :
    monthlyLeaderboard;

  const currentUserRank = 
    selectedTab === 'overall' ? currentUserOverallRank :
    selectedTab === 'weekly' ? currentUserWeeklyRank :
    currentUserMonthlyRank;

  // Get current month name
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="🎄 Leaderboards 🏆"
      className="max-w-2xl w-full mx-2 sm:mx-auto"
    >
      <div className="space-y-3 sm:space-y-4 relative">
        {/* Christmas decoration at top */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2">
          <span className="text-base sm:text-xl animate-ornament-swing">🎄</span>
          <span className="text-base sm:text-xl animate-ornament-swing" style={{ animationDelay: '0.3s' }}>⭐</span>
          <span className="text-base sm:text-xl animate-ornament-swing" style={{ animationDelay: '0.6s' }}>🎄</span>
        </div>
        
        {/* Toggle between Overall, Weekly, and Monthly */}
        <div className="flex gap-1 sm:gap-2 bg-gradient-to-r from-christmasGreen/20 to-christmasRed/20 p-1 rounded-xl mt-4 sm:mt-6">
          <button
            onClick={() => {
              playSound("switch", true);
              setSelectedTab('overall');
            }}
            className={`flex-1 py-2 sm:py-3 px-1 sm:px-3 rounded-lg font-bold transition-all text-[10px] sm:text-sm ${
              selectedTab === 'overall'
                ? "candy-gradient text-white shadow-lg"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            <span className="hidden sm:inline">Overall Top 10</span>
            <span className="sm:hidden">Overall</span>
          </button>
          <button
            onClick={() => {
              playSound("switch", true);
              setSelectedTab('weekly');
            }}
            className={`flex-1 py-2 sm:py-3 px-1 sm:px-3 rounded-lg font-bold transition-all text-[10px] sm:text-sm ${
              selectedTab === 'weekly'
                ? "candy-gradient text-white shadow-lg"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            <div><span className="hidden sm:inline">Weekly Top 10</span><span className="sm:hidden">Weekly</span></div>
            {weeklyLeaderboard && weeklyLeaderboard.length > 0 && (
              <div className="text-[8px] sm:text-xs mt-0.5 sm:mt-1 opacity-80">
                {weeklyLeaderboard[0]?.is_active ? "🔴 Live" : "📅 Last"}
              </div>
            )}
          </button>
          <button
            onClick={() => {
              playSound("switch", true);
              setSelectedTab('monthly');
            }}
            className={`flex-1 py-2 sm:py-3 px-1 sm:px-3 rounded-lg font-bold transition-all text-[10px] sm:text-sm ${
              selectedTab === 'monthly'
                ? "candy-gradient text-white shadow-lg"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            <div><span className="hidden sm:inline">📅 This Month</span><span className="sm:hidden">Monthly</span></div>
            <div className="text-[8px] sm:text-xs mt-0.5 sm:mt-1 opacity-80">
              {new Date().toLocaleString('default', { month: 'short' })}
            </div>
          </button>
        </div>

        {/* Leaderboard list */}
        <div className="space-y-2 max-h-[50vh] sm:max-h-[500px] overflow-y-auto">
          {leaderboard && leaderboard.length > 0 ? (
            <>
              {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.user_id === currentUserId;
              const rank = index + 1;
              
              // Medal colors for top 3
              const medalColor = 
                rank === 1 ? "text-christmasGold" :
                rank === 2 ? "text-gray-300" :
                rank === 3 ? "text-amber-600" :
                "text-gray-500";
              
              // Christmas crown for #1
              const showCrown = rank === 1;

              return (
                <div
                  key={entry.user_id || index}
                  className={`flex items-center gap-2 sm:gap-4 p-2 sm:p-4 rounded-xl transition-all ${
                    isCurrentUser
                      ? "bg-gradient-to-r from-candyBlue/20 to-candyPurple/20 ring-2 ring-candyBlue shadow-lg"
                      : "bg-white hover:shadow-md"
                  }`}
                >
                  {/* Rank with Christmas styling */}
                  <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm sm:text-lg relative ${
                    rank === 1 ? "bg-gradient-to-br from-christmasGold to-yellow-600 text-white" :
                    rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                    rank === 3 ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white" :
                    "bg-gray-200 text-gray-600"
                  }`}>
                    {showCrown && (
                      <span className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 text-sm sm:text-lg">👑</span>
                    )}
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
                    <p className={`font-bold truncate text-xs sm:text-base ${isCurrentUser ? "text-candyBlue" : "text-gray-800"}`}>
                      {entry.player_name || "Anonymous"}
                      {isCurrentUser && " (You)"}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 bg-gradient-to-r from-candyYellow to-yellow-500 text-white font-black px-2 sm:px-4 py-1 sm:py-2 rounded-full shadow-md text-xs sm:text-base">
                    ⭐ {entry.total_score || entry.score || 0}
                  </div>
                </div>
              );
            })}

            {/* Show user's position if not in top 10 */}
            {currentUserRank && !leaderboard.some(e => e.user_id === currentUserId) && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-dashed border-gray-300">
                <p className="text-center text-gray-500 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">• • • Your Position • • •</p>
                <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-4 rounded-xl bg-gradient-to-r from-candyBlue/20 to-candyPurple/20 ring-2 ring-candyBlue shadow-lg">
                  {/* Rank badge */}
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm sm:text-lg bg-candyBlue text-white">
                    {currentUserRank.rank}
                  </div>
                  
                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-candyBlue text-xs sm:text-base">
                      {currentUserRank.player_name || "Anonymous"} (You)
                    </p>
                  </div>
                  
                  {/* Score */}
                  <div className="flex-shrink-0 bg-gradient-to-r from-candyYellow to-yellow-500 text-white font-black px-2 sm:px-4 py-1 sm:py-2 rounded-full shadow-md text-xs sm:text-base">
                    ⭐ {currentUserRank.total_score || currentUserRank.score || 0}
                  </div>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <p className="text-sm sm:text-lg font-semibold">No leaderboard data yet</p>
              <p className="text-xs sm:text-sm mt-2">Be the first to score!</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
