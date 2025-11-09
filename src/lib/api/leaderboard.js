// lib/api/leaderboard.js
import { supabase } from '@/lib/supabaseClient';

export async function fetchMainLeaderboard() {
  const { data, error } = await supabase
    .from('main_game_leaderboard')
    .select('*');

  if (error) {
    console.error("Failed to fetch main leaderboard:", error);
    return [];
  }

  return data;
}
