import { supabase } from '@/lib/supabaseClient';

// Get or create player stats
export async function getOrCreateStats(userId) {
  const { data, error } = await supabase
    .from('scripture_match_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No record exists, create one
    const { data: newData, error: insertError } = await supabase
      .from('scripture_match_stats')
      .insert({ user_id: userId })
      .select()
      .single();

    if (insertError) throw insertError;
    return newData;
  }

  if (error) throw error;
  return data;
}

// Update player stats
export async function updateStats(userId, updates) {
  const { data, error } = await supabase
    .from('scripture_match_stats')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Save game result
export async function saveGame(userId, gameData) {
  const { level, moves, timeMs, score, matchType } = gameData;

  // Insert game record
  const { error: gameError } = await supabase
    .from('scripture_match_games')
    .insert({
      user_id: userId,
      level,
      moves,
      time_ms: timeMs,
      score,
      match_type: matchType
    });

  if (gameError) throw gameError;

  // Update stats
  const { data: currentStats } = await supabase
    .from('scripture_match_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (currentStats) {
    const updates = {
      total_games: (currentStats.total_games || 0) + 1,
      total_matches: (currentStats.total_matches || 0) + gameData.totalMatches,
      high_score: Math.max(currentStats.high_score || 0, score),
      current_level: Math.max(currentStats.current_level || 1, level),
      unlocked_levels: Math.max(currentStats.unlocked_levels || 1, level + 1)
    };

    // Check for fastest completion
    if (!currentStats.fastest_completion_ms || timeMs < currentStats.fastest_completion_ms) {
      updates.fastest_completion_ms = timeMs;
    }

    return updateStats(userId, updates);
  }

  return currentStats;
}

// Get Scripture Match visibility setting
export async function getScriptureMatchActive() {
  const { data, error } = await supabase
    .from('mini_game_settings')
    .select('is_active')
    .eq('game_key', 'scripture_match')
    .single();

  if (error) {
    console.error('Error fetching scripture match settings:', error);
    return false;
  }

  return data?.is_active ?? false;
}

// Set Scripture Match visibility (admin only)
export async function setScriptureMatchActive(isActive, userId) {
  const { error } = await supabase
    .from('mini_game_settings')
    .upsert({
      game_key: 'scripture_match',
      is_active: isActive,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'game_key' });

  if (error) {
    console.error('Error updating scripture match settings:', error);
    return false;
  }

  return true;
}

// Get leaderboard
export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from('scripture_match_stats')
    .select('user_id, high_score, total_games')
    .order('high_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return data;
}
