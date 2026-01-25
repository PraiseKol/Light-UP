import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from './ui/modal';

const PopGameLeaderboardModal = ({ 
  isOpen, 
  onClose, 
  topPlayers = [], 
  currentUserRank = null,
  currentUserId = null 
}) => {
  const getMedal = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}.`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-amber-600">
          🏆 Free Fall Champions 🏆
        </h2>
        <p className="text-xs text-gray-500 mt-1">Top 10 Scores</p>
      </div>

      {topPlayers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🎮</div>
          <p>No scores yet!</p>
          <p className="text-xs mt-1">Be the first to set a record!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto px-1">
          {topPlayers.map((player, index) => {
            const isCurrentUser = currentUserId && player.user_id === currentUserId;
            const isTop3 = player.position <= 3;
            
            return (
              <motion.div
                key={`${player.user_id}-${player.score}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                  isCurrentUser 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400' 
                    : isTop3 
                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200' 
                      : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${isTop3 ? 'text-xl' : 'text-gray-500 w-6 text-center'}`}>
                    {getMedal(player.position)}
                  </span>
                  <div className="flex flex-col">
                    <span className={`font-semibold text-sm ${isCurrentUser ? 'text-green-700' : 'text-gray-700'}`}>
                      {player.player_name}
                      {isCurrentUser && <span className="text-green-600 ml-1">(You)</span>}
                    </span>
                    {player.position === 1 && (
                      <span className="text-xs text-amber-500">👑 Champion</span>
                    )}
                  </div>
                </div>
                <span className={`font-bold text-lg ${
                  isTop3 ? 'text-amber-600' : 'text-gray-600'
                }`}>
                  {player.score.toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Current user's position if not in top 10 */}
      {currentUserRank && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-center text-gray-500 text-xs mb-2">
            • • • Your Best Position • • •
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-blue-600">
                #{currentUserRank.position}
              </span>
              <span className="font-semibold text-gray-700">
                {currentUserRank.player_name}
              </span>
            </div>
            <span className="font-bold text-lg text-blue-600">
              {currentUserRank.score.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-4 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 
          text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
      >
        Close
      </button>
    </Modal>
  );
};

export default PopGameLeaderboardModal;
