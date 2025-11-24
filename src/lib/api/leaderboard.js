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
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Step 1: Get all progress data for current month
  const { data: progressData, error: progressError } = await supabase
    .from('progress')
    .select('user_id, score')
    .gte('completed_at', startOfMonth.toISOString())
    .lte('completed_at', endOfMonth.toISOString());

  if (progressError) {
    console.error("Failed to fetch monthly progress:", progressError);
    return [];
  }

  if (!progressData || progressData.length === 0) {
    console.log("No progress data for current month");
    return [];
  }

  // Step 2: Aggregate scores by user_id
  const aggregated = progressData.reduce((acc, record) => {
    if (!acc[record.user_id]) {
      acc[record.user_id] = { user_id: record.user_id, total_score: 0 };
    }
    acc[record.user_id].total_score += record.score || 0;
    return acc;
  }, {});

  // Step 3: Convert to array and sort to get top users
  const allUsers = Object.values(aggregated);
  console.log(`Total unique users this month: ${allUsers.length}`);
  
  const topUsers = allUsers
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 10);

  console.log(`Top ${topUsers.length} users for monthly leaderboard:`, topUsers);

  if (topUsers.length === 0) return [];

  // Step 4: Fetch player names for top users
  const userIds = topUsers.map(u => u.user_id);
  const { data: userData, error: userError } = await supabase
    .from('game_users')
    .select('user_id, player_name')
    .in('user_id', userIds);

  if (userError) {
    console.error("Failed to fetch user names:", userError);
  }

  // Step 5: Merge data
  const userMap = {};
  userData?.forEach(u => { userMap[u.user_id] = u.player_name; });

  const result = topUsers.map(u => ({
    user_id: u.user_id,
    total_score: u.total_score,
    player_name: userMap[u.user_id] || 'Anonymous'
  }));

  console.log('Final monthly leaderboard result:', result);
  return result;
}
