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

  const user_id = user.id;

  try {
    // Step 1: Check if a record already exists
    const { data: existingProgress, error: fetchError } = await supabase
      .from("progress")
      .select("id, score")
      .eq("user_id", user_id)
      .eq("level_id", level_id)
      .single();

    // Step 2: If record exists
    if (existingProgress) {
      if (score > existingProgress.score) {
        // Update with the new higher score
        const { error: updateError } = await supabase
          .from("progress")
          .update({ score })
          .eq("id", existingProgress.id);

        if (updateError) {
          console.error("Error updating progress:", updateError.message);
          return { error: updateError.message };
        }

        console.log("Score updated: new high score");
        return { data: { updated: true, newScore: score }, error: null };
      } else {
        console.log("Existing score is higher or equal. No update made.");
        return { data: { updated: false, reason: "lower_score" }, error: null };
      }
    }

    // Step 3: If no record exists, insert new
    const { data: insertData, error: insertError } = await supabase
      .from("progress")
      .insert([
        {
          user_id,
          level_id,
          phase,
          mode,
          score,
        },
      ])
      .select();

    if (insertError) {
      console.error("Error inserting new progress:", insertError.message);
      return { error: insertError.message };
    }

    console.log("Progress inserted:", insertData);
    return { data: insertData, error: null };
  } catch (err) {
    console.error("Unexpected error in saveProgress:", err.message);
    return { error: err.message };
  }
};
