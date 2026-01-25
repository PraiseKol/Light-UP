import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  fetchMonthlyTopPlayers, 
  createCompetition, 
  getActiveCompetition,
  searchPlayers,
  cancelCompetition,
  groupPlayersForCompetition,
  startAutomatedCompetition,
  processPhaseTransition,
  ROUND_DURATIONS,
  COUNTDOWN_DURATION,
  BREAK_DURATION
} from '@/lib/api/competition';
import {
  getActivePopGameSession,
  getAggregatedScores,
  getPopGameActive,
  setPopGameActive,
  fetchPopGameTopForCompetition
} from '@/lib/api/popGame';
import { getScriptureMatchActive, setScriptureMatchActive } from '@/lib/api/scriptureMatch';
import { Trophy, Users, Play, Search, Plus, X, Crown, Clock, Gamepad2, Puzzle, XCircle, Check, Zap, Timer, AlertCircle } from 'lucide-react';
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
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(null);
  
  // Selection state for leaderboards
  const [selectedMonthlyIds, setSelectedMonthlyIds] = useState([]);
  const [selectedPopGameIds, setSelectedPopGameIds] = useState([]);
  
  // Scripture Match state
  const [scriptureMatchActive, setScriptureMatchActiveState] = useState(false);
  
  // Pop Game visibility state
  const [popGameVisibility, setPopGameVisibility] = useState(false);

  // Load data and subscribe to updates
  useEffect(() => {
    loadData();
    
    const channel = supabase
      .channel('competition-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_rounds' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_players' }, loadData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Phase timer and auto-transition
  useEffect(() => {
    if (!activeCompetition?.phase_ends_at) {
      setPhaseTimeLeft(null);
      return;
    }

    const interval = setInterval(async () => {
      const endTime = new Date(activeCompetition.phase_ends_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setPhaseTimeLeft(remaining);

      // Auto-trigger transition when timer reaches 0
      if (remaining === 0) {
        try {
          await processPhaseTransition(activeCompetition.id);
        } catch (error) {
          console.error('Phase transition error:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCompetition?.phase_ends_at, activeCompetition?.id]);

  async function loadData() {
    setLoading(true);
    const competition = await getActiveCompetition();
    setActiveCompetition(competition);

    if (!competition) {
      const topPlayers = await fetchMonthlyTopPlayers(20);
      setMonthlyTopPlayers(topPlayers);
      
      const popGameTop = await fetchPopGameTopForCompetition();
      setPopGameLeaderboard(popGameTop);
    }
    
    const scriptureActive = await getScriptureMatchActive();
    setScriptureMatchActiveState(scriptureActive);
    
    const popActive = await getPopGameActive();
    setPopGameVisibility(popActive);
    
    setLoading(false);
  }

  async function handleToggleScriptureMatch(checked) {
    const { data: { user } } = await supabase.auth.getUser();
    const success = await setScriptureMatchActive(checked, user?.id);
    if (success) {
      setScriptureMatchActiveState(checked);
      toast.success(checked ? 'Scripture Match enabled!' : 'Scripture Match disabled.');
    } else {
      toast.error('Failed to update Scripture Match visibility');
    }
  }

  async function handleTogglePopGame(checked) {
    const { data: { user } } = await supabase.auth.getUser();
    const success = await setPopGameActive(checked, user?.id);
    if (success) {
      setPopGameVisibility(checked);
      toast.success(checked ? 'Pop Game enabled!' : 'Pop Game disabled.');
    } else {
      toast.error('Failed to update Pop Game visibility');
    }
  }

  async function handleSearch() {
    if (searchTerm.length < 2) return;
    const results = await searchPlayers(searchTerm);
    const allSelectedIds = getUniqueSelectedIds();
    setSearchResults(results.filter(p => !allSelectedIds.includes(p.user_id)));
  }

  function getUniqueSelectedIds() {
    return [...new Set([
      ...selectedMonthlyIds,
      ...selectedPopGameIds,
      ...manualPlayers.map(p => p.user_id)
    ])];
  }

  function getTotalSelected() {
    return getUniqueSelectedIds().length;
  }

  function toggleMonthlySelection(userId) {
    setSelectedMonthlyIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setSelectedPopGameIds(prev => prev.filter(id => id !== userId));
  }

  function togglePopGameSelection(userId) {
    setSelectedPopGameIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setSelectedMonthlyIds(prev => prev.filter(id => id !== userId));
  }

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
      toast.success('Competition created! Click "Group Players" to assign groups.');
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

  async function handleGroupPlayers() {
    const success = await groupPlayersForCompetition(activeCompetition.id);
    if (success) {
      toast.success('Players grouped into A & B! Ready to start.');
      loadData();
    } else {
      toast.error('Failed to group players');
    }
  }

  async function handleStartCompetition() {
    const success = await startAutomatedCompetition(activeCompetition.id);
    if (success) {
      toast.success('Competition started! 30-second countdown begins...');
      loadData();
    } else {
      toast.error('Failed to start competition');
    }
  }

  // Get phase display info
  function getPhaseInfo() {
    if (!activeCompetition) return null;
    
    const { phase, current_round } = activeCompetition;
    
    switch (phase) {
      case 'idle':
        return { label: 'Waiting', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
      case 'grouped':
        return { label: 'Players Grouped', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
      case 'countdown':
        return { label: `Round ${current_round} Starting...`, color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
      case 'round_active':
        return { label: `Round ${current_round} Active`, color: 'text-green-400', bgColor: 'bg-green-500/20 animate-pulse' };
      case 'break':
        return { label: 'Break - Regrouping...', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
      case 'completed':
        return { label: 'Completed', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
      default:
        return { label: phase, color: 'text-white', bgColor: 'bg-white/10' };
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Scripture Match Toggle
  const ScriptureMatchToggle = () => (
    <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-6 border border-yellow-500/30">
      <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2 mb-4">
        <Puzzle className="w-6 h-6" />
        Memory Challenge
      </h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Yellow Orb Visibility</p>
          <p className="text-white/60 text-sm">Toggle to show/hide on player maps</p>
        </div>
        <Switch checked={scriptureMatchActive} onChange={handleToggleScriptureMatch} />
      </div>
    </div>
  );

  // Pop Game Toggle
  const PopGameToggle = () => (
    <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl p-6 border border-red-500/30">
      <h2 className="text-xl font-bold text-red-400 flex items-center gap-2 mb-4">
        <Gamepad2 className="w-6 h-6" />
        Free Fall Pop Game
      </h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Red Orb Visibility</p>
          <p className="text-white/60 text-sm">Players can play anytime when enabled.</p>
        </div>
        <Switch checked={popGameVisibility} onChange={handleTogglePopGame} />
      </div>
    </div>
  );

  // Active competition view
  if (activeCompetition) {
    const phaseInfo = getPhaseInfo();
    const currentRound = activeCompetition.competition_rounds?.find(
      r => r.round_number === activeCompetition.current_round
    );
    const qualifiedPlayers = activeCompetition.competition_players?.filter(p => p.is_qualified) || [];
    const eliminatedPlayers = activeCompetition.competition_players?.filter(p => !p.is_qualified) || [];

    // Group players by their current group
    const groupAPlayers = qualifiedPlayers.filter(p => ['A', 'C', 'E'].includes(p.group_letter));
    const groupBPlayers = qualifiedPlayers.filter(p => ['B', 'D', 'F'].includes(p.group_letter));

    return (
      <div className="space-y-6">
        <ScriptureMatchToggle />
        <PopGameToggle />
        
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-amber-500/30">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Active Competition
            </h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${phaseInfo?.bgColor} ${phaseInfo?.color}`}>
                {phaseInfo?.label}
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

          {/* Phase Timer */}
          {phaseTimeLeft !== null && activeCompetition.phase !== 'completed' && activeCompetition.phase !== 'idle' && activeCompetition.phase !== 'grouped' && (
            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-amber-500/30">
              <div className="flex items-center justify-center gap-4">
                <Timer className="w-8 h-8 text-amber-400" />
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-white">
                    {Math.floor(phaseTimeLeft / 60)}:{(phaseTimeLeft % 60).toString().padStart(2, '0')}
                  </div>
                  <p className="text-white/60 text-sm">
                    {activeCompetition.phase === 'countdown' && 'Round starting in...'}
                    {activeCompetition.phase === 'round_active' && `Round ${activeCompetition.current_round} ends in...`}
                    {activeCompetition.phase === 'break' && 'Next round starts in...'}
                  </p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-black/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-1000"
                  style={{
                    width: `${(() => {
                      let totalDuration;
                      if (activeCompetition.phase === 'countdown') totalDuration = COUNTDOWN_DURATION;
                      else if (activeCompetition.phase === 'break') totalDuration = BREAK_DURATION;
                      else totalDuration = ROUND_DURATIONS[activeCompetition.current_round] || 60;
                      return ((totalDuration - phaseTimeLeft) / totalDuration) * 100;
                    })()}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Admin Controls */}
          <div className="mb-6">
            {activeCompetition.phase === 'idle' && (
              <button
                onClick={handleGroupPlayers}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Group Players (Assign A & B)
              </button>
            )}

            {activeCompetition.phase === 'grouped' && (
              <button
                onClick={handleStartCompetition}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Competition (Fully Automated)
              </button>
            )}

            {['countdown', 'round_active', 'break'].includes(activeCompetition.phase) && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                <Zap className="w-6 h-6 text-green-400 animate-pulse" />
                <div>
                  <p className="text-green-400 font-bold">Competition Running Automatically</p>
                  <p className="text-white/60 text-sm">Rounds, breaks, and eliminations are handled automatically.</p>
                </div>
              </div>
            )}
          </div>

          {/* Live Group Scores */}
          {currentRound && activeCompetition.phase === 'round_active' && activeCompetition.current_round < 4 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">Group {currentRound.group_a_letter}</div>
                  <div className="text-5xl font-bold text-white my-2">{currentRound.group_a_score}</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {groupAPlayers.map(p => (
                      <div key={p.id} className="flex justify-between text-xs px-2">
                        <span className="text-white/70 truncate">{p.player_name}</span>
                        <span className="text-blue-300 font-mono">{p.current_round_score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-red-500/20 rounded-xl p-4 border border-red-500/30">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300">Group {currentRound.group_b_letter}</div>
                  <div className="text-5xl font-bold text-white my-2">{currentRound.group_b_score}</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {groupBPlayers.map(p => (
                      <div key={p.id} className="flex justify-between text-xs px-2">
                        <span className="text-white/70 truncate">{p.player_name}</span>
                        <span className="text-red-300 font-mono">{p.current_round_score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Round - Individual Scores */}
          {activeCompetition.current_round === 4 && activeCompetition.phase === 'round_active' && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-christmasGold" />
                Final Round - Top 3 Battle
              </h3>
              <div className="space-y-2">
                {qualifiedPlayers
                  .sort((a, b) => b.current_round_score - a.current_round_score)
                  .map((player, idx) => (
                    <div
                      key={player.id}
                      className={`rounded-xl p-3 flex items-center gap-4 ${
                        idx === 0 ? 'bg-gradient-to-r from-christmasGold/30 to-yellow-500/20 border border-christmasGold/50' :
                        idx === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-300/10 border border-gray-400/30' :
                        'bg-gradient-to-r from-amber-700/20 to-amber-600/10 border border-amber-600/30'
                      }`}
                    >
                      <div className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                      <div className="flex-1">
                        <div className="font-bold text-white">{player.player_name}</div>
                      </div>
                      <div className="text-2xl font-bold text-christmasGold">{player.current_round_score}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Round Progress */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Round Progress</h3>
            <div className="flex justify-between">
              {[1, 2, 3, 4].map(round => {
                const isActive = activeCompetition.current_round === round && activeCompetition.phase === 'round_active';
                const isCompleted = activeCompetition.current_round > round || 
                  (activeCompetition.current_round === round && ['break', 'completed'].includes(activeCompetition.phase));
                const isPending = activeCompetition.current_round < round;
                
                return (
                  <div key={round} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      isActive ? 'bg-christmasGold text-black animate-pulse scale-110' :
                      isCompleted ? 'bg-green-500 text-white' :
                      'bg-white/10 text-white/50'
                    }`}>
                      {isCompleted ? '✓' : round}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'text-christmasGold font-bold' : 'text-white/50'}`}>
                      {round === 4 ? 'Final' : `R${round}`}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {ROUND_DURATIONS[round] / 60}m
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Players List */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Qualified Players ({qualifiedPlayers.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {qualifiedPlayers.map(player => (
                <div
                  key={player.id}
                  className={`p-2 rounded-lg text-xs ${
                    ['A', 'C', 'E'].includes(player.group_letter)
                      ? 'bg-blue-500/20 text-blue-300'
                      : ['B', 'D', 'F'].includes(player.group_letter)
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  <div className="font-medium truncate">{player.player_name}</div>
                  <div className="text-[10px] opacity-70">
                    {player.group_letter ? `Group ${player.group_letter}` : 'Final'}
                    {' • '}Total: {player.total_score}
                  </div>
                </div>
              ))}
            </div>

            {eliminatedPlayers.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm text-white/50 mb-2">Eliminated ({eliminatedPlayers.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {eliminatedPlayers.map(player => (
                    <span
                      key={player.id}
                      className="px-2 py-0.5 bg-gray-500/20 text-gray-500 rounded text-xs line-through"
                    >
                      {player.player_name} (R{player.round_eliminated})
                    </span>
                  ))}
                </div>
              </div>
            )}
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
            {totalSelected < 24 && <span>Need {24 - totalSelected} more players</span>}
            {totalSelected === 24 && <span className="text-green-400 font-medium">✓ Ready to create competition!</span>}
            {totalSelected > 24 && <span className="text-red-400">Too many players selected</span>}
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
        <h3 className="text-lg font-bold text-indigo-300 mb-4">🤖 Fully Automated Competition Flow</h3>
        <div className="space-y-3 text-sm text-white/80">
          <div className="flex gap-3">
            <span className="bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold shrink-0">1</span>
            <p><strong>Create Competition:</strong> Select 24 players from leaderboards.</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold shrink-0">2</span>
            <p><strong>Group Players:</strong> Randomly assign to Group A (12) and Group B (12).</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold shrink-0">3</span>
            <p><strong>Start Competition:</strong> Everything is automated from here!</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 mt-2">
            <p className="text-white/60 text-xs mb-2">⏱️ Timing:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>• 30s countdown before each round</div>
              <div>• Round 1: 2 minutes (24→12)</div>
              <div>• Round 2: 1 minute (12→6)</div>
              <div>• Round 3: 1 minute (6→3)</div>
              <div>• Final: 2 minutes (top 3)</div>
              <div>• 30s break between rounds</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
