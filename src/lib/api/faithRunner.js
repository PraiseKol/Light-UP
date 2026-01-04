import { supabase } from "@/lib/supabaseClient";

/**
 * Get or create user stats for Faith Runner
 */
export const getOrCreateStats = async (userId) => {
  const { data, error } = await supabase
    .rpc('get_or_create_faith_runner_stats', { p_user_id: userId });
  
  if (error) throw error;
  return data;
};

/**
 * Save a run and update stats
 */
export const saveRun = async (userId, runData) => {
  const { data, error } = await supabase.rpc('save_faith_runner_run', {
    p_user_id: userId,
    p_distance: runData.distance,
    p_scrolls: runData.scrolls,
    p_light_orbs: runData.lightOrbs || 0,
    p_obstacles_avoided: runData.obstaclesAvoided || 0,
    p_power_ups_used: runData.powerUpsUsed || 0,
    p_environment: runData.environment || 'desert_path'
  });
  
  if (error) throw error;
  return data;
};

/**
 * Get user's run history
 */
export const getRunHistory = async (userId, limit = 10) => {
  const { data, error } = await supabase
    .from('faith_runner_runs')
    .select('*')
    .eq('user_id', userId)
    .order('ended_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
};

/**
 * Get leaderboard (top runs by distance)
 */
export const getLeaderboard = async (limit = 20) => {
  const { data, error } = await supabase
    .from('faith_runner_runs')
    .select(`
      id,
      distance,
      scrolls_collected,
      user_id,
      ended_at,
      environment
    `)
    .order('distance', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
};

/**
 * Update user's selected character
 */
export const updateSelectedCharacter = async (userId, character) => {
  const { data, error } = await supabase
    .from('faith_runner_stats')
    .update({ selected_character: character, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Unlock a character
 */
export const unlockCharacter = async (userId, character, cost) => {
  // First deduct scrolls from stats
  const { data: stats, error: statsError } = await supabase
    .from('faith_runner_stats')
    .select('total_scrolls, unlocked_characters')
    .eq('user_id', userId)
    .single();
  
  if (statsError) throw statsError;
  if (stats.total_scrolls < cost) throw new Error('Not enough scrolls');
  if (stats.unlocked_characters.includes(character)) throw new Error('Already unlocked');
  
  const { data, error } = await supabase
    .from('faith_runner_stats')
    .update({
      total_scrolls: stats.total_scrolls - cost,
      unlocked_characters: [...stats.unlocked_characters, character],
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Upgrade a power-up
 */
export const upgradePowerUp = async (userId, powerUpKey, cost) => {
  const { data: stats, error: statsError } = await supabase
    .from('faith_runner_stats')
    .select('total_scrolls, power_up_levels')
    .eq('user_id', userId)
    .single();
  
  if (statsError) throw statsError;
  if (stats.total_scrolls < cost) throw new Error('Not enough scrolls');
  
  const currentLevel = stats.power_up_levels[powerUpKey] || 1;
  if (currentLevel >= 5) throw new Error('Already max level');
  
  const newLevels = { ...stats.power_up_levels, [powerUpKey]: currentLevel + 1 };
  
  const { data, error } = await supabase
    .from('faith_runner_stats')
    .update({
      total_scrolls: stats.total_scrolls - cost,
      power_up_levels: newLevels,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
