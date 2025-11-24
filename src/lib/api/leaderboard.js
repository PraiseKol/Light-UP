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

export async function fetchMonthlyLeaderboard() {
  // Get start and end of current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const { data, error } = await supabase
    .from('progress')
    .select('user_id, score, game_users!inner(player_name)')
    .gte('completed_at', startOfMonth.toISOString())
    .lte('completed_at', endOfMonth.toISOString());

  if (error) {
    console.error("Failed to fetch monthly leaderboard:", error);
    return [];
  }

  // Aggregate scores by user_id
  const aggregated = data.reduce((acc, record) => {
    const userId = record.user_id;
    const playerName = record.game_users?.player_name || 'Anonymous';
    
    if (!acc[userId]) {
      acc[userId] = { 
        user_id: userId, 
        player_name: playerName, 
        total_score: 0 
      };
    }
    acc[userId].total_score += record.score || 0;
    return acc;
  }, {});

  // Convert to array, sort, and get top 10
  const monthlyLeaderboard = Object.values(aggregated)
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 10);

  return monthlyLeaderboard;
}
