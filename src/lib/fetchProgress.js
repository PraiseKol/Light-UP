// src/lib/fetchProgress.js
import { supabase } from "./supabaseClient";

const TTL_MS = 5000; // cache for 5s
const progressCache = new Map(); // userId -> { levels, ts }
const inFlight = new Map(); // userId -> Promise

export function invalidateProgressCache(userId) {
if (userId) {
progressCache.delete(userId);
inFlight.delete(userId);
} else {
progressCache.clear();
inFlight.clear();
}
}

export function addLevelToProgressCache(userId, levelId) {
if (!userId || !levelId) return;
const cached = progressCache.get(userId);
const levels = cached?.levels || [];
if (!levels.includes(levelId)) {
progressCache.set(userId, { levels: [...levels, levelId], ts: Date.now() });
}
}

export async function fetchProgress(passedUserId, { force = false } = {}) {
let userId = passedUserId;

if (!userId) {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();
if (authError || !user) {
console.error("❌ Not authenticated:", authError?.message);
return [];
}
userId = user.id;
}

const cached = progressCache.get(userId);
const now = Date.now();
if (!force && cached && now - cached.ts < TTL_MS) {
return cached.levels;
}

if (inFlight.has(userId)) return inFlight.get(userId);

const p = (async () => {
try {
const { data, error } = await supabase
.from("progress")
.select("level_id")
.eq("user_id", userId);

if (error) throw error;

const uniqueLevels = [...new Set((data || []).map((r) => r.level_id))];
// console.log("✅ Fetched completed levels:", uniqueLevels);

progressCache.set(userId, { levels: uniqueLevels, ts: Date.now() });
return uniqueLevels;
} catch (err) {
console.error("❌ Error fetching progress:", err.message);
return [];
} finally {
inFlight.delete(userId);
}
})();

inFlight.set(userId, p);
return p;
}