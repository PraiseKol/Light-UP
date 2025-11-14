import { supabase } from "@/lib/supabaseClient";

export const fetchLeaderboard = async () => {
  const { data, error } = await supabase
    .from("weekly_leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Failed to fetch weekly leaderboard:", error);
    return [];
  }

  console.log("📊 Weekly leaderboard fetched:", {
    count: data?.length || 0,
    isActive: data?.[0]?.is_active,
    weekStartDate: data?.[0]?.week_start_date
  });

  return data;
};
