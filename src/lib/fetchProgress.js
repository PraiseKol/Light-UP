// src/lib/fetchProgress.js
import { supabase } from "./supabaseClient";

export async function fetchProgress() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("❌ Not authenticated:", authError?.message);
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("progress")
      .select("level_id")
      .eq("user_id", user.id);

    if (error) throw error;

    const uniqueLevels = [...new Set(data.map((row) => row.level_id))];
    console.log("✅ Fetched completed levels:", uniqueLevels);
    return uniqueLevels;
  } catch (error) {
    console.error("❌ Error fetching progress:", error.message);
    return [];
  }
}
