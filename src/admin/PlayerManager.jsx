// src/admin/PlayerManager.jsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "components/ui/button";
import { useAuth } from "auth/AuthProvider";

export default function PlayerManager() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [bannedUsers, setBannedUsers] = useState([]);

  // Modal state for powerups
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [jsonInput, setJsonInput] = useState("");

  // ... inside your PlayerManager component:

  const [awardLives, setAwardLives] = useState("");
  const [awardTalents, setAwardTalents] = useState("");

  // Award extra lives to all players
  const awardAllLives = async () => {
    const num = parseInt(awardLives, 10);
    if (isNaN(num) || num <= 0) return alert("Enter a valid number");

    await supabase.rpc("increment_all_lives", { extra_lives: num });
    setAwardLives("");
    fetchPlayers();
  };

  // Award extra talents to all players
  const awardAllTalents = async () => {
    const num = parseInt(awardTalents, 10);
    if (isNaN(num) || num <= 0) return alert("Enter a valid number");

    await supabase.rpc("increment_all_talents", { extra_talents: num });
    setAwardTalents("");
    fetchPlayers();
  };

  // Inline editing state
  const [editingField, setEditingField] = useState(null); // {userId, field, value}

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
    const { data: users } = await supabase
      .from("game_users")
      .select(
        "user_id, player_name, lives, total_user_score, talents, powerups_inventory, updated_at, created_at"
      );

    const { data: weeklyAttempts } = await supabase
      .from("weekly_leaderboard")
      .select("user_id");

    const { data: multiplayerGames } = await supabase
      .from("progress")
      .select("user_id, mode")
      .eq("mode", "multiplayer");

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
    await supabase
      .from("game_users")
      .update({ lives: 5 })
      .eq("user_id", playerId);
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

  // --- Powerups Editing ---
  const openPowerupsEditor = (player) => {
    setEditingPlayer(player);
    setJsonInput(JSON.stringify(player.powerups_inventory || {}, null, 2));
  };

  const savePowerups = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      await supabase
        .from("game_users")
        .update({ powerups_inventory: parsed })
        .eq("user_id", editingPlayer.user_id);

      setEditingPlayer(null);
      fetchPlayers();
    } catch (err) {
      alert("Invalid JSON: " + err.message);
    }
  };

  // --- Inline Save (Lives, Talents) ---
  const saveField = async (userId, field, value) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;

    await supabase
      .from("game_users")
      .update({ [field]: num })
      .eq("user_id", userId);

    setEditingField(null);
    fetchPlayers();
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
              <th className="p-2 border">Talents</th>
              <th className="p-2 border">Powerups</th>
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
                  p.player_name?.toLowerCase().includes(search.toLowerCase()) ||
                  p.user_id?.toLowerCase().includes(search.toLowerCase())
              )
              .map((p) => (
                <tr key={p.user_id} className="border-b">
                  <td className="p-2 border">{p.player_name || "Unknown"}</td>

                  {/* Lives Editable */}
                  <td className="p-2 border">
                    {editingField?.userId === p.user_id &&
                    editingField.field === "lives" ? (
                      <input
                        type="number"
                        className="border p-1 w-16"
                        value={editingField.value}
                        onChange={(e) =>
                          setEditingField({
                            ...editingField,
                            value: e.target.value,
                          })
                        }
                        onBlur={() =>
                          saveField(p.user_id, "lives", editingField.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveField(p.user_id, "lives", editingField.value);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer"
                        onClick={() =>
                          setEditingField({
                            userId: p.user_id,
                            field: "lives",
                            value: p.lives,
                          })
                        }
                      >
                        {p.lives}
                      </span>
                    )}
                  </td>

                  {/* Talents Editable */}
                  <td className="p-2 border">
                    {editingField?.userId === p.user_id &&
                    editingField.field === "talents" ? (
                      <input
                        type="number"
                        className="border p-1 w-16"
                        value={editingField.value}
                        onChange={(e) =>
                          setEditingField({
                            ...editingField,
                            value: e.target.value,
                          })
                        }
                        onBlur={() =>
                          saveField(p.user_id, "talents", editingField.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            saveField(p.user_id, "talents", editingField.value);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer"
                        onClick={() =>
                          setEditingField({
                            userId: p.user_id,
                            field: "talents",
                            value: p.talents,
                          })
                        }
                      >
                        {p.talents}
                      </span>
                    )}
                  </td>

                  {/* Powerups */}
                  <td className="p-2 border">
                    {Object.keys(p.powerups_inventory || {}).length} items
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => openPowerupsEditor(p)}
                    >
                      Edit
                    </Button>
                  </td>

                  <td className="p-2 border">{p.total_score}</td>
                  <td className="p-2 border">{p.weekly_attempts}</td>
                  <td className="p-2 border">{p.multiplayer_games}</td>
                  <td className="p-2 border">
                    {new Date(p.updated_at).toLocaleString()}
                  </td>
                  <td className="p-2 border flex gap-2 flex-wrap">
                    {bannedUsers.includes(p.user_id) ? (
                      <Button
                        variant="outline"
                        onClick={() => handleUnban(p.user_id)}
                      >
                        Unban
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={() => handleBan(p.user_id)}
                      >
                        Ban
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => resetLives(p.user_id)}
                    >
                      Reset Lives
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => resetScore(p.user_id)}
                    >
                      Reset Score
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal for Editing Powerups */}
      {editingPlayer && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-4 rounded shadow-md w-2/3 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-2">
              Edit Powerups for{" "}
              {editingPlayer.player_name || editingPlayer.user_id}
            </h3>
            <textarea
              className="w-full border p-2 rounded font-mono text-sm h-64"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setEditingPlayer(null)}>
                Cancel
              </Button>
              <Button onClick={savePowerups}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
