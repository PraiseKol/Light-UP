import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getActiveCompetition,
  cancelCompetition,
  groupPlayersForCompetition,
  startAutomatedCompetition,
  processPhaseTransition,
  ROUND_DURATIONS,
  COUNTDOWN_DURATION,
  BREAK_DURATION
} from '@/lib/api/competition';
import { getPopGameActive, setPopGameActive } from '@/lib/api/popGame';
import { getScriptureMatchActive, setScriptureMatchActive } from '@/lib/api/scriptureMatch';
import { Trophy, Users, Play, Crown, Gamepad2, Puzzle, XCircle, Zap, Timer } from 'lucide-react';
import { toast } from 'sonner';
import Switch from '@/components/ui/Switch';
import MonthlyCompetitionPanel from '@/admin/MonthlyCompetitionPanel';


export default function CompetitionManager() {
  const [activeCompetition, setActiveCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(null);

  const [scriptureMatchActive, setScriptureMatchActiveState] = useState(false);
  const [popGameVisibility, setPopGameVisibility] = useState(false);

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

      const playerUserIds = activeCompetition.competition_players?.map(p => p.user_id) || [];

      if (playerUserIds.length > 0) {
        try {
          await fetch(
            'https://rhanvchqlilmzxmufode.supabase.co/functions/v1/send-push-notification',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoYW52Y2hxbGlsbXp4bXVmb2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDg5MzIsImV4cCI6MjA2ODA4NDkzMn0.OQ2cN38ZpK-J9GBCFMbqgSWxZxhl229CcBTr6EYS_as'
              },
              body: JSON.stringify({
                userIds: playerUserIds,
                notification: {
                  title: '🏆 Competition Alert!',
                  body: 'You have been selected for the tournament! Open the app to get ready.',
                  data: { type: 'competition_grouped', url: '/competition' }
                }
              })
            }
          );
        } catch (error) {
          console.error('Failed to send push notifications:', error);
        }
      }

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

  function getPhaseInfo() {
    if (!activeCompetition) return null;
    const { phase, current_round } = activeCompetition;
    switch (phase) {
      case 'idle': return { label: 'Waiting', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
      case 'grouped': return { label: 'Players Grouped', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
      case 'countdown': return { label: `Round ${current_round} Starting...`, color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
      case 'round_active': return { label: `Round ${current_round} Active`, color: 'text-green-400', bgColor: 'bg-green-500/20 animate-pulse' };
      case 'break': return { label: 'Break - Regrouping...', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
      case 'completed': return { label: 'Completed', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
      default: return { label: phase, color: 'text-white', bgColor: 'bg-white/10' };
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

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

  if (activeCompetition) {
    const phaseInfo = getPhaseInfo();
    const currentRound = activeCompetition.competition_rounds?.find(
      r => r.round_number === activeCompetition.current_round
    );
    const qualifiedPlayers = activeCompetition.competition_players?.filter(p => p.is_qualified) || [];
    const eliminatedPlayers = activeCompetition.competition_players?.filter(p => !p.is_qualified) || [];

    const groupAPlayers = qualifiedPlayers.filter(p => ['A', 'C', 'E'].includes(p.group_letter));
    const groupBPlayers = qualifiedPlayers.filter(p => ['B', 'D', 'F'].includes(p.group_letter));

    return (
      <div className="space-y-6">
        <ScriptureMatchToggle />
        <PopGameToggle />

        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-amber-500/30">
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

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Round Progress</h3>
            <div className="flex justify-between">
              {[1, 2, 3, 4].map(round => {
                const isActive = activeCompetition.current_round === round && activeCompetition.phase === 'round_active';
                const isCompleted = activeCompetition.current_round > round ||
                  (activeCompetition.current_round === round && ['break', 'completed'].includes(activeCompetition.phase));
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

  // No active competition → only the monthly auto-selection panel
  return (
    <div className="space-y-6">
      <ScriptureMatchToggle />
      <PopGameToggle />
      <MonthlyCompetitionPanel onCreated={loadData} />
    </div>
  );
}
