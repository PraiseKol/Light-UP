// src/lib/fetchTotalScore.js
import { supabase } from "./supabaseClient";

const TTL_MS = 5000;
const scoreCache = new Map(); // userId -> { total, ts }
const inFlight = new Map(); // userId -> Promise

export function invalidateScoreCache(userId) {
if (userId) {
scoreCache.delete(userId);
inFlight.delete(userId);
} else {
scoreCache.clear();
inFlight.clear();
}
}

export async function fetchTotalScore(passedUserId, { force = false } = {}) {
let userId = passedUserId;

if (!userId) {
const {
data: { user },
error: authError,
} = await supabase.auth.getUser();
if (authError || !user) {
console.error("❌ Not authenticated:", authError?.message);
return 0;
}
userId = user.id;
}

const cached = scoreCache.get(userId);
const now = Date.now();
if (!force && cached && now - cached.ts < TTL_MS) {
return cached.total;
}

if (inFlight.has(userId)) return inFlight.get(userId);

const p = (async () => {
try {
const { data, error } = await supabase
.from("progress")
.select("score")
.eq("user_id", userId);

if (error) throw error;

const total = (data || []).reduce(
(acc, row) => acc + (row.score || 0),
0
);
scoreCache.set(userId, { total, ts: Date.now() });
return total;
} catch (err) {
console.error("Error fetching total score:", err.message);
return 0;
} finally {
inFlight.delete(userId);
}
})();

inFlight.set(userId, p);
return p;
}