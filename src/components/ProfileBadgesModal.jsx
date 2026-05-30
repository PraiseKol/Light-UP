import React, { useEffect, useState } from "react";
import { X, Trophy, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getAllAchievements, getUserAchievements } from "@/lib/achievements";

const TIER_STYLES = {
  bronze: "from-orange-700 to-orange-500",
  silver: "from-slate-400 to-slate-200",
  gold: "from-yellow-400 to-amber-600",
};

export default function ProfileBadgesModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [ownedKeys, setOwnedKeys] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const [{ data: gu }, cat, owned] = await Promise.all([
        supabase
          .from("game_users")
          .select("player_name, selected_avatar, total_user_score, lives, talents")
          .eq("user_id", user.id)
          .single(),
        getAllAchievements(),
        getUserAchievements(user.id),
      ]);
      setProfile(gu);
      setCatalogue(cat);
      setOwnedKeys(new Set(owned.map((o) => o.achievement_key)));
      setLoading(false);
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const unlockedCount = catalogue.filter((a) => ownedKeys.has(a.key)).length;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-b from-indigo-900 to-purple-900 rounded-3xl border-2 border-yellow-400/40 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-gradient-to-r from-indigo-700 to-purple-700 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-300" />
            Profile & Badges
          </h2>
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="text-white/70 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-white/60 py-12">Loading…</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Profile summary */}
            {profile && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/10 text-center">
                <p className="text-white font-bold text-lg">{profile.player_name || "Player"}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div>
                    <p className="text-yellow-300 text-2xl font-bold">{profile.total_user_score || 0}</p>
                    <p className="text-white/50 text-xs">Total Score</p>
                  </div>
                  <div>
                    <p className="text-pink-300 text-2xl font-bold">{profile.talents || 0}</p>
                    <p className="text-white/50 text-xs">Talents</p>
                  </div>
                  <div>
                    <p className="text-red-300 text-2xl font-bold">{profile.lives || 0}</p>
                    <p className="text-white/50 text-xs">Lives</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <h3 className="text-white font-semibold">Badges</h3>
              <span className="text-white/60 text-sm">
                {unlockedCount}/{catalogue.length} unlocked
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {catalogue.map((a) => {
                const owned = ownedKeys.has(a.key);
                return (
                  <div
                    key={a.key}
                    title={`${a.title}\n${a.description}`}
                    className={`relative rounded-xl p-3 text-center border transition-all ${
                      owned
                        ? `bg-gradient-to-b ${TIER_STYLES[a.tier] || TIER_STYLES.bronze} border-white/30`
                        : "bg-black/30 border-white/10 opacity-60"
                    }`}
                  >
                    <div className="text-3xl mb-1">
                      {owned ? a.icon : <Lock className="w-6 h-6 mx-auto text-white/50" />}
                    </div>
                    <p className={`text-[10px] font-bold leading-tight ${owned ? "text-black" : "text-white/70"}`}>
                      {a.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
