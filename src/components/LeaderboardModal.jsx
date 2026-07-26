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
      title="🏆 Leaderboards ⭐"
      className="max-w-2xl w-full mx-2 sm:mx-auto"
    >
      <div className="space-y-3 sm:space-y-4">
        {/* Toggle between Overall, Weekly, and Monthly */}
        <div className="flex gap-1 sm:gap-2 justify-center">
          <button
            onClick={() => { playSound("switch", true); setSelectedTab('overall'); }}
            className={`tab-3d flex-1 ${selectedTab === 'overall' ? 'active' : ''}`}
          >
            <span className="hidden sm:inline">Overall Top 10</span>
            <span className="sm:hidden">Overall</span>
          </button>
          <button
            onClick={() => { playSound("switch", true); setSelectedTab('weekly'); }}
            className={`tab-3d flex-1 flex-col !gap-0 ${selectedTab === 'weekly' ? 'active' : ''}`}
          >
            <span><span className="hidden sm:inline">Weekly Top 10</span><span className="sm:hidden">Weekly</span></span>
            {weeklyLeaderboard && weeklyLeaderboard.length > 0 && (
              <span className="text-[8px] sm:text-[10px] opacity-80">
                {weeklyLeaderboard[0]?.is_active ? "🔴 Live" : "📅 Last"}
              </span>
            )}
          </button>
          <button
            onClick={() => { playSound("switch", true); setSelectedTab('monthly'); }}
            className={`tab-3d flex-1 flex-col !gap-0 ${selectedTab === 'monthly' ? 'active' : ''}`}
          >
            <span><span className="hidden sm:inline">📅 This Month</span><span className="sm:hidden">Monthly</span></span>
            <span className="text-[8px] sm:text-[10px] opacity-80">
              {new Date().toLocaleString('default', { month: 'short' })}
            </span>
          </button>
        </div>

        {/* Leaderboard list */}
        <div className="space-y-2 max-h-[50vh] sm:max-h-[500px] overflow-y-auto">
          {leaderboard && leaderboard.length > 0 ? (
            <>
              {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.user_id === currentUserId;
              const rank = index + 1;
              
              const tierClass = rank === 1 ? "row-3d gold" : rank === 2 ? "row-3d silver" : rank === 3 ? "row-3d bronze" : "row-3d";
              const showCrown = rank === 1;

              return (
                <div
                  key={entry.user_id || index}
                  className={`${tierClass} ${isCurrentUser ? "ring-2 ring-purple-500" : ""}`}
                >
                  {/* Rank orb */}
                  <div className={`relative flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black text-sm sm:text-base ${
                    rank === 1 ? "bg-gradient-to-b from-yellow-200 to-amber-500 text-amber-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_3px_0_rgba(146,64,14,0.5)]" :
                    rank === 2 ? "bg-gradient-to-b from-white to-slate-400 text-slate-800 shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_3px_0_rgba(71,85,105,0.5)]" :
                    rank === 3 ? "bg-gradient-to-b from-orange-200 to-orange-600 text-orange-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_3px_0_rgba(154,52,18,0.5)]" :
                    "bg-gradient-to-b from-white to-purple-200 text-purple-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_0_rgba(76,29,149,0.3)]"
                  }`}>
                    {showCrown && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-base sm:text-lg">👑</span>
                    )}
                    {rank <= 3 ? (rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉") : rank}
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
