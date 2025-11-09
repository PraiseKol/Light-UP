// utils/inGame.js
import { supabase } from "@/lib/supabaseClient";

/**
 * Mark the player as "in game" for a level.
 */
export async function markInGame(userId, levelId) {
  if (!userId) return;
  const { error } = await supabase
    .from("game_users")
    .update({
      in_game: true,
      in_game_level: levelId,
      in_game_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("markInGame error:", error);
    throw error;
  }
}

/**
 * Clear the "in game" flag.
 */
export async function clearInGame(userId) {
  if (!userId) return;
  const { error } = await supabase
    .from("game_users")
    .update({
      in_game: false,
      in_game_level: null,
      in_game_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("clearInGame error:", error);
    throw error;
  }
}
