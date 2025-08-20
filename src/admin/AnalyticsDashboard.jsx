// src/admin/AnalyticsDashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "lib/supabaseClient";
import { useAuth } from "auth/AuthProvider";
import { Card, CardContent } from "components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

  const [powerupData, setPowerupData] = useState([]);

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (role === "super_admin") {
      fetchStats();
      fetchPowerupTotals();
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
      .from("highest_phase_level")
      .select("highest_phase, highest_level")
      .single();

    if (error) {
      console.error("Error fetching highest phase/level:", error);
      return { phase: "-", level: "-" };
    }

    return {
      phase: data?.highest_phase || "-",
      level: data?.highest_level || "-",
    };
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

  // --- Dynamic Powerup Totals ---
const fetchPowerupTotals = async () => {
  try {
    const { data, error } = await supabase
      .from("game_users")
      .select("powerups_inventory");
    if (error) throw error;

    const totals = {};

    data.forEach((user) => {
      const inv = user.powerups_inventory || {};
      Object.entries(inv).forEach(([key, value]) => {
        if (!totals[key]) totals[key] = 0;
        totals[key] += value || 0;
      });
    });

    const chartData = Object.entries(totals)
      .map(([name, total]) => ({
        name: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        total,
      }))
      .sort((a, b) => b.total - a.total); // Sort descending by total

    setPowerupData(chartData);
  } catch (err) {
    console.error("Error fetching powerup totals:", err);
  }
};


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600 text-lg font-medium animate-pulse">
          Loading...
        </div>
      </div>
    );
  }
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
          <p className="text-3xl">Phase {stats.highestPhase}</p>
        </CardContent>
      </Card>

      {/* Highest Level */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-bold">Highest Level Reached</h2>
          <p className="text-3xl">Level {stats.highestLevel}</p>
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

      {/* Dynamic Powerups Owned Bar Chart */}
      <Card className="col-span-1 md:col-span-2">
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-2">Total Powerups Owned</h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={powerupData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
