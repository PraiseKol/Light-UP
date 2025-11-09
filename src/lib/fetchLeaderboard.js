import { supabase } from "@/lib/supabaseClient";

export const fetchLeaderboard = async () => {
  const { data, error } = await supabase
    .from("weekly_leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }

  return data;
};
