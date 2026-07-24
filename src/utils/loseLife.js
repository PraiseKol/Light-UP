// loseLife.js
import { supabase } from "@/lib/supabaseClient";

export async function loseLife(userId, currentLives) {
  if (currentLives <= 0) return;

  // Server-authoritative: regenerates lives (30 min/life, up to 5) then
  // checks the shield and decrements — the DB is the source of truth,
  // not whatever the client last saw. See public.lose_life() in Supabase.
  const { data, error } = await supabase.rpc("lose_life", {
    p_user_id: userId,
  });

  if (error) {
    console.error("loseLife error", error);
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    lives: row.lives,
    last_life_lost_at: row.last_life_lost_at,
    shieldActive: row.shielded,
  };
}
