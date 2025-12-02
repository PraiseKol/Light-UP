import { supabase } from "@/lib/supabaseClient";

export const fetchLeaderboard = async (userId = null) => {
  // Fetch top 10
  const { data: topPlayers, error } = await supabase
    .from("weekly_leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Failed to fetch weekly leaderboard:", error);
    return { topPlayers: [], currentUserRank: null };
  }

  console.log("📊 Weekly leaderboard fetched:", {
    count: topPlayers?.length || 0,
    isActive: topPlayers?.[0]?.is_active,
    weekStartDate: topPlayers?.[0]?.week_start_date,
  });

  // Check if user is in top 10
  if (!userId || topPlayers.some(p => p.user_id === userId)) {
    return { topPlayers, currentUserRank: null };
  }

  // Get user's score and details
  const { data: userData, error: userError } = await supabase
    .from("weekly_leaderboard")
    .select("user_id, player_name, score")
    .eq("user_id", userId)
    .single();

  if (userError || !userData) {
    return { topPlayers, currentUserRank: null };
  }

  // Calculate rank by counting users with higher scores
  const { count, error: countError } = await supabase
    .from("weekly_leaderboard")
    .select("*", { count: 'exact', head: true })
    .gt("score", userData.score);

  if (countError) {
    return { topPlayers, currentUserRank: null };
  }

  return {
    topPlayers,
    currentUserRank: {
      rank: (count || 0) + 1,
      player_name: userData.player_name,
      score: userData.score,
    },
  };
};
