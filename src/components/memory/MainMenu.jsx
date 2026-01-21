import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, ChevronLeft, ChevronRight, Star, CheckCircle } from 'lucide-react';
import { LEVELS, PAGES, getMatchTypeHint, isPageUnlocked } from '@/data/scriptureMatchData';

const MainMenu = ({
  stats,
  onSelectLevel,
  onBack
}) => {
  const unlockedLevels = stats?.unlocked_levels || 1;
  const [currentPage, setCurrentPage] = useState(1);

  // Get current page configuration
  const pageConfig = PAGES.find(p => p.page === currentPage);
  const pageUnlocked = isPageUnlocked(currentPage, unlockedLevels);
  
  // Filter levels for current page
  const pageLevels = LEVELS.filter(l => l.page === currentPage);
  
  // Check if a page is completed
  const isPageCompleted = (pageNum) => {
    const page = PAGES.find(p => p.page === pageNum);
    if (!page) return false;
    return unlockedLevels > page.levels[1];
  };

  // Navigate between pages
  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(5, p + 1));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[100dvh] bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-100 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-amber-200 shrink-0 safe-area-pt">
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
          <p className="text-amber-600 text-sm">Match Scripture Pairs</p>
        </div>

        <div className="w-12" />
      </div>

      {/* Stats Bar */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-amber-200 p-2 sm:p-3 shrink-0">
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

      {/* Page Navigation Header */}
      <div className="p-3 sm:p-4 pb-2 shrink-0">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                currentPage === 1 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-white shadow-lg text-amber-700 hover:bg-amber-50'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            
            <div className="text-center flex-1 px-2">
              <h2 className={`text-lg font-bold bg-gradient-to-r ${pageConfig?.theme} bg-clip-text text-transparent`}>
                Page {currentPage}: {pageConfig?.title}
              </h2>
              <p className="text-xs text-amber-600">{pageConfig?.description}</p>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={goToNextPage}
              disabled={currentPage === 5}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                currentPage === 5 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-white shadow-lg text-amber-700 hover:bg-amber-50'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Page Dots Indicator */}
          <div className="flex justify-center gap-2 mb-4">
            {PAGES.map(page => {
              const unlocked = isPageUnlocked(page.page, unlockedLevels);
              const completed = isPageCompleted(page.page);
              const isCurrent = page.page === currentPage;
              
              return (
                <motion.button
                  key={page.page}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setCurrentPage(page.page)}
                  className={`h-3 rounded-full transition-all flex items-center justify-center ${
                    isCurrent 
                      ? 'w-8 bg-gradient-to-r ' + page.theme
                      : completed 
                        ? 'w-3 bg-green-400'
                        : unlocked 
                          ? 'w-3 bg-amber-300' 
                          : 'w-3 bg-gray-300'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Level Grid or Locked Message */}
      <div className="flex-1 overflow-y-auto p-4 pt-0">
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            {!pageUnlocked ? (
              /* Locked Page Overlay */
              <motion.div
                key="locked"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-12 bg-white/80 rounded-2xl shadow-lg"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="inline-block"
                >
                  <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Page Locked</h3>
                <p className="text-gray-500 mb-4">
                  Complete Level {pageConfig?.requiredToUnlock} to unlock this page
                </p>
                <div className="bg-amber-100 rounded-xl px-4 py-3 inline-block">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Star className="w-5 h-5" />
                    <span className="font-medium">
                      Your Progress: Level {unlockedLevels}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Level Grid */
              <motion.div
                key="levels"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {pageLevels.map((levelConfig) => {
                    const isUnlocked = levelConfig.level <= unlockedLevels;
                    const isCompleted = unlockedLevels > levelConfig.level;
                    const hint = getMatchTypeHint(levelConfig.matchType);
                    
                    // Display level number within page (1-10)
                    const displayLevel = ((levelConfig.level - 1) % 10) + 1;
                    
                    return (
                      <motion.button
                        key={levelConfig.level}
                        whileHover={isUnlocked ? { scale: 1.05 } : {}}
                        whileTap={isUnlocked ? { scale: 0.95 } : {}}
                        onClick={() => isUnlocked && onSelectLevel(levelConfig.level)}
                        disabled={!isUnlocked}
                        className={`aspect-square rounded-xl shadow-lg flex flex-col items-center justify-center transition-all relative ${
                          isUnlocked
                            ? isCompleted
                              ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                              : `bg-gradient-to-br ${pageConfig?.theme} text-white hover:shadow-xl`
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isUnlocked ? (
                          <>
                            <span className="text-xl sm:text-2xl font-bold">{displayLevel}</span>
                            <span className="text-[10px] opacity-80">
                              {hint.icon}
                            </span>
                            {levelConfig.timeLimit && (
                              <span className="text-[8px] opacity-70">⏱️ {levelConfig.timeLimit}s</span>
                            )}
                            {isCompleted && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1"
                              >
                                <CheckCircle className="w-4 h-4 text-white bg-green-600 rounded-full" />
                              </motion.div>
                            )}
                          </>
                        ) : (
                          <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Match Type Legend - Page Specific */}
                <div className="mt-6 bg-white/60 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-amber-800 mb-2">Match Types - Page {currentPage}</h3>
                  <div className="space-y-1 text-xs text-amber-700">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded bg-gradient-to-r ${pageConfig?.theme} opacity-60`} />
                      <span>Levels 1-3: Symbol Matching 😊➡️😊</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded bg-gradient-to-r ${pageConfig?.theme} opacity-75`} />
                      <span>Levels 4-5: Verse Pairs 📖➡️📖</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded bg-gradient-to-r ${pageConfig?.theme}`} />
                      <span>Levels 6-10: Mixed & Timed 🎭⏱️</span>
                    </div>
                  </div>
                </div>

                {/* Page Theme Info */}
                <div className={`mt-4 rounded-xl p-4 bg-gradient-to-r ${pageConfig?.theme} text-white/90`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📖</span>
                    <span className="font-bold">{pageConfig?.title}</span>
                  </div>
                  <p className="text-xs opacity-80">{pageConfig?.description}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default MainMenu;
