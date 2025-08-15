// utils/talentUtils.js
import { supabase } from "lib/supabaseClient";

// Base URL for payment-backend API
const PAYMENT_BACKEND_URL =
  process.env.NEXT_PUBLIC_PAYMENT_BACKEND_URL || "http://localhost:3000";

/**
 * Adjust talents by amount (+ or -) via payment-backend API
 * @param {string} userId - The user's ID (must match game_users.user_id)
 * @param {number} amount - Number of talents to adjust (positive or negative)
 * @param {string} [transactionId] - Optional unique transaction ID (if not provided, auto-generated)
 */
export async function adjustTalents(userId, amount, transactionId) {
  try {
    if (!userId || typeof amount !== "number") {
      console.error("❌ adjustTalents: Missing or invalid parameters", { userId, amount, transactionId });
      throw new Error("Missing or invalid parameters for adjustTalents");
    }

    // Auto-generate a transactionId if not passed in
    const txId = transactionId || `${userId}-${Date.now()}-${amount}`;

    console.log("📤 Sending adjustTalents request:", { userId, amount, transactionId: txId });

    const res = await fetch(`${PAYMENT_BACKEND_URL}/api/adjust-talents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount, transactionId: txId }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ API returned error:", data);
      throw new Error(data.error || `API error: ${res.status}`);
    }

    console.log("✅ Talents adjusted successfully. New balance:", data.newBalance);
    return data.newBalance; // The backend returns updated balance
  } catch (err) {
    console.error("❌ Error adjusting talents:", err);
    return null;
  }
}

// Keep the power-up logic as is (still uses Supabase directly)
export async function adjustPowerupInventory(userId, powerupName, amount) {
  const { data, error } = await supabase.rpc("adjust_powerup_inventory", {
    p_user_id: userId,
    p_powerup: powerupName,
    p_amount: amount,
  });

  if (error) {
    console.error("❌ Error adjusting power-up inventory:", error);
    return null;
  }
  return data; // Returns updated inventory JSON
}

// Award talents based on bonus type
export async function awardBonus(userId, bonusType) {
  const bonusRewards = {
    accuracy: 2,
    perfect_level: 5,
    phase_completion: 3,
    daily_day3: 1,
    daily_day5: 2,
    daily_day7plus: 2,
  };

  const reward = bonusRewards[bonusType] || 0;
  if (reward > 0) {
    return adjustTalents(userId, reward);
  }
  return null;
}
