import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
import { LEVELS } from '@/data/scriptureMatchData';

const MainMenu = ({
  stats,
  onSelectLevel,
  onBack
}) => {
  const unlockedLevels = stats?.unlocked_levels || 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-100 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-200">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>
        
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-800">Memory Challenge</h1>
          <p className="text-amber-600 text-sm">Memory Puzzle Game</p>
        </div>

        <div className="w-12" /> {/* Spacer */}
      </div>

      {/* Stats Bar */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-amber-200 p-3">
        <div className="max-w-md mx-auto flex justify-around text-center">
          <div>
            <div className="text-xl font-bold text-amber-800">{stats?.high_score || 0}</div>
            <div className="text-xs text-amber-600">High Score</div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-800">{stats?.total_games || 0}</div>
            <div className="text-xs text-amber-600">Games</div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-800">{stats?.total_matches || 0}</div>
            <div className="text-xs text-amber-600">Matches</div>
          </div>
        </div>
      </div>

      {/* Level Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-bold text-amber-800 mb-4 text-center">Select Level</h2>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {LEVELS.map((levelConfig) => {
              const isUnlocked = levelConfig.level <= unlockedLevels;
              const isCompleted = stats?.current_level > levelConfig.level;
              
              return (
                <motion.button
                  key={levelConfig.level}
                  whileHover={isUnlocked ? { scale: 1.05 } : {}}
                  whileTap={isUnlocked ? { scale: 0.95 } : {}}
                  onClick={() => isUnlocked && onSelectLevel(levelConfig.level)}
                  disabled={!isUnlocked}
                  className={`aspect-square rounded-xl shadow-lg flex flex-col items-center justify-center transition-all ${
                    isUnlocked
                      ? isCompleted
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                        : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white hover:from-amber-500 hover:to-yellow-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <span className="text-2xl font-bold">{levelConfig.level}</span>
                      <span className="text-[10px] opacity-80">
                        {levelConfig.cards} cards
                      </span>
                      {isCompleted && <span className="text-sm">⭐</span>}
                    </>
                  ) : (
                    <Lock className="w-6 h-6" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Match Type Legend */}
          <div className="mt-6 bg-white/60 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-800 mb-2">Match Types</h3>
            <div className="space-y-1 text-xs text-amber-700">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-blue-200" />
                <span>Levels 1-3: Symbol Matching</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-green-200" />
                <span>Levels 4-5: Verse Pairs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-purple-200" />
                <span>Level 6+: Mixed & Timed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MainMenu;
