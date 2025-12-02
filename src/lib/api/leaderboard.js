// lib/api/leaderboard.js
import { supabase } from '@/lib/supabaseClient';

export async function fetchMainLeaderboard(userId = null) {
  // Fetch top 10
  const { data: topPlayers, error } = await supabase
    .from('main_game_leaderboard')
    .select('*')
    .order('total_score', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Failed to fetch main leaderboard:", error);
    return { topPlayers: [], currentUserRank: null };
  }

  // Check if user is in top 10
  if (!userId || topPlayers.some(p => p.user_id === userId)) {
    return { topPlayers, currentUserRank: null };
  }

  // Get user's rank and score
  const { data: userData, error: userError } = await supabase
    .from('main_game_leaderboard')
    .select('user_id, player_name, total_score')
    .eq('user_id', userId)
    .single();

  if (userError || !userData) {
    return { topPlayers, currentUserRank: null };
  }

  // Calculate rank by counting users with higher scores
  const { count, error: countError } = await supabase
    .from('main_game_leaderboard')
    .select('*', { count: 'exact', head: true })
    .gt('total_score', userData.total_score);

  if (countError) {
    return { topPlayers, currentUserRank: null };
  }

  return {
    topPlayers,
    currentUserRank: {
      rank: (count || 0) + 1,
      player_name: userData.player_name,
      total_score: userData.total_score,
    },
  };
}

export async function fetchMonthlyLeaderboard(userId = null) {
  const now = new Date();
  
  // Force UTC dates to match database timestamps
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  
  const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  console.log('📅 Monthly leaderboard date range (UTC):', {
    start: startOfMonth.toISOString(),
    end: endOfMonth.toISOString(),
    year,
    month: month + 1
  });

  // Step 1: Get all progress data for current month
  const { data: progressData, error: progressError } = await supabase
    .from('progress')
    .select('user_id, score')
    .gte('completed_at', startOfMonth.toISOString())
    .lte('completed_at', endOfMonth.toISOString());

  if (progressError) {
    console.error("Failed to fetch monthly progress:", progressError);
    return { topPlayers: [], currentUserRank: null };
  }

  if (!progressData || progressData.length === 0) {
    console.log("No progress data for current month");
    return { topPlayers: [], currentUserRank: null };
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

  if (topUsers.length === 0) return { topPlayers: [], currentUserRank: null };

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

  const topPlayers = topUsers.map(u => ({
    user_id: u.user_id,
    total_score: u.total_score,
    player_name: userMap[u.user_id] || 'Anonymous'
  }));

  console.log('Final monthly leaderboard result:', topPlayers);

  // Check if user is in top 10
  if (!userId || topPlayers.some(p => p.user_id === userId)) {
    return { topPlayers, currentUserRank: null };
  }

  // Get user's aggregated score
  const userAggregate = aggregated[userId];
  if (!userAggregate) {
    return { topPlayers, currentUserRank: null };
  }

  // Get player name
  const { data: currentUserData } = await supabase
    .from('game_users')
    .select('player_name')
    .eq('user_id', userId)
    .single();

  // Calculate rank by counting users with higher scores
  const rank = allUsers.filter(u => u.total_score > userAggregate.total_score).length + 1;

  return {
    topPlayers,
    currentUserRank: {
      rank,
      player_name: currentUserData?.player_name || 'Anonymous',
      total_score: userAggregate.total_score,
    },
  };
}
