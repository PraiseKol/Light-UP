// loseLife.js
import { supabase } from "@/lib/supabaseClient";

export async function loseLife(userId, currentLives) {
  if (currentLives <= 0) return;

  // 🔎 First fetch latest user state (with shield info)
  const { data: user, error: fetchError } = await supabase
    .from("game_users")
    .select("lives, holy_shield_until, last_life_lost_at")
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    console.error("loseLife fetch error", fetchError);
    throw fetchError;
  }

  // 🛡️ Check if shield is active
  const shieldActive =
    user?.holy_shield_until &&
    new Date(user.holy_shield_until) > new Date();

  if (shieldActive) {
    console.log("🛡️ Shield active → no life lost");
    return { ...user, shieldActive: true }; // return current state without losing a life
  }

  // ❤️ Deduct life if no shield
  // Build update object conditionally
  const updates = {
    lives: currentLives - 1,
    updated_at: new Date().toISOString(),
  };

  // Only set last_life_lost_at if:
  // 1. It's currently NULL (no active regeneration), OR
  // 2. User is at full lives (5) and about to lose first life
  if (!user.last_life_lost_at || user.lives === 5) {
    updates.last_life_lost_at = new Date().toISOString();
  }
  // Otherwise, preserve existing last_life_lost_at timestamp

  const { data, error } = await supabase
    .from("game_users")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("loseLife error", error);
    throw error;
  }

  return data;
}
