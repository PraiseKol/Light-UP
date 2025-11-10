// src/admin/AnalyticsDashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  PieChart,
  Pie,
  Cell,
  Legend,
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

  const POWERUP_COLORS = {
    divine_hint: "#4f46e5",
    grace_period: "#f59e0b",
    holy_shield: "#10b981",
    heavenly_match: "#ef4444",
  };

  // --- Power-Up Usage Pie Chart ---
  const [powerupUsageData, setPowerupUsageData] = useState([]);

  const fetchActivePlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_streaks")
        .select("user_id")
        .gte("streak_count", 2); // Only users with streak >= 2
      if (error) throw error;
      return data?.length || 0;
    } catch (err) {
      console.error("Error fetching active players:", err);
      return 0;
    }
  };

  
  

  const fetchPowerupUsage = async () => {
    try {
      const { data, error } = await supabase
        .from("powerup_usage")
        .select("powerup_key, quantity");

      if (error) throw error;

      const totals = {};

      data.forEach((row) => {
        if (!totals[row.powerup_key]) totals[row.powerup_key] = 0;
        totals[row.powerup_key] += row.quantity;
      });

      const chartData = Object.entries(totals)
        .map(([key, total]) => ({
          name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          total,
        }))
        .sort((a, b) => b.total - a.total);

      setPowerupUsageData(chartData);
    } catch (err) {
      console.error("Error fetching power-up usage:", err);
    }
  };

  const [powerupData, setPowerupData] = useState([]);

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (role === "super_admin") {
      fetchStats();
      fetchPowerupTotals();
      fetchPowerupUsage(); // <-- add this
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
      const activePlayersCount = await fetchActivePlayers();


      if (data) {
        setStats({
          activePlayers: activePlayersCount, // <-- replace old activePlayers
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
          name: name
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
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
                <Bar dataKey="total">
                  {powerupData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        POWERUP_COLORS[
                          entry.name.toLowerCase().replace(/\s/g, "_")
                        ] || "#4f46e5"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Power-Up Usage Pie Chart */}
      <Card className="col-span-1 md:col-span-2">
        <CardContent className="p-4">
          <h2 className="text-lg font-bold mb-2">
            Power-Up Usage Distribution
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={powerupUsageData}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {powerupUsageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        POWERUP_COLORS[
                          entry.name.toLowerCase().replace(/\s/g, "_")
                        ] || "#a1a1aa"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={15} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
