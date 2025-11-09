import { supabase } from "@/lib/supabaseClient";

export async function startHolyShield(userId, durationMs = 5 * 60 * 1000) {
  if (!userId) return;

  const expireTime = new Date(Date.now() + durationMs).toISOString();

  const { error } = await supabase
    .from("game_users")
    .update({
      holy_shield_until: expireTime,
      powerups_inventory: supabase.rpc('decrement_powerup', {
        p_user_id: userId,
        p_powerup_key: 'holy_shield'
      })
    })
    .eq("user_id", userId);

  if (error) console.error("Failed to start Holy Shield:", error);
  return expireTime;
}
