// src/lib/fetchProgress.js
import { supabase } from "./supabaseClient";

export async function fetchProgress(userId) {
  try {
    const { data, error } = await supabase
      .from("progress")
      .select("level_id")
      .eq("user_id", userId);

    if (error) throw error;

    // Remove duplicate level_ids
    const uniqueLevels = [...new Set(data.map((row) => row.level_id))];

    console.log("✅ Fetched completed levels:", uniqueLevels);
    return uniqueLevels;
  } catch (error) {
    console.error("❌ Error fetching progress:", error.message);
    return [];
  }
}
