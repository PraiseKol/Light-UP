import { supabase } from '../supabaseClient';

// Get active pop game session
export const getActivePopGameSession = async () => {
  const { data, error } = await supabase
    .from('pop_game_sessions')
    .select('*')
    .eq('status', 'active')
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

// Get player's attempts for current session
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

// Record a score
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

// Start pop game session (admin)
export const startPopGameSession = async (adminId) => {
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
      created_by: adminId
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
