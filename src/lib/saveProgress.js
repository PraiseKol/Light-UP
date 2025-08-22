// src/lib/saveProgress.js
import { supabase } from "./supabaseClient";
import {
  addLevelToProgressCache,
  invalidateProgressCache,
} from "./fetchProgress";
import { invalidateScoreCache } from "./fetchTotalScore";

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
    // 1) Try to find existing row (no throw if empty)
    const { data: existing, error: fetchError } = await supabase
      .from("progress")
      .select("id, score")
      .eq("user_id", user_id)
      .eq("level_id", level_id)
      .maybeSingle();

    if (fetchError && fetchError.code && fetchError.code !== "PGRST116") {
      // ignore "no rows" noise; anything else we log
      console.error("Error reading progress:", fetchError.message);
    }

    // 2) If exists, only update when new score is higher
    if (existing) {
      if ((existing.score ?? 0) < score) {
        const { data: updated, error: updateError } = await supabase
          .from("progress")
          .update({ score })
          .eq("id", existing.id)
          .select();

        if (updateError) {
          console.error("Error updating progress:", updateError.message);
          return { error: updateError.message };
        }

        // Optimistic cache updates
        addLevelToProgressCache(user_id, level_id);
        invalidateScoreCache(user_id);

        return { data: { updated: true, newScore: score, row: updated?.[0] }, error: null };
      }

      return { data: { updated: false, reason: "lower_or_equal" }, error: null };
    }

    // 3) Not exists: insert new row (use upsert to avoid duplicate key errors)
    const { data: inserted, error: insertError } = await supabase
      .from("progress")
      .upsert(
        [{ user_id, level_id, phase, mode, score }],
        { onConflict: ["user_id", "level_id"] }
      )
      .select();

    if (insertError) {
      console.error("Error inserting new progress:", insertError.message);
      return { error: insertError.message };
    }

    // Optimistic cache updates
    addLevelToProgressCache(user_id, level_id);
    invalidateScoreCache(user_id);

    return { data: inserted?.[0] ?? null, error: null };
  } catch (err) {
    console.error("Unexpected error in saveProgress:", err.message);
    // If something weird happened, clear caches so next fetch is fresh
    invalidateProgressCache(user_id);
    invalidateScoreCache(user_id);
    return { error: err.message };
  }
};
