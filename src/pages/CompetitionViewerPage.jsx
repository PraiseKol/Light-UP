import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { getActiveCompetition } from '@/lib/api/competition';
import { Trophy, Clock, Users, Crown, Star, ArrowLeft, Zap } from 'lucide-react';
import Confetti from 'react-confetti';

export default function CompetitionViewerPage() {
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [roundTimeLeft, setRoundTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    loadCompetition();
    
    const channel = supabase
      .channel('competition-viewer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions' }, loadCompetition)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_rounds' }, loadCompetition)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_players' }, loadCompetition)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (competition?.round_ends_at && competition.status !== 'waiting' && competition.status !== 'completed') {
      const interval = setInterval(() => {
        const endTime = new Date(competition.round_ends_at).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setRoundTimeLeft(remaining);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [competition?.round_ends_at, competition?.status]);

  useEffect(() => {
    if (competition?.status === 'completed') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 10000);
    }
  }, [competition?.status]);

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
  const qualifiedPlayers = competition.competition_players?.filter(p => p.is_qualified) || [];
  const eliminatedPlayers = competition.competition_players?.filter(p => !p.is_qualified) || [];

  // Group players by group letter
  const groupAPlayers = qualifiedPlayers.filter(p => 
    p.group_letter === 'A' || p.group_letter === 'C' || p.group_letter === 'E'
  );
  const groupBPlayers = qualifiedPlayers.filter(p => 
    p.group_letter === 'B' || p.group_letter === 'D' || p.group_letter === 'F'
  );
  const finalPlayers = qualifiedPlayers.filter(p => !p.group_letter);

  // Get top 3 for final results
  const sortedFinalPlayers = [...qualifiedPlayers].sort((a, b) => b.total_score - a.total_score);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c1445] via-[#1e3a5f] to-[#0d1b2a] pb-20">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      {/* Header */}
      <div className="sticky top-0 bg-black/50 backdrop-blur-lg border-b border-white/10 p-4 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/map')}
            className="p-2 text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-christmasGold" />
            <span className="text-white font-bold">Live Competition</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            competition.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-300' :
            competition.status === 'completed' ? 'bg-green-500/20 text-green-300' :
            'bg-blue-500/20 text-blue-300 animate-pulse'
          }`}>
            {competition.status === 'waiting' ? 'STARTING SOON' :
             competition.status === 'completed' ? 'COMPLETED' :
             `ROUND ${competition.current_round} LIVE`}
          </div>
        </div>
      </div>

      {/* Round Progress */}
      <div className="p-4">
        <div className="flex justify-between mb-6">
          {[1, 2, 3, 4].map(round => {
            const isActive = competition.current_round === round;
            const isCompleted = competition.current_round > round || competition.status === 'completed';
            
            return (
              <div key={round} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isActive ? 'bg-christmasGold text-black animate-pulse' :
                  isCompleted ? 'bg-green-500 text-white' :
                  'bg-white/10 text-white/50'
                }`}>
                  {isCompleted ? '✓' : round}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'text-christmasGold' : 'text-white/50'}`}>
                  {round === 4 ? 'Final' : `R${round}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Timer */}
        {roundTimeLeft !== null && competition.status !== 'waiting' && competition.status !== 'completed' && (
          <div className="bg-black/30 rounded-xl p-4 text-center mb-6 border border-christmasGold/30">
            <div className="flex items-center justify-center gap-3">
              <Clock className="w-8 h-8 text-christmasGold" />
              <span className="text-4xl font-mono font-bold text-white">
                {Math.floor(roundTimeLeft / 60)}:{(roundTimeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <p className="text-white/60 text-sm mt-1">Round {competition.current_round} Time Remaining</p>
          </div>
        )}

        {/* Waiting State */}
        {competition.status === 'waiting' && (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-christmasGold mx-auto animate-bounce mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Competition Starting Soon!</h2>
            <p className="text-white/60">{competition.competition_players?.length || 0} players ready</p>
          </div>
        )}

        {/* Completed State - Podium */}
        {competition.status === 'completed' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-christmasGold text-center mb-6 flex items-center justify-center gap-2">
              <Crown className="w-8 h-8" />
              Final Results
            </h2>
            
            {/* Podium */}
            <div className="flex items-end justify-center gap-2 mb-6">
              {/* 2nd Place */}
              {sortedFinalPlayers[1] && (
                <div className="flex flex-col items-center">
                  <div className="text-3xl mb-2">🥈</div>
                  <div className="bg-gradient-to-t from-gray-400 to-gray-300 w-24 h-24 rounded-t-lg flex flex-col items-center justify-center">
                    <span className="text-white font-bold text-sm truncate max-w-20">
                      {sortedFinalPlayers[1].player_name}
                    </span>
                    <span className="text-white/80 text-xs">{sortedFinalPlayers[1].total_score}</span>
                  </div>
                </div>
              )}
              
              {/* 1st Place */}
              {sortedFinalPlayers[0] && (
                <div className="flex flex-col items-center">
                  <Crown className="w-8 h-8 text-christmasGold mb-1 animate-bounce" />
                  <div className="text-4xl mb-2">🥇</div>
                  <div className="bg-gradient-to-t from-christmasGold to-yellow-400 w-28 h-32 rounded-t-lg flex flex-col items-center justify-center">
                    <span className="text-black font-bold truncate max-w-24">
                      {sortedFinalPlayers[0].player_name}
                    </span>
                    <span className="text-black/80 text-sm">{sortedFinalPlayers[0].total_score}</span>
                  </div>
                </div>
              )}
              
              {/* 3rd Place */}
              {sortedFinalPlayers[2] && (
                <div className="flex flex-col items-center">
                  <div className="text-3xl mb-2">🥉</div>
                  <div className="bg-gradient-to-t from-amber-700 to-amber-600 w-24 h-20 rounded-t-lg flex flex-col items-center justify-center">
                    <span className="text-white font-bold text-sm truncate max-w-20">
                      {sortedFinalPlayers[2].player_name}
                    </span>
                    <span className="text-white/80 text-xs">{sortedFinalPlayers[2].total_score}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Round Scores */}
        {currentRound && competition.current_round < 4 && competition.status !== 'completed' && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4 text-center">Group Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300 mb-2">
                    Group {currentRound.group_a_letter}
                  </div>
                  <div className="text-5xl font-bold text-white mb-3">
                    {currentRound.group_a_score}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {groupAPlayers.map(p => (
                      <div key={p.id} className="flex justify-between text-xs text-white/70 px-2">
                        <span className="truncate">{p.player_name}</span>
                        <span className="text-blue-300">{p.current_round_score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-red-500/20 rounded-xl p-4 border border-red-500/30">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-300 mb-2">
                    Group {currentRound.group_b_letter}
                  </div>
                  <div className="text-5xl font-bold text-white mb-3">
                    {currentRound.group_b_score}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {groupBPlayers.map(p => (
                      <div key={p.id} className="flex justify-between text-xs text-white/70 px-2">
                        <span className="truncate">{p.player_name}</span>
                        <span className="text-red-300">{p.current_round_score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final Round - Individual Scores */}
        {competition.current_round === 4 && competition.status !== 'completed' && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
              <Star className="w-5 h-5 text-christmasGold" />
              Final Round - Top 3
            </h3>
            <div className="space-y-3">
              {sortedFinalPlayers.slice(0, 3).map((player, idx) => (
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
                  <div className="flex items-center gap-1 text-christmasGold font-bold">
                    <Zap className="w-4 h-4" />
                    {player.current_round_score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Round History */}
        {competition.competition_rounds?.filter(r => r.status === 'completed').length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Round History</h3>
            <div className="space-y-2">
              {competition.competition_rounds
                .filter(r => r.status === 'completed')
                .sort((a, b) => a.round_number - b.round_number)
                .map(round => (
                  <div key={round.id} className="bg-black/30 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-white font-medium">Round {round.round_number}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={round.winning_group === round.group_a_letter ? 'text-green-400' : 'text-red-400'}>
                        {round.group_a_letter}: {round.group_a_score}
                      </span>
                      <span className="text-white/50">vs</span>
                      <span className={round.winning_group === round.group_b_letter ? 'text-green-400' : 'text-red-400'}>
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
          <div>
            <h3 className="text-lg font-bold text-white/50 mb-4">Eliminated Players</h3>
            <div className="flex flex-wrap gap-2">
              {eliminatedPlayers.map(player => (
                <span
                  key={player.id}
                  className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs line-through"
                >
                  {player.player_name} (R{player.round_eliminated})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
