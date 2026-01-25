import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  fetchMonthlyTopPlayers, 
  createCompetition, 
  getActiveCompetition,
  startRound,
  endRound,
  completeCompetition,
  searchPlayers,
  cancelCompetition
} from '@/lib/api/competition';
import {
  startPopGameSession,
  endPopGameSession,
  getActivePopGameSession,
  getAggregatedScores,
  getPopGameActive,
  setPopGameActive,
  fetchPopGameTopForCompetition
} from '@/lib/api/popGame';
import { getScriptureMatchActive, setScriptureMatchActive } from '@/lib/api/scriptureMatch';
import { Trophy, Users, Play, Search, Plus, X, Crown, Clock, CheckCircle, Gamepad2, Puzzle, XCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import Switch from '@/components/ui/Switch';

export default function CompetitionManager() {
  const [activeCompetition, setActiveCompetition] = useState(null);
  const [monthlyTopPlayers, setMonthlyTopPlayers] = useState([]);
  const [popGameLeaderboard, setPopGameLeaderboard] = useState([]);
  const [manualPlayers, setManualPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [roundTimeLeft, setRoundTimeLeft] = useState(null);
  
  // Selection state for leaderboards
  const [selectedMonthlyIds, setSelectedMonthlyIds] = useState([]);
  const [selectedPopGameIds, setSelectedPopGameIds] = useState([]);
  
  // Pop Game session state (for qualification mini-game - legacy)
  const [popGameSession, setPopGameSession] = useState(null);
  const [popGameScores, setPopGameScores] = useState([]);
  const [popGameMaxAttempts, setPopGameMaxAttempts] = useState(3);
  
  // Scripture Match state
  const [scriptureMatchActive, setScriptureMatchActiveState] = useState(false);
  
  // Pop Game visibility state (independent of session)
  const [popGameVisibility, setPopGameVisibility] = useState(false);

  useEffect(() => {
    loadData();
    
    // Subscribe to competition updates
    const channel = supabase
      .channel('competition-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_rounds' }, loadData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (activeCompetition?.round_ends_at) {
      const interval = setInterval(() => {
        const endTime = new Date(activeCompetition.round_ends_at).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setRoundTimeLeft(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeCompetition?.round_ends_at]);

  async function loadData() {
    setLoading(true);
    const competition = await getActiveCompetition();
    setActiveCompetition(competition);

    if (!competition) {
      // Load both leaderboards for selection
      const topPlayers = await fetchMonthlyTopPlayers(20);
      setMonthlyTopPlayers(topPlayers);
      
      const popGameTop = await fetchPopGameTopForCompetition();
      setPopGameLeaderboard(popGameTop);
    }
    
    // Load pop game session (legacy qualification)
    const popSession = await getActivePopGameSession();
    setPopGameSession(popSession);
    if (popSession) {
      const scores = await getAggregatedScores(popSession.id);
      setPopGameScores(scores);
    }
    
    // Load Scripture Match visibility
    const scriptureActive = await getScriptureMatchActive();
    setScriptureMatchActiveState(scriptureActive);
    
    // Load Pop Game visibility
    const popActive = await getPopGameActive();
    setPopGameVisibility(popActive);
    
    setLoading(false);
  }

  async function handleToggleScriptureMatch(checked) {
    const { data: { user } } = await supabase.auth.getUser();
    const success = await setScriptureMatchActive(checked, user?.id);
    if (success) {
      setScriptureMatchActiveState(checked);
      toast.success(checked ? 'Scripture Match enabled! Yellow orb now visible.' : 'Scripture Match disabled.');
    } else {
      toast.error('Failed to update Scripture Match visibility');
    }
  }

  async function handleTogglePopGame(checked) {
    const { data: { user } } = await supabase.auth.getUser();
    const success = await setPopGameActive(checked, user?.id);
    if (success) {
      setPopGameVisibility(checked);
      toast.success(checked ? 'Pop Game enabled! Red orb now visible on player maps.' : 'Pop Game disabled.');
    } else {
      toast.error('Failed to update Pop Game visibility');
    }
  }

  async function handleSearch() {
    if (searchTerm.length < 2) return;
    const results = await searchPlayers(searchTerm);
    // Filter out already selected players
    const allSelectedIds = getUniqueSelectedIds();
    setSearchResults(results.filter(p => !allSelectedIds.includes(p.user_id)));
  }

  // Get all unique selected player IDs
  function getUniqueSelectedIds() {
    return [...new Set([
      ...selectedMonthlyIds,
      ...selectedPopGameIds,
      ...manualPlayers.map(p => p.user_id)
    ])];
  }

  // Get total unique selected count
  function getTotalSelected() {
    return getUniqueSelectedIds().length;
  }

  // Toggle monthly player selection
  function toggleMonthlySelection(userId) {
    setSelectedMonthlyIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    // Remove from pop game if selected there too
    setSelectedPopGameIds(prev => prev.filter(id => id !== userId));
  }

  // Toggle pop game player selection
  function togglePopGameSelection(userId) {
    setSelectedPopGameIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    // Remove from monthly if selected there too
    setSelectedMonthlyIds(prev => prev.filter(id => id !== userId));
  }

  // Check if a player is selected in either list
  function isPlayerSelected(userId) {
    return selectedMonthlyIds.includes(userId) || 
           selectedPopGameIds.includes(userId) || 
           manualPlayers.some(p => p.user_id === userId);
  }

  function addManualPlayer(player) {
    if (getTotalSelected() >= 24) {
      toast.error('Maximum 24 players allowed');
      return;
    }
    if (isPlayerSelected(player.user_id)) {
      toast.error('Player already selected');
      return;
    }
    setManualPlayers([...manualPlayers, { ...player, selection_type: 'manual' }]);
    setSearchResults([]);
    setSearchTerm('');
  }

  function removeManualPlayer(userId) {
    setManualPlayers(manualPlayers.filter(p => p.user_id !== userId));
  }

  async function handleCreateCompetition() {
    const totalSelected = getTotalSelected();
    if (totalSelected !== 24) {
      toast.error(`Need exactly 24 players. Currently have ${totalSelected}`);
      return;
    }

    // Build player list from all sources
    const allPlayers = [
      ...monthlyTopPlayers.filter(p => selectedMonthlyIds.includes(p.user_id)),
      ...popGameLeaderboard.filter(p => selectedPopGameIds.includes(p.user_id)).map(p => ({
        ...p,
        selection_type: 'pop_game'
      })),
      ...manualPlayers
    ];

    const competition = await createCompetition(allPlayers);
    
    if (competition) {
      toast.success('Competition created! Ready to start.');
      // Reset selections
      setSelectedMonthlyIds([]);
      setSelectedPopGameIds([]);
      setManualPlayers([]);
      loadData();
    } else {
      toast.error('Failed to create competition');
    }
  }

  async function handleCancelCompetition() {
    if (!activeCompetition) return;
    
    if (!confirm('Are you sure you want to cancel this competition? This will delete all progress and cannot be undone.')) {
      return;
    }

    const success = await cancelCompetition(activeCompetition.id);
    if (success) {
      toast.success('Competition cancelled');
      loadData();
    } else {
      toast.error('Failed to cancel competition');
    }
  }

  async function handleStartCompetition() {
    setCountdown(5);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startRound(activeCompetition.id, 1);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleStartNextRound() {
    const nextRound = activeCompetition.current_round + 1;
    if (nextRound > 4) {
      await completeCompetition(activeCompetition.id);
      toast.success('Competition completed!');
    } else {
      await startRound(activeCompetition.id, nextRound);
      toast.success(`Round ${nextRound} started!`);
    }
    loadData();
  }

  async function handleEndRound() {
    const result = await endRound(activeCompetition.id, activeCompetition.current_round);
    if (result) {
      toast.success(`Round ended! ${result.winningGroup} wins, ${result.losingGroup} eliminated.`);
      loadData();
    }
  }

  async function handleCompleteCompetition() {
    await completeCompetition(activeCompetition.id);
    toast.success('Competition completed!');
    loadData();
  }

  // Pop Game Session Functions (legacy qualification)
  async function handleStartPopGame() {
    const { data: { user } } = await supabase.auth.getUser();
    const session = await startPopGameSession(user?.id, popGameMaxAttempts);
    if (session) {
      toast.success(`Pop Game started with ${popGameMaxAttempts} attempts! Red bulb now visible on player maps.`);
      loadData();
    } else {
      toast.error('Failed to start Pop Game');
    }
  }

  async function handleEndPopGame() {
    if (!popGameSession) return;
    await endPopGameSession(popGameSession.id);
    toast.success('Pop Game ended!');
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Scripture Match Toggle - Always visible
  const ScriptureMatchToggle = () => (
    <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-6 border border-yellow-500/30">
      <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2 mb-4">
        <Puzzle className="w-6 h-6" />
        Memory Challenge
      </h2>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Yellow Orb Visibility</p>
          <p className="text-white/60 text-sm">Toggle to show/hide the game button on player maps</p>
        </div>
        <Switch
          checked={scriptureMatchActive}
          onChange={handleToggleScriptureMatch}
        />
      </div>
    </div>
  );

  // Pop Game Toggle - Always visible (independent of competition sessions)
  const PopGameToggle = () => (
    <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl p-6 border border-red-500/30">
      <h2 className="text-xl font-bold text-red-400 flex items-center gap-2 mb-4">
        <Gamepad2 className="w-6 h-6" />
        Free Fall Pop Game
      </h2>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Red Orb Visibility</p>
          <p className="text-white/60 text-sm">Players can play anytime. Top 3 best scores are tracked permanently.</p>
        </div>
        <Switch
          checked={popGameVisibility}
          onChange={handleTogglePopGame}
        />
      </div>
    </div>
  );

  // Active competition view
  if (activeCompetition) {
    const currentRound = activeCompetition.competition_rounds?.find(
      r => r.round_number === activeCompetition.current_round
    );

    return (
      <div className="space-y-6">
        <ScriptureMatchToggle />
        <PopGameToggle />
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-amber-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Active Competition
            </h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                activeCompetition.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-300' :
                activeCompetition.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                'bg-blue-500/20 text-blue-300'
              }`}>
                {activeCompetition.status.replace('_', ' ').toUpperCase()}
              </span>
              <button
                onClick={handleCancelCompetition}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>

          {countdown !== null && (
            <div className="text-center py-8">
              <div className="text-6xl font-bold text-amber-400 animate-pulse">
                {countdown}
              </div>
              <p className="text-white/70 mt-2">Starting in...</p>
            </div>
          )}

          {activeCompetition.status === 'waiting' && countdown === null && (
            <button
              onClick={handleStartCompetition}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Competition (5s countdown)
            </button>
          )}

          {activeCompetition.status !== 'waiting' && activeCompetition.status !== 'completed' && (
            <div className="space-y-4">
              {/* Round Timer */}
              {roundTimeLeft !== null && (
                <div className="text-center bg-black/30 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                    <Clock className="w-6 h-6 text-amber-400" />
                    {Math.floor(roundTimeLeft / 60)}:{(roundTimeLeft % 60).toString().padStart(2, '0')}
                  </div>
                  <p className="text-white/70 text-sm">Round {activeCompetition.current_round} Time Remaining</p>
                </div>
              )}

              {/* Current Round Scores */}
              {currentRound && activeCompetition.current_round < 4 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-500/20 rounded-lg p-4 text-center border border-blue-500/30">
                    <div className="text-2xl font-bold text-blue-300">
                      Group {currentRound.group_a_letter}
                    </div>
                    <div className="text-4xl font-bold text-white mt-2">
                      {currentRound.group_a_score}
                    </div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg p-4 text-center border border-red-500/30">
                    <div className="text-2xl font-bold text-red-300">
                      Group {currentRound.group_b_letter}
                    </div>
                    <div className="text-4xl font-bold text-white mt-2">
                      {currentRound.group_b_score}
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Controls */}
              <div className="flex gap-4">
                {roundTimeLeft === 0 && currentRound?.status === 'in_progress' && (
                  <button
                    onClick={handleEndRound}
                    className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:scale-105 transition-transform"
                  >
                    End Round & Eliminate
                  </button>
                )}
                {currentRound?.status === 'completed' && activeCompetition.current_round < 4 && (
                  <button
                    onClick={handleStartNextRound}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
                  >
                    Start Round {activeCompetition.current_round + 1}
                  </button>
                )}
                {activeCompetition.current_round === 4 && roundTimeLeft === 0 && (
                  <button
                    onClick={handleCompleteCompetition}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold rounded-xl hover:scale-105 transition-transform"
                  >
                    <Crown className="w-5 h-5 inline mr-2" />
                    Complete & Show Winners
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Players List */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Players ({activeCompetition.competition_players?.length || 0})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
              {activeCompetition.competition_players?.map(player => (
                <div
                  key={player.id}
                  className={`p-2 rounded-lg text-xs ${
                    !player.is_qualified 
                      ? 'bg-gray-500/20 text-gray-400 line-through' 
                      : player.group_letter 
                        ? player.group_letter === 'A' || player.group_letter === 'C' || player.group_letter === 'E'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  <div className="font-medium truncate">{player.player_name}</div>
                  <div className="text-[10px] opacity-70">
                    {player.group_letter ? `Group ${player.group_letter}` : 'Final'}
                    {' • '}Score: {player.total_score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create new competition view
  const totalSelected = getTotalSelected();

  return (
    <div className="space-y-6">
      <ScriptureMatchToggle />
      <PopGameToggle />

      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-amber-500/30">
        <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6" />
          Create New Competition
        </h2>

        {/* Selection Counter */}
        <div className="mb-4 p-3 bg-black/30 rounded-lg flex items-center justify-between">
          <span className="text-white font-medium">Selected Players:</span>
          <span className={`text-2xl font-bold ${totalSelected === 24 ? 'text-green-400' : 'text-amber-400'}`}>
            {totalSelected}/24
          </span>
        </div>

        {/* Dual Leaderboard Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Leaderboard */}
          <div className="bg-black/20 rounded-lg p-4 border border-blue-500/30">
            <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Monthly Leaderboard (Top 20)
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {monthlyTopPlayers.length > 0 ? (
                monthlyTopPlayers.map((player) => {
                  const isSelected = selectedMonthlyIds.includes(player.user_id);
                  const isInOtherList = selectedPopGameIds.includes(player.user_id) || 
                                        manualPlayers.some(p => p.user_id === player.user_id);
                  return (
                    <div
                      key={player.user_id}
                      onClick={() => !isInOtherList && toggleMonthlySelection(player.user_id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-green-500/30 border border-green-500/50' 
                          : isInOtherList
                            ? 'bg-gray-500/20 border border-gray-500/30 opacity-50 cursor-not-allowed'
                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-green-500' : 'bg-white/10'
                      }`}>
                        {isSelected ? <Check className="w-4 h-4 text-white" /> : null}
                      </div>
                      <span className="font-bold text-amber-400 w-8">#{player.rank}</span>
                      <span className="text-white flex-1 truncate">{player.player_name}</span>
                      <span className="text-white/60 text-sm">{player.score.toLocaleString()}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-white/50 text-center py-4">No players this month yet</p>
              )}
            </div>
          </div>

          {/* Pop Game Leaderboard */}
          <div className="bg-black/20 rounded-lg p-4 border border-red-500/30">
            <h3 className="text-lg font-semibold text-red-300 mb-3 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-red-400" />
              Free Fall Leaderboard (Top 10)
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {popGameLeaderboard.length > 0 ? (
                popGameLeaderboard.map((player) => {
                  const isSelected = selectedPopGameIds.includes(player.user_id);
                  const isInOtherList = selectedMonthlyIds.includes(player.user_id) || 
                                        manualPlayers.some(p => p.user_id === player.user_id);
                  return (
                    <div
                      key={player.user_id}
                      onClick={() => !isInOtherList && togglePopGameSelection(player.user_id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-green-500/30 border border-green-500/50' 
                          : isInOtherList
                            ? 'bg-gray-500/20 border border-gray-500/30 opacity-50 cursor-not-allowed'
                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-green-500' : 'bg-white/10'
                      }`}>
                        {isSelected ? <Check className="w-4 h-4 text-white" /> : null}
                      </div>
                      <span className="font-bold text-red-400 w-8">#{player.rank}</span>
                      <span className="text-white flex-1 truncate">{player.player_name}</span>
                      <span className="text-white/60 text-sm">{player.score.toLocaleString()}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-white/50 text-center py-4">No Pop Game scores yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Manual Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" />
            Search & Add Players ({manualPlayers.length} added)
          </h3>
          
          {/* Search */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search player name..."
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-3 bg-black/30 rounded-lg p-2 max-h-32 overflow-y-auto">
              {searchResults.map(player => (
                <button
                  key={player.user_id}
                  onClick={() => addManualPlayer(player)}
                  className="w-full text-left p-2 hover:bg-white/10 rounded text-white text-sm flex items-center justify-between"
                >
                  <span>{player.player_name}</span>
                  <Plus className="w-4 h-4 text-green-400" />
                </button>
              ))}
            </div>
          )}

          {/* Selected Manual Players */}
          {manualPlayers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {manualPlayers.map(player => (
                <div
                  key={player.user_id}
                  className="bg-green-600/20 px-3 py-1 rounded-full text-sm text-white flex items-center gap-2 border border-green-600/30"
                >
                  {player.player_name}
                  <button onClick={() => removeManualPlayer(player.user_id)}>
                    <X className="w-4 h-4 text-red-400 hover:text-red-300" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Button */}
        <div className="flex items-center justify-between">
          <div className="text-white/70 text-sm">
            {totalSelected < 24 && (
              <span>Need {24 - totalSelected} more players</span>
            )}
            {totalSelected === 24 && (
              <span className="text-green-400 font-medium">✓ Ready to create competition!</span>
            )}
            {totalSelected > 24 && (
              <span className="text-red-400">Too many players selected</span>
            )}
          </div>
          <button
            onClick={handleCreateCompetition}
            disabled={totalSelected !== 24}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              totalSelected === 24
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:scale-105'
                : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Trophy className="w-5 h-5" />
            Create Competition
          </button>
        </div>
      </div>

      {/* Competition Workflow Info */}
      <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl p-6 border border-indigo-500/30">
        <h3 className="text-lg font-bold text-indigo-300 mb-4">📋 How the Competition Works</h3>
        <div className="space-y-3 text-sm text-white/80">
          <div className="flex gap-3">
            <span className="bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold">1</span>
            <p><strong>Create Competition:</strong> Select 24 players from the leaderboards and click Create.</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold">2</span>
            <p><strong>Start Competition:</strong> 5-second countdown, then 24 players split into Group A (12) vs Group B (12).</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold">3</span>
            <p><strong>Round 1:</strong> 1-minute timer. Groups answer questions. Losing group eliminated. (24 → 12)</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold">4</span>
            <p><strong>Round 2:</strong> Remaining 12 split into Group C vs D. Losing group eliminated. (12 → 6)</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold">5</span>
            <p><strong>Round 3:</strong> Remaining 6 split into Group E vs F. Losing group eliminated. (6 → 3)</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold">6</span>
            <p><strong>Final Round:</strong> 3 finalists compete individually. Highest score wins! 🏆</p>
          </div>
        </div>
      </div>
    </div>
  );
}
