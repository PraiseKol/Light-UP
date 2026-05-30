import React, { useEffect, useState } from "react";
import { X, Gift, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { getTodayQuests, claimQuest, QUEST_DEFS } from "@/lib/quests";

export default function DailyQuestsModal({ isOpen, onClose }) {
  const [log, setLog] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
      if (user?.id) {
        const l = await getTodayQuests(user.id);
        setLog(l);
      }
      setLoading(false);
    })();
  }, [isOpen]);

  async function handleClaim(key) {
    const res = await claimQuest(userId, key);
    if (res?.ok) {
      const r = res.reward;
      const parts = [];
      if (r.talents) parts.push(`+${r.talents} talents`);
      if (r.lives) parts.push(`+${r.lives} life`);
      toast.success(`Claimed! ${parts.join(", ")}`);
      const l = await getTodayQuests(userId);
      setLog(l);
    } else {
      toast.error("Unable to claim");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-b from-purple-900 to-indigo-900 rounded-3xl border-2 border-purple-400/40 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-gradient-to-r from-purple-700 to-indigo-700 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            Daily Quests
          </h2>
          <button
            onClick={onClose}
            aria-label="Close quests"
            className="text-white/70 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {loading && (
            <div className="text-center text-white/60 py-8">Loading…</div>
          )}
          {!loading && log?.quests?.map((q) => {
            const def = QUEST_DEFS[q.key];
            if (!def) return null;
            const pct = Math.min(100, (q.progress / q.target) * 100);
            return (
              <div
                key={q.key}
                className="bg-black/30 rounded-xl p-3 border border-white/10"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{def.icon}</span>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{def.title}</p>
                    <p className="text-white/50 text-xs">
                      {q.progress}/{q.target}
                      {def.reward.talents ? ` · +${def.reward.talents} talents` : ""}
                      {def.reward.lives ? ` · +${def.reward.lives} life` : ""}
                    </p>
                  </div>
                  {q.claimed ? (
                    <span className="text-green-400 text-xs font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Claimed
                    </span>
                  ) : q.completed ? (
                    <button
                      onClick={() => handleClaim(q.key)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold flex items-center gap-1 hover:scale-105 transition"
                    >
                      <Gift className="w-4 h-4" /> Claim
                    </button>
                  ) : null}
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {!loading && !log && (
            <p className="text-center text-white/60 py-4">No quests today.</p>
          )}
          <p className="text-center text-white/40 text-xs pt-2">
            Quests refresh daily at midnight UTC
          </p>
        </div>
      </div>
    </div>
  );
}
