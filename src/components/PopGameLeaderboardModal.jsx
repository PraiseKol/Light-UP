import React from 'react';
import { motion } from 'framer-motion';
import Modal from './ui/modal';

const PopGameLeaderboardModal = ({
  isOpen,
  onClose,
  topPlayers = [],
  currentUserRank = null,
  currentUserId = null
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Free Fall Champions" icon="🏆">
      <p className="text-center text-xs text-purple-700/60 -mt-2 mb-3">Top 10 Scores</p>

      {topPlayers.length === 0 ? (
        <div className="text-center py-8 text-purple-700/60">
          <div className="text-4xl mb-2">🎮</div>
          <p className="font-bold">No scores yet!</p>
          <p className="text-xs mt-1">Be the first to set a record!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto px-1">
          {topPlayers.map((player, index) => {
            const isCurrentUser = currentUserId && player.user_id === currentUserId;
            const rank = player.position;
            const tierClass = rank === 1 ? "row-3d gold" : rank === 2 ? "row-3d silver" : rank === 3 ? "row-3d bronze" : "row-3d";

            return (
              <motion.div
                key={`${player.user_id}-${player.score}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${tierClass} ${isCurrentUser ? "ring-2 ring-purple-500" : ""}`}
              >
                <div className={`relative flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black text-sm sm:text-base ${
                  rank === 1 ? "bg-gradient-to-b from-yellow-200 to-amber-500 text-amber-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_3px_0_rgba(146,64,14,0.5)]" :
                  rank === 2 ? "bg-gradient-to-b from-white to-slate-400 text-slate-800 shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_3px_0_rgba(71,85,105,0.5)]" :
                  rank === 3 ? "bg-gradient-to-b from-orange-200 to-orange-600 text-orange-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.7),0_3px_0_rgba(154,52,18,0.5)]" :
                  "bg-gradient-to-b from-white to-purple-200 text-purple-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_0_rgba(76,29,149,0.3)]"
                }`}>
                  {rank === 1 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-base">👑</span>}
                  {rank <= 3 ? (rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉") : rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate text-xs sm:text-base ${isCurrentUser ? "text-candyBlue" : "text-gray-800"}`}>
                    {player.player_name}
                    {isCurrentUser && " (You)"}
                  </p>
                </div>
                <div className="flex-shrink-0 bg-gradient-to-r from-candyYellow to-yellow-500 text-white font-black px-2 sm:px-4 py-1 sm:py-2 rounded-full shadow-md text-xs sm:text-base">
                  {player.score.toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Current user's position if not in top 10 */}
      {currentUserRank && (
        <div className="mt-4 pt-4 border-t-2 border-dashed border-purple-200">
          <p className="text-center text-purple-700/60 text-xs font-semibold mb-2">• • • Your Best Position • • •</p>
          <div className="row-3d ring-2 ring-candyBlue">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-candyBlue text-white flex items-center justify-center font-black text-sm">
              #{currentUserRank.position}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-candyBlue text-sm">{currentUserRank.player_name}</p>
            </div>
            <div className="flex-shrink-0 bg-gradient-to-r from-candyYellow to-yellow-500 text-white font-black px-3 py-1.5 rounded-full shadow-md text-sm">
              {currentUserRank.score.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="btn-orb btn-orb-pink w-full font-black py-3 mt-4"
      >
        Close
      </button>
    </Modal>
  );
};

export default PopGameLeaderboardModal;
