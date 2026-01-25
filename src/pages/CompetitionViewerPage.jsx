import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { getActiveCompetition } from '@/lib/api/competition';
import { Trophy, Clock, Users, Crown, Star, ArrowLeft, Zap, Timer, Award } from 'lucide-react';
import Confetti from 'react-confetti';

const ROUND_DURATIONS = { 1: 120, 2: 60, 3: 60, 4: 120 };
const GROUP_LETTERS_BY_ROUND = { 1: ['A', 'B'], 2: ['C', 'D'], 3: ['E', 'F'], 4: [] };

export default function CompetitionViewerPage() {
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    loadCompetition();
    
    const channel = supabase
      .channel('competition-viewer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, loadCompetition)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_rounds' }, loadCompetition)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_players' }, loadCompetition)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_answers' }, loadCompetition)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Phase timer
  useEffect(() => {
    if (competition?.phase_ends_at && competition.phase !== 'idle' && competition.phase !== 'completed') {
      const interval = setInterval(() => {
        const endTime = new Date(competition.phase_ends_at).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setPhaseTimeLeft(remaining);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [competition?.phase_ends_at, competition?.phase]);

  useEffect(() => {
    if (competition?.status === 'completed' || competition?.phase === 'completed') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 10000);
    }
  }, [competition?.status, competition?.phase]);

  async function loadCompetition() {
    const comp = await getActiveCompetition();
    setCompetition(comp);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-christmasGold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] flex flex-col items-center justify-center p-4">
        <Trophy className="w-20 h-20 text-christmasGold/50 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">No Active Competition</h1>
        <p className="text-white/60 text-center mb-6">Check back later!</p>
        <button
          onClick={() => navigate('/map')}
          className="px-6 py-3 bg-gradient-to-r from-christmasGreen to-green-600 text-white rounded-xl font-bold flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Map
        </button>
      </div>
    );
  }

  const currentRound = competition.competition_rounds?.find(r => r.round_number === competition.current_round);
  const allPlayers = competition.competition_players || [];
  const qualifiedPlayers = allPlayers.filter(p => p.is_qualified);
  const eliminatedPlayers = allPlayers.filter(p => !p.is_qualified);

  // Get current round's group letters
  const currentGroupLetters = GROUP_LETTERS_BY_ROUND[competition.current_round] || [];
  const [groupALetter, groupBLetter] = currentGroupLetters;

  // Group players by their current group letter for display
  const groupAPlayers = qualifiedPlayers.filter(p => p.group_letter === groupALetter)
    .sort((a, b) => (b.current_round_score || 0) - (a.current_round_score || 0));
  const groupBPlayers = qualifiedPlayers.filter(p => p.group_letter === groupBLetter)
    .sort((a, b) => (b.current_round_score || 0) - (a.current_round_score || 0));

  // Calculate group totals
  const groupATotal = groupAPlayers.reduce((sum, p) => sum + (p.current_round_score || 0), 0);
  const groupBTotal = groupBPlayers.reduce((sum, p) => sum + (p.current_round_score || 0), 0);

  // For final round (individual)
  const finalPlayers = competition.current_round === 4 
    ? qualifiedPlayers.sort((a, b) => (b.current_round_score || 0) - (a.current_round_score || 0))
    : [];

  // Top 3 winners (final round standings)
  const top3Winners = [...qualifiedPlayers].sort((a, b) => (b.current_round_score || 0) - (a.current_round_score || 0)).slice(0, 3);

  // Top 7 overall scores (all players, by total_score)
  const top7Overall = [...allPlayers].sort((a, b) => (b.total_score || 0) - (a.total_score || 0)).slice(0, 7);

  // Phase display helpers
  const getPhaseLabel = () => {
    switch (competition.phase) {
      case 'countdown': return '🚀 Starting Soon';
      case 'round_active': return `⚔️ Round ${competition.current_round} LIVE`;
      case 'break': return '⏸️ Break - Regrouping';
      case 'completed': return '🏆 Competition Complete';
      default: return '⏳ Waiting';
    }
  };

  const getPhaseColor = () => {
    switch (competition.phase) {
      case 'countdown': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'round_active': return 'bg-green-500/20 text-green-300 border-green-500/50 animate-pulse';
      case 'break': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'completed': return 'bg-christmasGold/20 text-christmasGold border-christmasGold/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCompleted = competition.phase === 'completed' || competition.status === 'completed';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] pb-20">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      {/* Header */}
      <div className="sticky top-0 bg-black/50 backdrop-blur-lg border-b border-white/10 p-4 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/map')} className="p-2 text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-christmasGold" />
            <span className="text-white font-bold">Live Competition</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getPhaseColor()}`}>
            {getPhaseLabel()}
          </div>
        </div>
      </div>

      {/* Round Progress */}
      <div className="p-4">
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4].map(round => {
            const isActive = competition.current_round === round && competition.phase === 'round_active';
            const isCompleted = competition.current_round > round || competition.phase === 'completed';
            const isCurrent = competition.current_round === round;
            
            return (
              <div key={round} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  isActive ? 'bg-christmasGold text-black animate-pulse scale-110' :
                  isCompleted ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-blue-500 text-white' :
                  'bg-white/10 text-white/50'
                }`}>
                  {isCompleted && competition.current_round > round ? '✓' : round}
                </div>
                <span className={`text-xs mt-1 ${isCurrent ? 'text-christmasGold font-bold' : 'text-white/50'}`}>
                  {round === 4 ? 'Final' : `R${round}`}
                </span>
                <span className="text-[10px] text-white/30">
                  {ROUND_DURATIONS[round] / 60}m
                </span>
              </div>
            );
          })}
        </div>

        {/* Phase Timer */}
        {phaseTimeLeft !== null && !isCompleted && (
          <div className={`rounded-xl p-4 text-center mb-6 border ${
            competition.phase === 'round_active' ? 'bg-green-500/10 border-green-500/30' :
            competition.phase === 'countdown' ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-blue-500/10 border-blue-500/30'
          }`}>
            <div className="flex items-center justify-center gap-3">
              <Timer className={`w-8 h-8 ${
                competition.phase === 'round_active' ? 'text-green-400' :
                competition.phase === 'countdown' ? 'text-yellow-400' :
                'text-blue-400'
              }`} />
              <span className="text-4xl font-mono font-bold text-white">
                {formatTime(phaseTimeLeft)}
              </span>
            </div>
            <p className="text-white/60 text-sm mt-1">
              {competition.phase === 'countdown' && 'Competition starting...'}
              {competition.phase === 'round_active' && `Round ${competition.current_round} in progress`}
              {competition.phase === 'break' && 'Regrouping players...'}
            </p>
          </div>
        )}

        {/* Countdown Phase */}
        {competition.phase === 'countdown' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-white mb-2">Get Ready!</h2>
            <p className="text-white/60">Competition starts in {phaseTimeLeft} seconds</p>
            <div className="mt-4 flex justify-center gap-2">
              <Users className="w-5 h-5 text-christmasGold" />
              <span className="text-christmasGold">{qualifiedPlayers.length} players ready</span>
            </div>
          </div>
        )}

        {/* Break Phase - Regrouping */}
        {competition.phase === 'break' && (
          <div className="text-center py-6 mb-6 bg-blue-500/10 rounded-xl border border-blue-500/30">
            <div className="text-4xl mb-3">⏸️</div>
            <h2 className="text-xl font-bold text-white mb-2">Regrouping Players</h2>
            <p className="text-white/60 text-sm">
              Round {competition.current_round} ended. Preparing Round {competition.current_round + 1}...
            </p>
            <p className="text-blue-300 text-sm mt-2">
              {qualifiedPlayers.length} players advancing
            </p>
          </div>
        )}

        {/* Live Round Scores (Groups) - Rounds 1-3 */}
        {competition.phase === 'round_active' && competition.current_round < 4 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-christmasGold" />
              Live Scores - Round {competition.current_round}
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Group A */}
              <div className={`rounded-xl p-3 border transition-all ${
                groupATotal > groupBTotal 
                  ? 'bg-green-500/20 border-green-500/50 ring-2 ring-green-500/30' 
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}>
                <div className="text-center mb-3">
                  <div className="text-xl font-bold text-blue-300">
                    Group {groupALetter}
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {groupATotal}
                  </div>
                  {groupATotal > groupBTotal && (
                    <span className="text-xs text-green-400 font-medium">🏆 Leading</span>
                  )}
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {groupAPlayers.map((p, idx) => (
                    <div key={p.id} className="flex justify-between items-center text-xs bg-black/20 rounded px-2 py-1">
                      <span className="text-white/80 truncate flex-1">{p.player_name}</span>
                      <span className="text-blue-300 font-bold ml-2">+{p.current_round_score || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Group B */}
              <div className={`rounded-xl p-3 border transition-all ${
                groupBTotal > groupATotal 
                  ? 'bg-green-500/20 border-green-500/50 ring-2 ring-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="text-center mb-3">
                  <div className="text-xl font-bold text-red-300">
                    Group {groupBLetter}
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {groupBTotal}
                  </div>
                  {groupBTotal > groupATotal && (
                    <span className="text-xs text-green-400 font-medium">🏆 Leading</span>
                  )}
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {groupBPlayers.map((p, idx) => (
                    <div key={p.id} className="flex justify-between items-center text-xs bg-black/20 rounded px-2 py-1">
                      <span className="text-white/80 truncate flex-1">{p.player_name}</span>
                      <span className="text-red-300 font-bold ml-2">+{p.current_round_score || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final Round - Individual Scores */}
        {competition.phase === 'round_active' && competition.current_round === 4 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-christmasGold" />
              Final Round - Top 3
            </h3>
            <div className="space-y-3">
              {finalPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  className={`rounded-xl p-4 flex items-center gap-4 ${
                    idx === 0 ? 'bg-gradient-to-r from-christmasGold/30 to-yellow-500/20 border border-christmasGold/50' :
                    idx === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-300/10 border border-gray-400/30' :
                    'bg-gradient-to-r from-amber-700/20 to-amber-600/10 border border-amber-600/30'
                  }`}
                >
                  <div className="text-3xl">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white">{player.player_name}</div>
                    <div className="text-xs text-white/60">Total: {player.total_score}</div>
                  </div>
                  <div className="flex items-center gap-1 text-christmasGold font-bold text-xl">
                    <Zap className="w-5 h-5" />
                    {player.current_round_score || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed State - Dual Results Tables */}
        {isCompleted && (
          <div className="space-y-6">
            {/* Table 1: Top 3 Winners */}
            <div className="bg-gradient-to-br from-christmasGold/20 to-yellow-500/10 rounded-xl p-4 border border-christmasGold/30">
              <h2 className="text-xl font-bold text-christmasGold text-center mb-4 flex items-center justify-center gap-2">
                <Crown className="w-6 h-6" />
                Competition Winners
              </h2>
              
              {/* Podium */}
              <div className="flex items-end justify-center gap-2 mb-4">
                {/* 2nd Place */}
                {top3Winners[1] && (
                  <div className="flex flex-col items-center">
                    <div className="text-2xl mb-1">🥈</div>
                    <div className="bg-gradient-to-t from-gray-400 to-gray-300 w-20 h-20 rounded-t-lg flex flex-col items-center justify-center">
                      <span className="text-white font-bold text-xs truncate max-w-16 text-center px-1">
                        {top3Winners[1].player_name}
                      </span>
                      <span className="text-white/80 text-xs">{top3Winners[1].current_round_score || 0}</span>
                    </div>
                  </div>
                )}
                
                {/* 1st Place */}
                {top3Winners[0] && (
                  <div className="flex flex-col items-center">
                    <Crown className="w-6 h-6 text-christmasGold mb-1 animate-bounce" />
                    <div className="text-3xl mb-1">🥇</div>
                    <div className="bg-gradient-to-t from-christmasGold to-yellow-400 w-24 h-28 rounded-t-lg flex flex-col items-center justify-center">
                      <span className="text-black font-bold text-sm truncate max-w-20 text-center px-1">
                        {top3Winners[0].player_name}
                      </span>
                      <span className="text-black/80 text-sm">{top3Winners[0].current_round_score || 0}</span>
                    </div>
                  </div>
                )}
                
                {/* 3rd Place */}
                {top3Winners[2] && (
                  <div className="flex flex-col items-center">
                    <div className="text-2xl mb-1">🥉</div>
                    <div className="bg-gradient-to-t from-amber-700 to-amber-600 w-20 h-16 rounded-t-lg flex flex-col items-center justify-center">
                      <span className="text-white font-bold text-xs truncate max-w-16 text-center px-1">
                        {top3Winners[2].player_name}
                      </span>
                      <span className="text-white/80 text-xs">{top3Winners[2].current_round_score || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table 2: Top 7 Overall Scores */}
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/10 rounded-xl p-4 border border-purple-500/30">
              <h2 className="text-lg font-bold text-white text-center mb-4 flex items-center justify-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                Top 7 Overall Scores
              </h2>
              
              <div className="space-y-2">
                {top7Overall.map((player, idx) => {
                  const isWinner = top3Winners.some(w => w.id === player.id);
                  const eliminatedRound = player.round_eliminated;
                  
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        isWinner ? 'bg-christmasGold/20 border border-christmasGold/30' : 'bg-black/20'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-christmasGold text-black' :
                        idx === 1 ? 'bg-gray-300 text-black' :
                        idx === 2 ? 'bg-amber-600 text-white' :
                        'bg-white/20 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-white font-medium truncate">
                        {player.player_name}
                      </span>
                      <div className="text-right">
                        <span className="text-christmasGold font-bold">{player.total_score || 0}</span>
                        <span className="text-white/40 text-xs ml-2">
                          {isWinner ? '🏆 Final' : eliminatedRound ? `(R${eliminatedRound})` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Round History */}
        {competition.competition_rounds?.filter(r => r.status === 'completed').length > 0 && !isCompleted && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white/70 mb-3">Round History</h3>
            <div className="space-y-2">
              {competition.competition_rounds
                .filter(r => r.status === 'completed')
                .sort((a, b) => a.round_number - b.round_number)
                .map(round => (
                  <div key={round.id} className="bg-black/30 rounded-lg p-2 flex items-center justify-between text-sm">
                    <span className="text-white/70">Round {round.round_number}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={round.winning_group === round.group_a_letter ? 'text-green-400 font-bold' : 'text-red-400'}>
                        {round.group_a_letter}: {round.group_a_score}
                      </span>
                      <span className="text-white/30">vs</span>
                      <span className={round.winning_group === round.group_b_letter ? 'text-green-400 font-bold' : 'text-red-400'}>
                        {round.group_b_letter}: {round.group_b_score}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Eliminated Players */}
        {eliminatedPlayers.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white/50 mb-3">Eliminated Players ({eliminatedPlayers.length})</h3>
            <div className="flex flex-wrap gap-2">
              {eliminatedPlayers.map(player => (
                <span
                  key={player.id}
                  className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs"
                >
                  {player.player_name} 
                  <span className="text-gray-500 ml-1">(R{player.round_eliminated})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
