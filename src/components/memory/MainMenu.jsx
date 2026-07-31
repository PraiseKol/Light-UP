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

  const pageConfig = PAGES.find(p => p.page === currentPage);
  const pageUnlocked = isPageUnlocked(currentPage, unlockedLevels);
  const pageLevels = LEVELS.filter(l => l.page === currentPage);

  const isPageCompleted = (pageNum) => {
    const page = PAGES.find(p => p.page === pageNum);
    if (!page) return false;
    return unlockedLevels > page.levels[1];
  };

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
      <div className="candy-gradient flex items-center justify-between p-3 sm:p-4 shrink-0 safe-area-pt shadow-md">
        <button
          onClick={onBack}
          className="orb-glass !w-10 !h-10 sm:!w-11 sm:!h-11 flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-lg sm:text-2xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
            🧠 Memory Challenge
          </h1>
          <p className="text-white/80 text-[11px] sm:text-sm font-semibold">Match Scripture Pairs</p>
        </div>

        <div className="w-10 sm:w-11" />
      </div>

      {/* Stats Bar */}
      <div className="bg-white/70 backdrop-blur-sm border-b-2 border-amber-200 p-2 sm:p-3 shrink-0">
        <div className="max-w-md mx-auto flex justify-around gap-2">
          <div className="chip-3d chip-3d-star flex-col !py-1.5 !px-3">
            <div className="text-lg font-black">{stats?.high_score || 0}</div>
            <div className="text-[9px] font-bold opacity-70">High Score</div>
          </div>
          <div className="chip-3d flex-col !py-1.5 !px-3">
            <div className="text-lg font-black text-amber-800">{stats?.total_games || 0}</div>
            <div className="text-[9px] font-bold text-amber-600">Games</div>
          </div>
          <div className="chip-3d flex-col !py-1.5 !px-3">
            <div className="text-lg font-black text-amber-800">{stats?.total_matches || 0}</div>
            <div className="text-[9px] font-bold text-amber-600">Matches</div>
          </div>
        </div>
      </div>

      {/* Page Navigation Header */}
      <div className="p-3 sm:p-4 pb-2 shrink-0">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className={`orb-glass !w-9 !h-9 sm:!w-10 sm:!h-10 flex items-center justify-center ${
                currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'text-slate-700'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center flex-1 px-2">
              <h2 className={`text-base sm:text-lg font-black bg-gradient-to-r ${pageConfig?.theme} bg-clip-text text-transparent`}>
                Page {currentPage}: {pageConfig?.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-600 font-semibold">{pageConfig?.description}</p>
            </div>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === 5}
              className={`orb-glass !w-9 !h-9 sm:!w-10 sm:!h-10 flex items-center justify-center ${
                currentPage === 5 ? 'opacity-40 cursor-not-allowed' : 'text-slate-700'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Page Dots Indicator */}
          <div className="flex justify-center gap-2 mb-2">
            {PAGES.map(page => {
              const unlocked = isPageUnlocked(page.page, unlockedLevels);
              const completed = isPageCompleted(page.page);
              const isCurrent = page.page === currentPage;
              
              return (
                <button
                  key={page.page}
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
              <motion.div
                key="locked"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card-3d text-center py-10"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="inline-block"
                >
                  <Lock className="w-14 h-14 mx-auto text-gray-400 mb-3" />
                </motion.div>
                <h3 className="text-lg font-black text-gray-700 mb-1">Page Locked</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Complete Level {pageConfig?.requiredToUnlock} to unlock this page
                </p>
                <div className="chip-3d chip-3d-star inline-flex !py-2 !px-4">
                  <Star className="w-4 h-4" />
                  <span className="font-bold text-sm">Your Progress: Level {unlockedLevels}</span>
                </div>
              </motion.div>
            ) : (
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
                    const displayLevel = ((levelConfig.level - 1) % 10) + 1;
                    
                    return (
                      <button
                        key={levelConfig.level}
                        onClick={() => isUnlocked && onSelectLevel(levelConfig.level)}
                        disabled={!isUnlocked}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all relative border-2 ${
                          isUnlocked
                            ? isCompleted
                              ? 'bg-gradient-to-b from-green-300 to-emerald-500 text-white border-white/60 shadow-[0_4px_0_#065f46] active:translate-y-1 active:shadow-none'
                              : `bg-gradient-to-b ${pageConfig?.theme} text-white border-white/60 shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-1 active:shadow-none hover:brightness-110`
                            : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {isUnlocked ? (
                          <>
                            <span className="text-lg sm:text-2xl font-black">{displayLevel}</span>
                            <span className="text-[10px] opacity-80">{hint.icon}</span>
                            {levelConfig.timeLimit && (
                              <span className="text-[8px] opacity-70">⏱️ {levelConfig.timeLimit}s</span>
                            )}
                            {isCompleted && (
                              <div className="absolute -top-1.5 -right-1.5">
                                <CheckCircle className="w-4 h-4 text-white bg-green-600 rounded-full" />
                              </div>
                            )}
                          </>
                        ) : (
                          <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Match Type Legend */}
                <div className="row-3d !items-stretch flex-col mt-5">
                  <h3 className="text-sm font-black text-amber-800 mb-2">Match Types — Page {currentPage}</h3>
                  <div className="space-y-1.5 text-xs text-amber-700 font-medium">
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
                <div className={`mt-3 rounded-2xl p-4 bg-gradient-to-r ${pageConfig?.theme} text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] border-2 border-white/30`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📖</span>
                    <span className="font-black">{pageConfig?.title}</span>
                  </div>
                  <p className="text-xs opacity-90">{pageConfig?.description}</p>
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
