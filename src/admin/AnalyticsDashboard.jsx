// src/admin/AnalyticsDashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "lib/supabaseClient";
import { useAuth } from "auth/AuthProvider";
import { Card, CardContent } from "components/ui/card";

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    activePlayers: 0,
    mostPlayedMode: "-",
    avgScorePerMode: [],
    retentionRate: 0,
    highestPhase: "-",
    highestLevel: "-",
  });

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (role === "super_admin") {
      fetchStats();
    }
  }, [role]);

  const fetchUserRole = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("game_users")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (!error && data) setRole(data.role);
    setLoading(false);
  };

  const fetchHighestPhaseLevel = async () => {
    const { data, error } = await supabase
      .from("highest_phase_level") // <-- query the view
      .select("highest_phase, highest_level")
      .single();

    if (error) {
      console.error("Error fetching highest phase/level:", error);
      return { phase: "-", level: "-" };
    }

    if (data) {
      return {
        phase: data.highest_phase || "-",
        level: data.highest_level || "-",
      };
    }

    return { phase: "-", level: "-" };
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_analytics");
      if (error) throw error;

      const { phase, level } = await fetchHighestPhaseLevel();

      if (data) {
        setStats({
          activePlayers: data.active_players || 0,
          mostPlayedMode: data.most_played_mode || "-",
          avgScorePerMode: data.avg_score_per_mode || [],
          retentionRate: data.retention_rate || 0,
          highestPhase: phase,
          highestLevel: level,
        });
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (role !== "super_admin")
    return <p className="text-red-500">🚫 Access Denied</p>;

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Active Players */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-bold">Active Players (7 days)</h2>
          <p className="text-3xl">{stats.activePlayers}</p>
        </CardContent>
      </Card>

      {/* Most Played Mode */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-bold">Most Played Mode</h2>
          <p className="text-3xl">{stats.mostPlayedMode}</p>
        </CardContent>
      </Card>

      {/* Highest Phase */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-bold">Highest Phase Reached</h2>
          <p className="text-3xl">
            Phase {stats.highestPhase} 
          </p>
        </CardContent>
      </Card>

      {/* Highest Level */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-bold">Highest Level Reached</h2>
          <p className="text-3xl">
         Level {stats.highestLevel}
          </p>
        </CardContent>
      </Card>

      {/* Average Score Per Mode */}
      <Card className="col-span-1 md:col-span-2">
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-2">Average Score Per Mode</h2>
          <ul>
            {stats.avgScorePerMode.map((m) => (
              <li key={m.mode} className="flex justify-between">
                <span>{m.mode}</span>
                <span>{m.avg.toFixed(1)} pts</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Retention Rate */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-bold">Retention Rate</h2>
          <p className="text-3xl">{stats.retentionRate}%</p>
        </CardContent>
      </Card>
    </div>
  );
}
