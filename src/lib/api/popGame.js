import { supabase } from '../supabaseClient';

// Get pop game visibility setting (independent of session)
export const getPopGameActive = async () => {
  const { data, error } = await supabase
    .from('mini_game_settings')
    .select('is_active')
    .eq('game_key', 'pop_game')
    .maybeSingle();
  
  if (error) return false;
  return data?.is_active ?? false;
};

// Set pop game visibility (admin only)
export const setPopGameActive = async (isActive, userId) => {
  const { error } = await supabase
    .from('mini_game_settings')
    .upsert({
      game_key: 'pop_game',
      is_active: isActive,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'game_key' });
  
  return !error;
};

// Get player's top 3 best scores (permanent)
export const getPlayerBestScores = async (userId) => {
  const { data, error } = await supabase
    .from('pop_game_best_scores')
    .select('*')
    .eq('user_id', userId)
    .order('rank');
  
  if (error) return [];
  return data || [];
};

// Update player's best scores if new score makes top 3
export const updatePlayerBestScores = async (userId, newScore) => {
  // Get current best scores
  const currentBest = await getPlayerBestScores(userId);
  
  // Build list of all scores and sort
  const allScores = [...currentBest.map(s => s.score), newScore];
  const topThree = [...new Set(allScores)].sort((a, b) => b - a).slice(0, 3);
  
  // If new score doesn't make top 3, skip
  if (!topThree.includes(newScore)) return false;
  
  // Upsert top 3 scores
  for (let i = 0; i < topThree.length; i++) {
    const existingEntry = currentBest.find(s => s.score === topThree[i]);
    await supabase
      .from('pop_game_best_scores')
      .upsert({
        user_id: userId,
        score: topThree[i],
        rank: i + 1,
        achieved_at: topThree[i] === newScore ? new Date().toISOString() : 
          existingEntry?.achieved_at || new Date().toISOString()
      }, { onConflict: 'user_id,rank' });
  }
  
  return true;
};

// Get active pop game session (for competition mode - legacy)
export const getActivePopGameSession = async () => {
  const { data, error } = await supabase
    .from('pop_game_sessions')
    .select('*')
    .eq('status', 'active')
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

// Get player's attempts for current session (competition mode)
export const getPlayerAttempts = async (sessionId, userId) => {
  const { data, error } = await supabase
    .from('pop_game_scores')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('attempt_number', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

// Record a score (competition mode)
export const recordPopGameScore = async (sessionId, userId, playerName, attemptNumber, score) => {
  const { data, error } = await supabase
    .from('pop_game_scores')
    .insert({
      session_id: sessionId,
      user_id: userId,
      player_name: playerName,
      attempt_number: attemptNumber,
      score: score
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Get all scores for a session (admin)
export const getAllSessionScores = async (sessionId) => {
  const { data, error } = await supabase
    .from('pop_game_scores')
    .select('*')
    .eq('session_id', sessionId)
    .order('score', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Start pop game session (admin) with configurable max attempts
export const startPopGameSession = async (adminId, maxAttempts = 3) => {
  // First deactivate any existing active sessions
  await supabase
    .from('pop_game_sessions')
    .update({ status: 'inactive', ended_at: new Date().toISOString() })
    .eq('status', 'active');

  const { data, error } = await supabase
    .from('pop_game_sessions')
    .insert({
      status: 'active',
      started_at: new Date().toISOString(),
      created_by: adminId,
      max_attempts: maxAttempts
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// End pop game session (admin)
export const endPopGameSession = async (sessionId) => {
  const { data, error } = await supabase
    .from('pop_game_sessions')
    .update({ 
      status: 'inactive', 
      ended_at: new Date().toISOString() 
    })
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Get aggregated scores with best score per player
export const getAggregatedScores = async (sessionId) => {
  const { data, error } = await supabase
    .from('pop_game_scores')
    .select('*')
    .eq('session_id', sessionId)
    .order('user_id')
    .order('attempt_number');
  
  if (error) throw error;
  
  // Aggregate by player
  const playerScores = {};
  (data || []).forEach(score => {
    if (!playerScores[score.user_id]) {
      playerScores[score.user_id] = {
        user_id: score.user_id,
        player_name: score.player_name,
        attempts: {},
        best_score: 0
      };
    }
    playerScores[score.user_id].attempts[score.attempt_number] = score.score;
    if (score.score > playerScores[score.user_id].best_score) {
      playerScores[score.user_id].best_score = score.score;
    }
  });
  
  // Convert to array and sort by best score
  return Object.values(playerScores).sort((a, b) => b.best_score - a.best_score);
};
