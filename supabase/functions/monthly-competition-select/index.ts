// Edge function: pick 12 top monthly scorers + 4 random wildcards for monthly competition
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;
    const { data: roleRow } = await supabase
      .from("game_users")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (!roleRow || !["admin", "super_admin"].includes(roleRow.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const topCount = Number(body.topCount) || 12;
    const wildcardCount = Number(body.wildcardCount) || 4;

    // Calendar month (UTC) window
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    // Banned users
    const [{ data: mainBans }, { data: weeklyBans }] = await Promise.all([
      supabase.from("main_leaderboard_bans").select("user_id"),
      supabase.from("weekly_leaderboard_bans").select("user_id"),
    ]);
    const banned = new Set<string>([
      ...(mainBans ?? []).map((r: any) => r.user_id),
      ...(weeklyBans ?? []).map((r: any) => r.user_id),
    ]);

    // Pull monthly progress
    const { data: progressRows, error: progErr } = await supabase
      .from("progress")
      .select("user_id, score, completed_at")
      .gte("completed_at", startOfMonth.toISOString())
      .lte("completed_at", endOfMonth.toISOString());
    if (progErr) throw progErr;

    const totals = new Map<string, number>();
    for (const row of progressRows ?? []) {
      if (banned.has(row.user_id)) continue;
      totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.score ?? 0));
    }

    // Top scorers
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, topCount).map(([user_id, score]) => ({ user_id, score }));
    const topIds = new Set(top.map((p) => p.user_id));

    // Active pool for wildcards: ≥3 progress entries in last 14 days
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRows } = await supabase
      .from("progress")
      .select("user_id, completed_at")
      .gte("completed_at", since);

    const counts = new Map<string, number>();
    for (const r of recentRows ?? []) {
      counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
    }
    const eligibleWildcardIds = [...counts.entries()]
      .filter(([id, c]) => c >= 3 && !banned.has(id) && !topIds.has(id))
      .map(([id]) => id);

    // Random sample
    const shuffled = eligibleWildcardIds.sort(() => Math.random() - 0.5);
    const wildcards = shuffled.slice(0, wildcardCount).map((user_id) => ({
      user_id,
      score: totals.get(user_id) ?? 0,
    }));

    // Names
    const allIds = [...top.map((p) => p.user_id), ...wildcards.map((p) => p.user_id)];
    const { data: users } = await supabase
      .from("game_users")
      .select("user_id, player_name")
      .in("user_id", allIds);
    const nameMap = new Map((users ?? []).map((u: any) => [u.user_id, u.player_name ?? "Player"]));

    const result = {
      top: top.map((p, i) => ({
        user_id: p.user_id,
        player_name: nameMap.get(p.user_id) ?? "Player",
        score: p.score,
        rank: i + 1,
        selection_type: "monthly_top",
      })),
      wildcards: wildcards.map((p) => ({
        user_id: p.user_id,
        player_name: nameMap.get(p.user_id) ?? "Player",
        score: p.score,
        selection_type: "monthly_wildcard",
      })),
      eligibleWildcardCount: eligibleWildcardIds.length,
      eligiblePoolForReplacement: sorted
        .slice(topCount, topCount + 50)
        .filter(([id]) => !banned.has(id))
        .map(([user_id, score]) => ({
          user_id,
          player_name: nameMap.get(user_id) ?? "Player",
          score,
        })),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("monthly-competition-select error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
