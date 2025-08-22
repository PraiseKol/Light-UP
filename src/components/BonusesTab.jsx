import { useEffect, useState } from "react";
import { supabase } from "lib/supabaseClient";

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

export default function BonusesTab({ userId }) {
  const [bonuses, setBonuses] = useState([]);
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

        setBonuses(data || []);

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
    return diffHours <= 24; // highlight if received in last 24h
  };

  if (loading) return <div>Loading bonuses...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Your Bonuses</h2>
      {Object.keys(bonusCount).length === 0 ? (
        <p className="text-center text-gray-500">No bonuses awarded yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Object.entries(bonusCount).map(([type, count]) => (
            <div
              key={type}
              className={`flex flex-col justify-between p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow 
                bg-gradient-to-r ${BONUS_COLORS[type] || "from-gray-100 to-gray-200"} 
                ${isRecent(bonusRecentDate[type]) ? "animate-pulse ring-2 ring-yellow-400/60" : ""}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{BONUS_ICONS[type] || "🎁"}</span>
                <span className="text-lg font-semibold capitalize">{type.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                <span className="bg-white/50 px-2 py-1 rounded-full">{animatedCounts[type] ?? 0}×</span>
                <span className="text-gray-600">
                  Last received: {bonusRecentDate[type] ? new Date(bonusRecentDate[type]).toLocaleDateString() : "-"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
