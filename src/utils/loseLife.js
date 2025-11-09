// loseLife.js
import { supabase } from "@/lib/supabaseClient";

export async function loseLife(userId, currentLives) {
  if (currentLives <= 0) return;

  // 🔎 First fetch latest user state (with shield info)
  const { data: user, error: fetchError } = await supabase
    .from("game_users")
    .select("lives, holy_shield_until")
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
  const { data, error } = await supabase
    .from("game_users")
    .update({
      lives: currentLives - 1,
      last_life_lost_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("loseLife error", error);
    throw error;
  }

  return data;
}
