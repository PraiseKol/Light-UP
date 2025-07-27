import { supabase } from 'lib/supabaseClient';

export async function loseLife(userId, currentLives) {
  if (currentLives <= 0) return;

  await supabase
    .from('game_users')
    .update({
      lives: currentLives - 1,
      last_life_lost_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}
