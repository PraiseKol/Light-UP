// utils/weeklyChallenge.js
import { supabase } from "@/lib/supabaseClient";

/**
 * Calculate Friday 12:00 PM of the current challenge week
 * Returns a Date object in local timezone
 */
export const getCurrentWeekStartDate = () => {
  const now = new Date();
  const day = now.getDay(); // Sunday=0 ... Saturday=6
  const currentHour = now.getHours();
  
  let daysSinceFriday;
  
  if (day === 0) {
    // Sunday → last Friday was 2 days ago
    daysSinceFriday = 2;
  } else if (day === 1) {
    // Monday → if before noon, use last Friday (3 days ago), else next Friday (4 days ahead)
    daysSinceFriday = currentHour < 12 ? 3 : -4;
  } else if (day === 5) {
    // Friday → if before noon, use last Friday (7 days ago), else current Friday (today)
    daysSinceFriday = currentHour < 12 ? 7 : 0;
  } else if (day === 6) {
    // Saturday → last Friday was yesterday
    daysSinceFriday = 1;
  } else {
    // Tuesday (2), Wednesday (3), Thursday (4)
    daysSinceFriday = day + 2;
  }
  
  const friday = new Date(now);
  friday.setDate(now.getDate() - daysSinceFriday);
  friday.setHours(12, 0, 0, 0); // Friday 12:00 PM
  
  return friday;
};

/**
 * Compute challenge window (Fri 12PM → Mon 12:00AM)
 */
export const getCurrentChallengeWindow = () => {
  const challengeStart = getCurrentWeekStartDate();
  const challengeEnd = new Date(challengeStart);
  challengeEnd.setDate(challengeEnd.getDate() + 3); // Add 3 days → Monday
  challengeEnd.setHours(0, 0, 0, 0); // Monday 12:00:00 AM (midnight)
  
  return { challengeStart, challengeEnd };
};

/**
 * Check if user has played during current window
 */
export const hasPlayedThisWeek = async (userId) => {
  try {
    const { challengeStart, challengeEnd } = getCurrentChallengeWindow();
    
    // console.log("🔍 hasPlayedThisWeek check:", {
    //   userId,
    //   challengeStart: challengeStart.toISOString(),
    //   challengeEnd: challengeEnd.toISOString(),
    //   now: new Date().toISOString()
    // });
    
    const { data, error } = await supabase
      .from("weekly_challenges")
      .select("id, attempted_at, week_start_date")
      .eq("user_id", userId)
      .gte("attempted_at", challengeStart.toISOString())
      .lt("attempted_at", challengeEnd.toISOString())
      .maybeSingle();
    
    if (error) {
      console.error("❌ weeklyChallenge: failed to fetch challenge status:", error);
      return null;
    }
    
    // console.log("✅ hasPlayedThisWeek result:", { found: !!data, data });
    return !!data;
  } catch (err) {
    console.error("❌ weeklyChallenge: hasPlayedThisWeek crashed:", err);
    return null;
  }
};

/**
 * Determine if challenge is open and when next one starts
 */
export const getWeeklyChallengeStatus = () => {
  const { challengeStart, challengeEnd } = getCurrentChallengeWindow();
  const now = new Date();
  
  // Challenge is allowed if current time is between start and end
  const allowed = now >= challengeStart && now < challengeEnd;
  
  let countdownText = "";
  
  if (!allowed) {
    // Determine next challenge start
    let nextStart;
    if (now < challengeStart) {
      // We're before this week's start → use this week's start
      nextStart = challengeStart;
    } else {
      // We're after this week's end → calculate next Friday 12PM
      nextStart = new Date(challengeStart);
      nextStart.setDate(nextStart.getDate() + 7);
    }
    
    const diff = nextStart - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    
    countdownText = `${days}d ${hours}h ${minutes}m`;
  }
  
  return { allowed, countdownText };
};
