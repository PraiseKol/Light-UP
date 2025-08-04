// src/admin/PlayerManager.jsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "lib/supabaseClient";
import { Button } from "components/ui/button";
import { useAuth } from "auth/AuthProvider";

export default function PlayerManager() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [bannedUsers, setBannedUsers] = useState([]);

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (role === "super_admin") {
      fetchPlayers();
      fetchBans();
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

  const fetchPlayers = useCallback(async () => {
    // Pull all relevant player info from game_users directly
    const { data: users } = await supabase
      .from("game_users")
      .select("user_id, player_name, lives, total_user_score, updated_at, created_at");

    // Weekly challenge attempts
    const { data: weeklyAttempts } = await supabase
      .from("weekly_leaderboard")
      .select("user_id");

    // Multiplayer games played
    const { data: multiplayerGames } = await supabase
      .from("progress")
      .select("user_id, mode")
      .eq("mode", "multiplayer");

    // Map data together
    const playerList = users.map((u) => {
      const weeklyCount = weeklyAttempts.filter(
        (w) => w.user_id === u.user_id
      ).length;
      const multiCount = multiplayerGames.filter(
        (m) => m.user_id === u.user_id
      ).length;

      return {
        ...u,
        total_score: u.total_user_score || 0,
        weekly_attempts: weeklyCount,
        multiplayer_games: multiCount,
      };
    });

    setPlayers(playerList);
  }, []);

  const fetchBans = async () => {
    const { data } = await supabase.from("player_bans").select("user_id");
    setBannedUsers(data?.map((b) => b.user_id) || []);
  };

  const handleBan = async (playerId) => {
    if (!window.confirm("Ban this player?")) return;
    await supabase.from("player_bans").insert({ user_id: playerId });
    setBannedUsers((prev) => [...prev, playerId]);
  };

  const handleUnban = async (playerId) => {
    if (!window.confirm("Unban this player?")) return;
    await supabase.from("player_bans").delete().eq("user_id", playerId);
    setBannedUsers((prev) => prev.filter((id) => id !== playerId));
  };

  const resetLives = async (playerId) => {
    if (!window.confirm("Reset this player's lives to 5?")) return;
    await supabase.from("game_users").update({ lives: 5 }).eq("user_id", playerId);
    fetchPlayers();
  };

  const resetScore = async (playerId) => {
    if (!window.confirm("Reset this player's total score to 0?")) return;
    await supabase
      .from("game_users")
      .update({ total_user_score: 0 })
      .eq("user_id", playerId);
    fetchPlayers();
  };

  if (loading) return <p>Loading...</p>;
  if (role !== "super_admin")
    return <p className="text-red-500">🚫 Access Denied</p>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Player Manager</h2>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by player name or ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-2 border">Player Name</th>
              <th className="p-2 border">Lives</th>
              <th className="p-2 border">Total Score</th>
              <th className="p-2 border">Weekly Attempts</th>
              <th className="p-2 border">Multiplayer Games</th>
              <th className="p-2 border">Last Update</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players
              .filter(
                (p) =>
                  p.player_name
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||
                  p.user_id?.toLowerCase().includes(search.toLowerCase())
              )
              .map((p) => (
                <tr key={p.user_id} className="border-b">
                  <td className="p-2 border">{p.player_name || "Unknown"}</td>
                  <td className="p-2 border">{p.lives}</td>
                  <td className="p-2 border">{p.total_score}</td>
                  <td className="p-2 border">{p.weekly_attempts}</td>
                  <td className="p-2 border">{p.multiplayer_games}</td>
                  <td className="p-2 border">
                    {new Date(p.updated_at).toLocaleString()}
                  </td>
                  <td className="p-2 border flex gap-2 flex-wrap">
                    {bannedUsers.includes(p.user_id) ? (
                      <Button variant="outline" onClick={() => handleUnban(p.user_id)}>
                        Unban
                      </Button>
                    ) : (
                      <Button variant="destructive" onClick={() => handleBan(p.user_id)}>
                        Ban
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => resetLives(p.user_id)}>
                      Reset Lives
                    </Button>
                    <Button variant="outline" onClick={() => resetScore(p.user_id)}>
                      Reset Score
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
