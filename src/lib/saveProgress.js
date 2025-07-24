// src/lib/saveProgress.js
import { supabase } from "./supabaseClient";

export const saveProgress = async ({ level_id, phase, mode, score }) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("No user logged in:", userError?.message);
    return { error: "Not logged in" };
  }

  const { data, error } = await supabase
    .from("progress")
    .insert([
      {
        user_id: user.id,   // ✅ Required for RLS
        level_id,
        phase,
        mode,
        score,
      },
    ])
    .select();

  if (error) {
    console.error("Error saving progress:", error.message);
  } else {
    console.log("Progress saved:", data);
  }

  return { data, error };
};
