import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createCompetition } from "@/lib/api/competition";
import { Sparkles, Crown, Dice5, X, Check, Trophy, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const PROJECT_REF = "rhanvchqlilmzxmufode";
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function MonthlyCompetitionPanel({ onCreated }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null); // { top, wildcards, eligiblePoolForReplacement }
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [creating, setCreating] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(
        `https://${PROJECT_REF}.supabase.co/functions/v1/monthly-competition-select`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ topCount: 12, wildcardCount: 4 }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate");
      setData(json);
      toast.success(`Picked ${json.top.length} top + ${json.wildcards.length} wildcards`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function rerollWildcards() {
    if (!data) return;
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(
        `https://${PROJECT_REF}.supabase.co/functions/v1/monthly-competition-select`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ topCount: 12, wildcardCount: 4 }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setData({ ...data, wildcards: json.wildcards });
      toast.success("Wildcards re-rolled");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function removePlayer(userId, kind) {
    if (!data) return;
    if (kind === "top") {
      setData({ ...data, top: data.top.filter((p) => p.user_id !== userId) });
    } else {
      setData({ ...data, wildcards: data.wildcards.filter((p) => p.user_id !== userId) });
    }
  }

  function addReplacement(player, kind) {
    if (!data) return;
    const all = [...data.top, ...data.wildcards];
    if (all.some((p) => p.user_id === player.user_id)) {
      toast.error("Already selected");
      return;
    }
    if (kind === "top") {
      setData({
        ...data,
        top: [...data.top, { ...player, selection_type: "monthly_top" }],
      });
    } else {
      setData({
        ...data,
        wildcards: [...data.wildcards, { ...player, selection_type: "monthly_wildcard" }],
      });
    }
    setSearchTerm("");
    setSearchResults([]);
  }

  async function handleSearch() {
    if (searchTerm.length < 2) return;
    const { data: results } = await supabase
      .from("game_users")
      .select("user_id, player_name")
      .ilike("player_name", `%${searchTerm}%`)
      .limit(10);
    setSearchResults(results || []);
  }

  async function confirmAndNotify() {
    if (!data) return;
    const total = data.top.length + data.wildcards.length;
    if (total !== 16) {
      toast.error(`Need exactly 16 players (have ${total})`);
      return;
    }
    setCreating(true);
    try {
      const allPlayers = [...data.top, ...data.wildcards];
      const competition = await createCompetition(allPlayers);
      if (!competition) throw new Error("Failed to create competition");

      // Push notifications to qualified players
      try {
        await fetch(
          `https://${PROJECT_REF}.supabase.co/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ANON_KEY}`,
            },
            body: JSON.stringify({
              userIds: allPlayers.map((p) => p.user_id),
              notification: {
                title: "🏆 You're In!",
                body: "You've qualified for the Monthly Competition. Open the app to prepare!",
                data: { type: "monthly_qualified", url: "/competition" },
              },
            }),
          }
        );
      } catch (e) {
        console.warn("Push notification failed:", e);
      }

      toast.success("Monthly competition created! Now click Group Players → Start.");
      setData(null);
      onCreated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  const totalSelected = (data?.top.length || 0) + (data?.wildcards.length || 0);

  return (
    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-purple-300 flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          Monthly Auto-Pick (16 Players)
        </h2>
        <button
          onClick={generate}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Dice5 className="w-4 h-4" />}
          {data ? "Regenerate All" : "Generate 16 Players"}
        </button>
      </div>

      {!data && (
        <p className="text-white/60 text-sm">
          Auto-picks 12 top monthly scorers (current calendar month) + 4 random wildcards
          from active players. Excludes banned players. You can swap individuals before
          confirming.
        </p>
      )}

      {data && (
        <div className="space-y-4">
          {/* Counter */}
          <div className="p-3 bg-black/30 rounded-lg flex items-center justify-between">
            <span className="text-white font-medium">Selected:</span>
            <span
              className={`text-2xl font-bold ${
                totalSelected === 16 ? "text-green-400" : "text-amber-400"
              }`}
            >
              {totalSelected}/16
            </span>
          </div>

          {/* Top 12 */}
          <div className="bg-black/20 rounded-lg p-4 border border-blue-500/30">
            <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Top Scorers ({data.top.length}/12)
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {data.top.map((p, i) => (
                <div
                  key={p.user_id}
                  className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
                >
                  <span className="font-bold text-amber-400 w-8">#{i + 1}</span>
                  <span className="text-white flex-1 truncate">{p.player_name}</span>
                  <span className="text-white/60 text-sm">{p.score?.toLocaleString()}</span>
                  <button
                    onClick={() => removePlayer(p.user_id, "top")}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Wildcards */}
          <div className="bg-black/20 rounded-lg p-4 border border-pink-500/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-pink-300 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Wildcards ({data.wildcards.length}/4)
              </h3>
              <button
                onClick={rerollWildcards}
                disabled={loading}
                className="text-xs px-3 py-1 bg-pink-600/50 hover:bg-pink-600 text-white rounded flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Re-roll
              </button>
            </div>
            <div className="space-y-1">
              {data.wildcards.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
                >
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span className="text-white flex-1 truncate">{p.player_name}</span>
                  <span className="text-white/60 text-sm">{p.score?.toLocaleString() || 0}</span>
                  <button
                    onClick={() => removePlayer(p.user_id, "wildcards")}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add replacement */}
          {totalSelected < 16 && (
            <div className="bg-black/20 rounded-lg p-4 border border-white/10">
              <h4 className="text-sm font-semibold text-white/80 mb-2">
                Add Replacement Player
              </h4>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search player name..."
                    className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-400"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Search
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map((p) => (
                    <div
                      key={p.user_id}
                      className="flex items-center gap-2 p-2 bg-white/5 rounded"
                    >
                      <span className="text-white flex-1 text-sm">{p.player_name}</span>
                      <button
                        onClick={() => addReplacement(p, "top")}
                        disabled={data.top.length >= 12}
                        className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded"
                      >
                        + Top
                      </button>
                      <button
                        onClick={() => addReplacement(p, "wildcards")}
                        disabled={data.wildcards.length >= 4}
                        className="text-xs px-2 py-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-40 text-white rounded"
                      >
                        + Wildcard
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Confirm */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-white/60 text-sm">
              {totalSelected === 16
                ? "Ready! This will notify all 16 players."
                : `Need ${16 - totalSelected} more player(s).`}
            </p>
            <button
              onClick={confirmAndNotify}
              disabled={totalSelected !== 16 || creating}
              className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-40 hover:scale-105 transition-transform"
            >
              {creating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              Confirm & Notify Players
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
