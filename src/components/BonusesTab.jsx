import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const BONUS_ICONS = {
  daily_day3: "🎯",
  daily_day5: "🏆",
  daily_day7plus: "🌟",
  accuracy: "✅",
  perfect_phase: "🔥",
  phase_completion: "✨",
};

const BONUS_COLORS = {
  daily_day3: "from-green-100 to-green-200",
  daily_day5: "from-yellow-100 to-yellow-200",
  daily_day7plus: "from-purple-100 to-purple-200",
  accuracy: "from-blue-100 to-blue-200",
  perfect_phase: "from-red-100 to-red-200",
  phase_completion: "from-pink-100 to-pink-200",
};

// Talent values per bonus
const BONUS_VALUES = {
  accuracy: 2,
  perfect_phase: 10,
  phase_completion: 3,
  daily_day3: 1,
  daily_day5: 2,
  daily_day7plus: 3,
};

export default function BonusesTab({ userId }) {
  const [bonusCount, setBonusCount] = useState({});
  const [bonusRecentDate, setBonusRecentDate] = useState({});
  const [animatedCounts, setAnimatedCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchBonuses = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("bonus_awards")
          .select("bonus_type, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const counts = {};
        const recentDates = {};

        (data || []).forEach((item) => {
          counts[item.bonus_type] = (counts[item.bonus_type] || 0) + 1;
          if (!recentDates[item.bonus_type]) {
            recentDates[item.bonus_type] = item.created_at;
          }
        });

        setBonusCount(counts);
        setBonusRecentDate(recentDates);

        // Animate counters
        const initialCounts = {};
        Object.keys(counts).forEach((type) => {
          initialCounts[type] = 0;
        });
        setAnimatedCounts(initialCounts);

        Object.entries(counts).forEach(([type, finalCount]) => {
          let current = 0;
          const interval = setInterval(() => {
            current += 1;
            setAnimatedCounts((prev) => ({ ...prev, [type]: current }));
            if (current >= finalCount) clearInterval(interval);
          }, 80);
        });
      } catch (err) {
        console.error("Failed to fetch bonuses:", err);
        setError("Failed to load bonuses");
      } finally {
        setLoading(false);
      }
    };

    fetchBonuses();
  }, [userId]);

  const isRecent = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  if (loading) return <div>Loading bonuses...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="p-2 md:p-4 max-w-xl md:max-w-3xl mx-auto bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-2xl border-2 border-green-200 shadow-[0_8px_0_#16a34a,0_12px_20px_rgba(22,163,74,0.4)]">
      <h2 className="text-sm md:text-2xl font-bold mb-2 md:mb-6 text-center bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
        🎁 Your Bonuses
      </h2>
      {Object.keys(bonusCount).length === 0 ? (
        <p className="text-center text-gray-500">No bonuses awarded yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(bonusCount).map(([type, count]) => {
            const earnedTalents = count * (BONUS_VALUES[type] || 0);

            return (
              <div
                key={type}
                className={`relative flex flex-col justify-between p-2 md:p-3 rounded-lg shadow-sm hover:shadow-md transition 
                      bg-gradient-to-r ${BONUS_COLORS[type] || "from-gray-100 to-gray-200"} 
                      ${
                        isRecent(bonusRecentDate[type])
                          ? "animate-pulse ring-2 ring-yellow-400/60"
                          : ""
                      }`}
              >
                {/* Floating Icon */}
                <div className="absolute -top-3 -left-3 w-5 md:w-8 h-5 md:h-8 flex items-center justify-center rounded-full bg-white shadow">
                  <span className="text-lg">{BONUS_ICONS[type] || "🎁"}</span>
                </div>

                {/* Title */}
                <div className="pl-3 md:pl-6 mt-0.5 md:mt-1">
                  <span className="text-xs md:text-sm font-semibold text-gray-800 capitalize">
                    {type.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Bottom section */}
                <div className="flex justify-between items-end mt-2 md:mt-4 text-[10px] md:text-xs text-gray-600">
                  {/* Count + Gems */}
                  <div className="flex items-center gap-1 bg-white/80 px-1 md:px-2 py-0.5 rounded-md shadow-inner text-[10px] md:text-sm">
                    <span className="font-semibold text-gray-700 ">
                      {animatedCounts[type] ?? 0}×
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="font-semibold text-blue-600">
                      {earnedTalents}
                    </span>
                    <span className="ml-0.5">💎</span>
                  </div>

                  {/* Last earned */}
                  <span className="italic text-[10px] md:text-sm" >
                    {bonusRecentDate[type]
                      ? new Date(bonusRecentDate[type]).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
