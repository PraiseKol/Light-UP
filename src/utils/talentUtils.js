// utils/talentUtils.js
import { supabase } from "lib/supabaseClient";

// Adjust talents by amount (+ or -)
export async function adjustTalents(userId, amount) {
  const { data, error } = await supabase.rpc("adjust_talents", {
    p_user_id: userId,
    p_amount: amount
  });

  if (error) {
    console.error("❌ Error adjusting talents:", error);
    return null;
  }
  return data; // returns new talent balance
}

// Adjust a specific power-up count
export async function adjustPowerupInventory(userId, powerupName, amount) {
  const { data, error } = await supabase.rpc("adjust_powerup_inventory", {
    p_user_id: userId,
    p_powerup: powerupName,
    p_amount: amount
  });

  if (error) {
    console.error("❌ Error adjusting power-up inventory:", error);
    return null;
  }
  return data; // returns updated inventory JSON
}

// Award talents based on bonus type
export async function awardBonus(userId, bonusType) {
  const bonusRewards = {
    accuracy: 2,        // 5 in a row, all under 5s
    perfect_level: 5,   // all correct on first try
    phase_completion: 3, // finish all 10 levels
    daily_day3: 1,
    daily_day5: 2,
    daily_day7plus: 2
  };

  const reward = bonusRewards[bonusType] || 0;
  if (reward > 0) {
    return adjustTalents(userId, reward);
  }
  return null;
}
