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
import {
  startPopGameSession,
  endPopGameSession,
  getActivePopGameSession,
  getAggregatedScores,
  getPopGameActive,
  setPopGameActive
} from '@/lib/api/popGame';
import { getScriptureMatchActive, setScriptureMatchActive } from '@/lib/api/scriptureMatch';
import { Trophy, Users, Play, Search, Plus, X, Crown, Clock, CheckCircle, Gamepad2, Puzzle } from 'lucide-react';
import { toast } from 'sonner';
import Switch from '@/components/ui/Switch';

export default function CompetitionManager() {
  const [activeCompetition, setActiveCompetition] = useState(null);
  const [monthlyTopPlayers, setMonthlyTopPlayers] = useState([]);
  const [manualPlayers, setManualPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [roundTimeLeft, setRoundTimeLeft] = useState(null);
  
  // Pop Game state
  const [popGameSession, setPopGameSession] = useState(null);
  const [popGameScores, setPopGameScores] = useState([]);
  const [selectedPopGamePlayers, setSelectedPopGamePlayers] = useState([]);
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
      const topPlayers = await fetchMonthlyTopPlayers(19);
      setMonthlyTopPlayers(topPlayers);
    }
    
    // Load pop game session
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

  // Pop Game Functions
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

  function togglePopGamePlayerSelection(userId) {
    setSelectedPopGamePlayers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : prev.length < 5 ? [...prev, userId] : prev
    );
  }

  function addPopGamePlayersToCompetition() {
    const playersToAdd = popGameScores
      .filter(p => selectedPopGamePlayers.includes(p.user_id))
      .map(p => ({
        user_id: p.user_id,
        player_name: p.player_name,
        selection_type: 'pop_game'
      }));
    
    setManualPlayers(prev => [...prev, ...playersToAdd]);
    setSelectedPopGamePlayers([]);
    toast.success(`Added ${playersToAdd.length} players from Pop Game`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-christmasGold border-t-transparent rounded-full" />
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
      <ScriptureMatchToggle />
      <PopGameToggle />

      {/* Pop Game Qualification Section */}
      <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl p-6 border border-red-500/30">
        <h2 className="text-xl font-bold text-red-400 flex items-center gap-2 mb-4">
          <Gamepad2 className="w-6 h-6" />
          Qualification Mini-Game (Pop Game)
        </h2>

        {!popGameSession ? (
          <div className="text-center py-4">
            <p className="text-white/70 mb-4">
              Start the Pop Game to let players compete for the remaining 5 spots
            </p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <label className="text-white/70">Max Attempts:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={popGameMaxAttempts}
                onChange={(e) => setPopGameMaxAttempts(Math.min(10, Math.max(1, parseInt(e.target.value) || 3)))}
                className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center"
              />
            </div>
            <button
              onClick={handleStartPopGame}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
            >
              <Play className="w-5 h-5" />
              Start Pop Game ({popGameMaxAttempts} attempts)
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-green-400 font-medium flex items-center gap-2">
                <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                Pop Game Active ({popGameScores.length} players have played)
              </span>
              <button
                onClick={handleEndPopGame}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                End Pop Game
              </button>
            </div>

            {popGameScores.length > 0 && (
              <div className="bg-black/30 rounded-lg p-3 max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-white/60 border-b border-white/10">
                    <tr>
                      <th className="text-left py-2 px-2">Select</th>
                      <th className="text-left py-2 px-2">Player</th>
                      <th className="text-center py-2 px-2">Att 1</th>
                      <th className="text-center py-2 px-2">Att 2</th>
                      <th className="text-center py-2 px-2">Att 3</th>
                      <th className="text-center py-2 px-2 text-christmasGold">Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popGameScores.map(player => (
                      <tr key={player.user_id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 px-2">
                          <input
                            type="checkbox"
                            checked={selectedPopGamePlayers.includes(player.user_id)}
                            onChange={() => togglePopGamePlayerSelection(player.user_id)}
                            disabled={!selectedPopGamePlayers.includes(player.user_id) && selectedPopGamePlayers.length >= 5}
                            className="w-4 h-4 rounded"
                          />
                        </td>
                        <td className="py-2 px-2 text-white">{player.player_name}</td>
                        <td className="py-2 px-2 text-center text-white/70">{player.attempts[1] ?? '-'}</td>
                        <td className="py-2 px-2 text-center text-white/70">{player.attempts[2] ?? '-'}</td>
                        <td className="py-2 px-2 text-center text-white/70">{player.attempts[3] ?? '-'}</td>
                        <td className="py-2 px-2 text-center font-bold text-christmasGold">{player.best_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-white/70">
                Selected: {selectedPopGamePlayers.length}/5
              </span>
              <button
                onClick={addPopGamePlayersToCompetition}
                disabled={selectedPopGamePlayers.length === 0}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPopGamePlayers.length > 0
                    ? 'bg-christmasGreen text-white hover:bg-green-600'
                    : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                }`}
              >
                Add Selected to Competition
              </button>
            </div>
          </div>
        )}
      </div>

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
