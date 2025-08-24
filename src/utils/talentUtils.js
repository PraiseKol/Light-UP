// utils/talentUtils.js
import { supabase } from "lib/supabaseClient";

// Use the public env variable or fallback to localhost
const PAYMENT_BACKEND_URL =
  process.env.NEXT_PUBLIC_PAYMENT_BACKEND_URL || "http://localhost:3000";

/**
 * Adjust talents by amount (+ or -) via payment-backend API
 */
export async function adjustTalents(
  userId,
  amount,
  transactionId,
  bonusType,
  referenceId
) {
  if (!userId || typeof amount !== "number") {
    console.error("❌ adjustTalents: Missing or invalid params", {
      userId,
      amount,
      transactionId,
    });
    return null;
  }

  const txId = transactionId || `${userId}-${Date.now()}-${amount}`;

  try {
    const res = await fetch(`${PAYMENT_BACKEND_URL}/api/adjust-talents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        amount,
        transactionId: txId,
        bonusType,
        referenceId,
      }),
    });

    // safe JSON parsing
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      console.error("❌ API returned error:", data);
      return null;
    }

    console.log("✅ Talents adjusted successfully. New balance:", data?.newBalance);
    return data?.newBalance ?? null;
  } catch (err) {
    console.error("❌ Error adjusting talents:", err);
    return null;
  }
}

/**
 * Adjust power-up inventory via Supabase RPC
 */
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
  return data;
}

/**
 * Award talents for a specific bonus type
 */
export async function awardBonus(userId, bonusType, referenceId = "global") {
  const bonusRewards = {
    accuracy: 2,
    perfect_phase: 10,
    phase_completion: 3,
    daily_day3: 1,
    daily_day5: 2,
    daily_day7plus: 3,
  };

  const reward = bonusRewards[bonusType] || 0;
  if (reward > 0) {
    return adjustTalents(userId, reward, undefined, bonusType, referenceId);
  }
  return null;
}

/**
 * Claim daily streak bonus via dedicated API
 */
export async function claimDailyStreakBonus(userId) {
  if (!userId) return null;

  try {
    const res = await fetch(`${PAYMENT_BACKEND_URL}/api/daily-streak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    // safe JSON parsing
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      console.error("❌ Daily streak API error:", data);
      return null;
    }

    const bonusApplied = data?.bonusApplied || "none";
    const bonusAmount = data?.bonusAmount || 0;

    console.log(
      "📅 Daily streak bonus:",
      bonusApplied,
      "→",
      bonusAmount,
      "talents"
    );

    return { ...data, bonusApplied, bonusAmount };
  } catch (err) {
    console.error("❌ Daily streak fetch failed:", err);
    return null;
  }
}
