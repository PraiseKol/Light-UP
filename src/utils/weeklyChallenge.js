// utils/weeklyChallenge.js

import { supabase } from 'lib/supabaseClient';

export const getCurrentWeekStartDate = () => {
  const now = new Date();
  const day = now.getDay(); // Sunday = 0 ... Saturday = 6

  // Calculate how many days have passed since last Friday
  const daysSinceFriday = (day >= 5) ? day - 5 : 7 - (5 - day);
  const friday = new Date(now);
  friday.setDate(now.getDate() - daysSinceFriday);
  friday.setHours(12, 0, 0, 0); // Friday 12:00 PM

  return friday;
};

export const getCurrentChallengeWindow = () => {
  const challengeStart = getCurrentWeekStartDate(); // Friday 12 PM
  const challengeEnd = new Date(challengeStart);
  challengeEnd.setDate(challengeEnd.getDate() + 2); // Add 2 days → Sunday
  challengeEnd.setHours(23, 59, 59, 999); // Sunday 11:59:59 PM

  return { challengeStart, challengeEnd };
};

export const hasPlayedThisWeek = async (userId) => {
  const { challengeStart, challengeEnd } = getCurrentChallengeWindow();

  const { data, error } = await supabase
    .from('weekly_challenges')
    .select('id')
    .eq('user_id', userId)
    .gte('attempted_at', challengeStart.toISOString())
    .lte('attempted_at', challengeEnd.toISOString())
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch challenge status:', error);
    return false;
  }

  return !!data;
};

export const getWeeklyChallengeStatus = () => {
  const { challengeStart, challengeEnd } = getCurrentChallengeWindow();
  const now = new Date();
  const allowed = now >= challengeStart && now <= challengeEnd;

  let countdownText = '';

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
