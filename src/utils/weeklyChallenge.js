// utils/weeklyChallenge.js
import { supabase } from "@/lib/supabaseClient";

/**
 * Fetch the most recent week_start_date from DB.
 * Falls back to local calculation if query fails.
 */
export const getCurrentWeekStartDate = async () => {
  try {
    const { data, error } = await supabase
      .from("weekly_challenges")
      .select("week_start_date")
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("⚠️ weeklyChallenge: falling back to local week_start_date:", error);
      return fallbackWeekStartDate();
    }

    if (data?.week_start_date) {
      // Normalize to JS Date (Postgres returns ISO string in UTC)
      return new Date(data.week_start_date);
    }

    return fallbackWeekStartDate();
  } catch (err) {
    console.error("❌ weeklyChallenge: getCurrentWeekStartDate failed:", err);
    return fallbackWeekStartDate();
  }
};

/**
 * Fallback: calculate Friday 12PM in local time.
 */
const fallbackWeekStartDate = () => {
  const now = new Date();
  const day = now.getDay(); // Sunday = 0 ... Saturday = 6

  // Days since last Friday
  const daysSinceFriday = day >= 5 ? day - 5 : 7 - (5 - day);
  const friday = new Date(now);
  friday.setDate(now.getDate() - daysSinceFriday);
  friday.setHours(12, 0, 0, 0); // Friday 12:00 PM

  return friday;
};

/**
 * Compute challenge window (Fri 12PM → Mon 12:00AM).
 */
export const getCurrentChallengeWindow = async () => {
  const challengeStart = await getCurrentWeekStartDate();
  const challengeEnd = new Date(challengeStart);
  challengeEnd.setDate(challengeEnd.getDate() + 3); // Add 3 days → Monday
  challengeEnd.setHours(0, 0, 0, 0); // Monday 12:00:00 AM (midnight)

  return { challengeStart, challengeEnd };
};

/**
 * Check if user has played during current window.
 */
export const hasPlayedThisWeek = async (userId) => {
  try {
    const { challengeStart, challengeEnd } = await getCurrentChallengeWindow();

    const { data, error } = await supabase
      .from("weekly_challenges")
      .select("id")
      .eq("user_id", userId)
      .gte("attempted_at", challengeStart.toISOString())
      .lte("attempted_at", challengeEnd.toISOString())
      .maybeSingle();

    if (error) {
      console.error("❌ weeklyChallenge: failed to fetch challenge status:", error);
      return null; // distinguish error from "not played"
    }

    return !!data;
  } catch (err) {
    console.error("❌ weeklyChallenge: hasPlayedThisWeek crashed:", err);
    return null;
  }
};

/**
 * Determine if challenge is open and when next one starts.
 */
export const getWeeklyChallengeStatus = async () => {
  const { challengeStart, challengeEnd } = await getCurrentChallengeWindow();
  const now = new Date();
  const allowed = now >= challengeStart && now <= challengeEnd;

  let countdownText = "";

  if (!allowed) {
    const nextStart =
      now > challengeEnd
        ? new Date(challengeStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        : challengeStart;

    const diff = nextStart - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    countdownText = `Next in: ${days}d ${hours}h ${minutes}m`;
  }

  return { allowed, countdownText };
};
