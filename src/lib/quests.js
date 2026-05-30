// Daily Quests system — 3 random quests per UTC day, stored in daily_quests_log
import { supabase } from "./supabaseClient";

export const QUEST_DEFS = {
  complete_2: {
    key: "complete_2",
    title: "Complete 2 levels",
    icon: "🎯",
    target: 2,
    reward: { talents: 5 },
    event: "level_complete",
  },
  complete_5: {
    key: "complete_5",
    title: "Complete 5 levels",
    icon: "🏃",
    target: 5,
    reward: { talents: 10 },
    event: "level_complete",
  },
  perfect_1: {
    key: "perfect_1",
    title: "Get 1 perfect score",
    icon: "✨",
    target: 1,
    reward: { talents: 8 },
    event: "perfect_score",
  },
  score_200: {
    key: "score_200",
    title: "Earn 200 points today",
    icon: "💎",
    target: 200,
    reward: { talents: 8 },
    event: "score_earned",
  },
  weekend_play: {
    key: "weekend_play",
    title: "Play Weekend Challenge",
    icon: "⚔️",
    target: 1,
    reward: { talents: 10, lives: 1 },
    event: "weekend_play",
  },
  any_mode: {
    key: "any_mode",
    title: "Play any game mode",
    icon: "🎮",
    target: 3,
    reward: { talents: 5 },
    event: "level_complete",
  },
};

const QUEST_KEYS = Object.keys(QUEST_DEFS);

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function pickThreeRandom() {
  const shuffled = [...QUEST_KEYS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((key) => ({
    key,
    target: QUEST_DEFS[key].target,
    progress: 0,
    completed: false,
    claimed: false,
  }));
}

export async function getTodayQuests(userId) {
  if (!userId) return null;
  const date = todayUTC();
  const { data, error } = await supabase
    .from("daily_quests_log")
    .select("*")
    .eq("user_id", userId)
    .eq("quest_date", date)
    .maybeSingle();

  if (error) {
    console.error("getTodayQuests:", error.message);
    return null;
  }
  if (data) return data;

  const quests = pickThreeRandom();
  const { data: created, error: insErr } = await supabase
    .from("daily_quests_log")
    .insert({ user_id: userId, quest_date: date, quests })
    .select()
    .single();
  if (insErr) {
    console.error("create daily quests:", insErr.message);
    return null;
  }
  return created;
}

/**
 * Update quest progress for an event.
 * event: 'level_complete' | 'perfect_score' | 'score_earned' | 'weekend_play'
 * amount: increment value (default 1)
 */
export async function updateQuestProgress(userId, event, amount = 1) {
  if (!userId || !event) return null;
  const log = await getTodayQuests(userId);
  if (!log) return null;

  let changed = false;
  const updated = (log.quests || []).map((q) => {
    const def = QUEST_DEFS[q.key];
    if (!def || def.event !== event || q.completed) return q;
    const newProgress = Math.min(q.target, (q.progress || 0) + amount);
    if (newProgress !== q.progress) changed = true;
    return {
      ...q,
      progress: newProgress,
      completed: newProgress >= q.target,
    };
  });
  if (!changed) return log;

  const { data, error } = await supabase
    .from("daily_quests_log")
    .update({ quests: updated })
    .eq("id", log.id)
    .select()
    .single();
  if (error) {
    console.error("update quest progress:", error.message);
    return log;
  }
  return data;
}

export async function claimQuest(userId, questKey) {
  const log = await getTodayQuests(userId);
  if (!log) return { error: "no_log" };
  const q = (log.quests || []).find((x) => x.key === questKey);
  if (!q) return { error: "not_found" };
  if (!q.completed) return { error: "not_complete" };
  if (q.claimed) return { error: "already_claimed" };

  const def = QUEST_DEFS[questKey];
  const updated = log.quests.map((x) =>
    x.key === questKey ? { ...x, claimed: true } : x
  );

  // Apply reward
  if (def?.reward) {
    const { data: gu } = await supabase
      .from("game_users")
      .select("talents, lives")
      .eq("user_id", userId)
      .single();
    const patch = {};
    if (def.reward.talents) patch.talents = (gu?.talents || 0) + def.reward.talents;
    if (def.reward.lives) patch.lives = Math.min(5, (gu?.lives || 0) + def.reward.lives);
    if (Object.keys(patch).length > 0) {
      await supabase.from("game_users").update(patch).eq("user_id", userId);
    }
  }

  await supabase.from("daily_quests_log").update({ quests: updated }).eq("id", log.id);
  return { ok: true, reward: def.reward };
}
