// hooks/useGameUser.js 
import { useEffect, useState, useCallback, useRef } from 'react'; 
import { supabase } from '@/lib/supabaseClient'; 
export function useGameUser(userId) { 
  const [gameUser, setGameUser] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const intervalRef = useRef(null); 
  
  const fetchGameUser = useCallback(async () => { 
    if (!userId) { 
      setLoading(false); 
      return; 
    } 
    
    try { 
      const { data, error, status } = await supabase 
      .from('game_users') 
      .select('*') 
      .eq('user_id', userId) 
      .single(); 
      
      let userData = data; 
      
      if (error && status === 406) { 
        console.log("🆕 Creating new game_user record..."); 

        const { data: newUser, error: insertError } = await supabase 
        .from('game_users') 
        .insert({ 
          user_id: userId, 
          lives: 5, 
          last_life_lost_at: null, 
          player_name: null, 
          talents: 20, // Default starting talents 
          powerups_inventory: {}, // Default empty power-up inventory 
        }) 
        .select() 
        .single(); 
        
        if (insertError) { 
          console.error("❌ Failed to create game user:", insertError); 
          setLoading(false); 
          return; 
        } 
        
        userData = newUser; 
      } else if (error) { 
        console.error("❌ Error fetching game user:", error); 
        setLoading(false); 
        return; 
      } 
      
      // 🧠 Recalculate lives server-side — the DB is the source of truth,
      // not the client's clock. See public.regen_lives() in Supabase.
      const { data: regenData, error: regenError } = await supabase.rpc(
        'regen_lives',
        { p_user_id: userId }
      );

      if (!regenError) {
        const regenRow = Array.isArray(regenData) ? regenData[0] : regenData;
        if (regenRow) {
          userData.lives = regenRow.lives;
          userData.last_life_lost_at = regenRow.last_life_lost_at;
        }
      } else {
        console.error("❌ Failed to regen lives:", regenError);
      }

      setGameUser(userData); 
    } catch (err) { 
      console.error("‼️ Unexpected error in useGameUser:", err); 
    } finally { 
      setLoading(false); 
    } 
  }, [userId]); 
  
  // 🔃 Initial fetch 
  useEffect(() => { 
    fetchGameUser(); 
  }, [fetchGameUser]); 
  
  // ⏱️ Poll every 60 seconds to auto-refresh lives 
  useEffect(() => { 
    if (!userId) return; 
    
    intervalRef.current = setInterval(() => { 
      fetchGameUser(); 
    }, 60000); // every 60s 
    
    return () => { 
      clearInterval(intervalRef.current); 
    }; 
  }, [userId, fetchGameUser]); 
  
  // 🛠 Update game user helper (for talents, inventory, etc.) 
  const updateGameUser = async (updates) => { 
    if (!userId) return; 
    const { error } = await supabase 
    .from('game_users') 
    .update(updates) 
    .eq('user_id', userId); 
    
    if (error) { 
      console.error("❌ Failed to update game user:", error); 
    } else { 
      await fetchGameUser(); 
    } 
  }; 
  
  return { 
    gameUser, 
    loading, 
    refetch: fetchGameUser, 
    updateGameUser, // 👈 can update talents, inventory, etc. 
  };
}
