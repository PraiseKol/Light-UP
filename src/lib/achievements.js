// Achievements / Badges — checks user stats vs catalogue and grants new unlocks
import { supabase } from "./supabaseClient";

export async function getAllAchievements() {
  const { data } = await supabase.from("achievements").select("*").order("tier");
  return data || [];
}

export async function getUserAchievements(userId) {
  if (!userId) return [];
  const { data } = await supabase
    .from("user_achievements")
    .select("achievement_key, unlocked_at")
    .eq("user_id", userId);
  return data || [];
}

async function getUserStats(userId) {
  const [{ data: gu }, { count: levelsCount }, { count: perfectCount }, { data: streak }] =
    await Promise.all([
      supabase.from("game_users").select("total_user_score, consecutive_perfects").eq("user_id", userId).single(),
      supabase.from("progress").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("score", 100),
      supabase.from("daily_streaks").select("streak_count").eq("user_id", userId).maybeSingle(),
    ]);

  // Phase completion: highest phase with all levels done (approx: 1 if any progress in phase=N)
  const { data: phaseRows } = await supabase
    .from("progress")
    .select("phase")
    .eq("user_id", userId);
  const phasesPlayed = new Set((phaseRows || []).map((r) => r.phase).filter(Boolean));

  const { count: questsDone } = await supabase
    .from("daily_quests_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    total_score: gu?.total_user_score || 0,
    levels_completed: levelsCount || 0,
    perfect_scores: perfectCount || 0,
    daily_streak: streak?.streak_count || 0,
    phases_played: phasesPlayed,
    quests_completed: questsDone || 0,
  };
}

function meets(criteria_type, criteria_value, stats) {
  switch (criteria_type) {
    case "levels_completed":
      return stats.levels_completed >= criteria_value;
    case "perfect_scores":
      return stats.perfect_scores >= criteria_value;
    case "total_score":
      return stats.total_score >= criteria_value;
    case "daily_streak":
      return stats.daily_streak >= criteria_value;
    case "phase_completed":
      return stats.phases_played.has(criteria_value);
    case "quests_completed":
      return stats.quests_completed >= criteria_value;
    default:
      return false;
  }
}

/**
 * Check stats and grant any newly-earned achievements.
 * Returns the list of newly unlocked achievement keys.
 */
export async function checkAndGrantAchievements(userId) {
  if (!userId) return [];
  const [catalogue, owned, stats] = await Promise.all([
    getAllAchievements(),
    getUserAchievements(userId),
    getUserStats(userId),
  ]);
  const ownedKeys = new Set(owned.map((o) => o.achievement_key));
  const newlyUnlocked = [];

  for (const a of catalogue) {
    if (ownedKeys.has(a.key)) continue;
    if (meets(a.criteria_type, a.criteria_value, stats)) {
      const { error } = await supabase
        .from("user_achievements")
        .insert({ user_id: userId, achievement_key: a.key });
      if (!error) newlyUnlocked.push(a);
    }
  }
  return newlyUnlocked;
}
