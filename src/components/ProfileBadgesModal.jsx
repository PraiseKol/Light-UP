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
      <div className="modal-3d relative w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="modal-3d-header sticky top-0 z-10 flex items-center justify-between p-4 rounded-t-2xl">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-300" />
            Profile & Badges
          </h2>
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-purple-700/70 py-12">Loading…</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Profile summary */}
            {profile && (
              <div className="row-3d flex-col !items-stretch text-center">
                <p className="text-purple-900 font-extrabold text-lg">{profile.player_name || "Player"}</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="chip-3d chip-3d-star flex-col !py-2">
                    <p className="text-2xl font-black leading-none">{profile.total_user_score || 0}</p>
                    <p className="text-[10px] font-semibold opacity-80">Score</p>
                  </div>
                  <div className="chip-3d flex-col !py-2">
                    <p className="text-2xl font-black leading-none">{profile.talents || 0}</p>
                    <p className="text-[10px] font-semibold opacity-80">Talents</p>
                  </div>
                  <div className="chip-3d chip-3d-heart flex-col !py-2">
                    <p className="text-2xl font-black leading-none">{profile.lives || 0}</p>
                    <p className="text-[10px] font-semibold opacity-80">Lives</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <h3 className="text-purple-900 font-extrabold">Badges</h3>
              <span className="text-purple-700/70 text-sm">
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
                    className={`relative rounded-2xl p-3 text-center border-2 transition-all ${
                      owned
                        ? `bg-gradient-to-b ${TIER_STYLES[a.tier] || TIER_STYLES.bronze} border-white/70 shadow-[inset_0_2px_0_rgba(255,255,255,0.6),0_4px_0_rgba(0,0,0,0.15),0_8px_14px_-4px_rgba(0,0,0,0.3)]`
                        : "bg-gradient-to-b from-gray-200 to-gray-400 border-white/50 opacity-70 shadow-[inset_0_2px_0_rgba(255,255,255,0.4),0_3px_0_rgba(0,0,0,0.15)]"
                    }`}
                  >
                    <div className="text-3xl mb-1 drop-shadow-md">
                      {owned ? a.icon : <Lock className="w-6 h-6 mx-auto text-gray-700" />}
                    </div>
                    <p className={`text-[10px] font-black leading-tight ${owned ? "text-black" : "text-gray-800"}`}>
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
