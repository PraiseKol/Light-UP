import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  fetchMonthlyTopPlayers, 
  createCompetition, 
  getActiveCompetition,
  startRound,
  endRound,
  completeCompetition,
  searchPlayers
} from '@/lib/api/competition';
import { Trophy, Users, Play, Search, Plus, X, Crown, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CompetitionManager() {
  const [activeCompetition, setActiveCompetition] = useState(null);
  const [monthlyTopPlayers, setMonthlyTopPlayers] = useState([]);
  const [manualPlayers, setManualPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [roundTimeLeft, setRoundTimeLeft] = useState(null);

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
      const topPlayers = await fetchMonthlyTopPlayers(19);
      setMonthlyTopPlayers(topPlayers);
    }
    setLoading(false);
  }

  async function handleSearch() {
    if (searchTerm.length < 2) return;
    const results = await searchPlayers(searchTerm);
    // Filter out already selected players
    const selectedIds = [...monthlyTopPlayers, ...manualPlayers].map(p => p.user_id);
    setSearchResults(results.filter(p => !selectedIds.includes(p.user_id)));
  }

  function addManualPlayer(player) {
    if (manualPlayers.length >= 5) {
      toast.error('Maximum 5 manual players allowed');
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
    if (monthlyTopPlayers.length + manualPlayers.length !== 24) {
      toast.error(`Need exactly 24 players. Currently have ${monthlyTopPlayers.length + manualPlayers.length}`);
      return;
    }

    const allPlayers = [...monthlyTopPlayers, ...manualPlayers];
    const competition = await createCompetition(allPlayers);
    
    if (competition) {
      toast.success('Competition created! Ready to start.');
      loadData();
    } else {
      toast.error('Failed to create competition');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-christmasGold border-t-transparent rounded-full" />
      </div>
    );
  }

  // Active competition view
  if (activeCompetition) {
    const currentRound = activeCompetition.competition_rounds?.find(
      r => r.round_number === activeCompetition.current_round
    );

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-christmasGreen/20 to-christmasRed/20 rounded-xl p-6 border border-christmasGold/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-christmasGold flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Active Competition
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeCompetition.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-300' :
              activeCompetition.status === 'completed' ? 'bg-green-500/20 text-green-300' :
              'bg-blue-500/20 text-blue-300'
            }`}>
              {activeCompetition.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {countdown !== null && (
            <div className="text-center py-8">
              <div className="text-6xl font-bold text-christmasGold animate-pulse">
                {countdown}
              </div>
              <p className="text-white/70 mt-2">Starting in...</p>
            </div>
          )}

          {activeCompetition.status === 'waiting' && countdown === null && (
            <button
              onClick={handleStartCompetition}
              className="w-full py-4 bg-gradient-to-r from-christmasGreen to-green-600 text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
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
                    <Clock className="w-6 h-6 text-christmasGold" />
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
                    className="flex-1 py-3 bg-gradient-to-r from-christmasGreen to-green-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
                  >
                    Start Round {activeCompetition.current_round + 1}
                  </button>
                )}
                {activeCompetition.current_round === 4 && roundTimeLeft === 0 && (
                  <button
                    onClick={handleCompleteCompetition}
                    className="flex-1 py-3 bg-gradient-to-r from-christmasGold to-yellow-500 text-black font-bold rounded-xl hover:scale-105 transition-transform"
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
                        : 'bg-christmasGold/20 text-christmasGold'
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
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-christmasGreen/20 to-christmasRed/20 rounded-xl p-6 border border-christmasGold/30">
        <h2 className="text-xl font-bold text-christmasGold flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6" />
          Create New Competition
        </h2>

        {/* Monthly Top 19 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Crown className="w-5 h-5 text-christmasGold" />
            Monthly Top 19 (Auto-qualified)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {monthlyTopPlayers.map((player, idx) => (
              <div
                key={player.user_id}
                className="bg-christmasGold/20 p-2 rounded-lg text-xs border border-christmasGold/30"
              >
                <div className="flex items-center gap-1">
                  <span className="font-bold text-christmasGold">#{idx + 1}</span>
                  <span className="text-white truncate">{player.player_name}</span>
                </div>
                <div className="text-[10px] text-white/60">Score: {player.score}</div>
              </div>
            ))}
            {monthlyTopPlayers.length < 19 && (
              <div className="col-span-full text-center text-yellow-300 text-sm py-2">
                Only {monthlyTopPlayers.length} players qualified this month
              </div>
            )}
          </div>
        </div>

        {/* Manual Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Plus className="w-5 h-5 text-christmasGreen" />
            Manual Selection ({manualPlayers.length}/5)
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
                className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-christmasGold"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-christmasGreen text-white rounded-lg hover:bg-green-600 transition-colors"
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
                  <Plus className="w-4 h-4 text-christmasGreen" />
                </button>
              ))}
            </div>
          )}

          {/* Selected Manual Players */}
          <div className="flex flex-wrap gap-2">
            {manualPlayers.map(player => (
              <div
                key={player.user_id}
                className="bg-christmasGreen/20 px-3 py-1 rounded-full text-sm text-white flex items-center gap-2 border border-christmasGreen/30"
              >
                {player.player_name}
                <button onClick={() => removeManualPlayer(player.user_id)}>
                  <X className="w-4 h-4 text-red-400 hover:text-red-300" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <div className="flex items-center justify-between">
          <div className="text-white/70 text-sm">
            Total: {monthlyTopPlayers.length + manualPlayers.length}/24 players
          </div>
          <button
            onClick={handleCreateCompetition}
            disabled={monthlyTopPlayers.length + manualPlayers.length !== 24}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              monthlyTopPlayers.length + manualPlayers.length === 24
                ? 'bg-gradient-to-r from-christmasGold to-yellow-500 text-black hover:scale-105'
                : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Trophy className="w-5 h-5" />
            Create Competition
          </button>
        </div>
      </div>
    </div>
  );
}
