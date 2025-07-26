import { supabase } from "./supabaseClient";

export async function fetchTotalScore(userId) {
  const { data, error } = await supabase
    .from("progress")
    .select("score")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching total score:", error.message);
    return 0;
  }

  const totalScore = data?.reduce((acc, row) => acc + (row.score || 0), 0);
  return totalScore || 0;
}
