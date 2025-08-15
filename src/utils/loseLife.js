import { supabase } from 'lib/supabaseClient';

export async function loseLife(userId, currentLives) {
  if (currentLives <= 0) return;

  const { data, error } = await supabase
    .from('game_users')
    .update({
      lives: currentLives - 1,
      last_life_lost_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single(); // ensures you get the updated row instead of an array

  if (error) {
    console.error("loseLife error", error);
    throw error;
  }

  return data; // return updated player record so caller can read new lives count
}
