// src/lib/saveProgress.js
import { supabase } from "./supabaseClient";

export const saveProgress = async (userId, levelId) => {
  const { data, error } = await supabase
    .from("progress")
    .insert([{ user_id: userId, level_id: levelId }])
    .select();

  if (error) {
    console.error("Error saving progress:", error.message);
  } else {
    console.log("Progress saved:", data);
  }
};
