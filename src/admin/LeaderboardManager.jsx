// src/admin/LeaderboardManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "lib/supabaseClient";
import { Button } from "components/ui/button";
import { useAuth } from "auth/AuthProvider";
import PlayerManager from "admin/PlayerManager"; // ✅ Import PlayerManager

export default function LeaderboardManager() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("main");

  const [mainData, setMainData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [mainBans, setMainBans] = useState([]);
  const [weeklyBans, setWeeklyBans] = useState([]);

  const [mainSearch, setMainSearch] = useState("");
  const [weeklySearch, setWeeklySearch] = useState("");
  const [weeklyFilterWeek, setWeeklyFilterWeek] = useState("");

  const [mainPage, setMainPage] = useState(1);
  const [weeklyPage, setWeeklyPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (role === "super_admin") {
      fetchMainLeaderboard();
      fetchWeeklyLeaderboard();
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

  const fetchMainLeaderboard = async () => {
    const { data } = await supabase
      .from("main_game_leaderboard")
      .select("*")
      .order("total_score", { ascending: false });
    setMainData(data || []);
  };

  const fetchWeeklyLeaderboard = async () => {
    const { data } = await supabase
      .from("weekly_leaderboard")
      .select("*")
      .order("week_start_date", { ascending: false })
      .order("score", { ascending: false });
    setWeeklyData(data || []);
  };

  const fetchBans = async () => {
    const { data: mainBansData = [] } = await supabase
      .from("main_leaderboard_bans")
      .select("*")
      .order("banned_at", { ascending: false });

    const { data: weeklyBansData = [] } = await supabase
      .from("weekly_leaderboard_bans")
      .select("*")
      .order("banned_at", { ascending: false });

    const userIds = [
      ...new Set([
        ...mainBansData.map((b) => b.user_id),
        ...weeklyBansData.map((b) => b.user_id),
      ]),
    ];

    if (userIds.length === 0) {
      setMainBans([]);
      setWeeklyBans([]);
      return;
    }

    const { data: userData = [] } = await supabase
      .from("game_users")
      .select("user_id, player_name")
      .in("user_id", userIds);

    const nameMap = {};
    userData.forEach((u) => {
      nameMap[u.user_id] = u.player_name || "Unknown";
    });

    setMainBans(
      mainBansData.map((b) => ({
        ...b,
        player_name: nameMap[b.user_id] || "Unknown",
      }))
    );

    setWeeklyBans(
      weeklyBansData.map((b) => ({
        ...b,
        player_name: nameMap[b.user_id] || "Unknown",
      }))
    );
  };

  const handleDeleteRow = async (table, id) => {
    if (!window.confirm("Delete this record?")) return;
    await supabase.from(table).delete().eq("id", id);
    table === "main_game_leaderboard"
      ? fetchMainLeaderboard()
      : fetchWeeklyLeaderboard();
  };

  const handleBan = async (banTable, leaderboardTable, row) => {
    if (!window.confirm(`Ban ${row.player_name}? This will remove their score.`)) return;
    await supabase.from(banTable).insert({ user_id: row.user_id });
    await supabase.from(leaderboardTable).delete().eq("user_id", row.user_id);
    await fetchBans();
    leaderboardTable === "main_game_leaderboard"
      ? fetchMainLeaderboard()
      : fetchWeeklyLeaderboard();
  };

  const handleDeleteAll = async (table) => {
    const confirmPhrase = prompt(`Type "burn down" to confirm deleting ALL entries from ${table}:`);
    if (confirmPhrase !== "burn down") return alert("❌ Cancelled.");
    await supabase.from(table).delete();
    table === "main_game_leaderboard"
      ? fetchMainLeaderboard()
      : fetchWeeklyLeaderboard();
  };

  const handleEditScore = async (table, userId, field, value) => {
    await supabase.from(table).update({ [field]: value }).eq("user_id", userId);
    table === "main_game_leaderboard"
      ? fetchMainLeaderboard()
      : fetchWeeklyLeaderboard();
  };

  const handleUnban = async (table, userId) => {
    if (!window.confirm("Unban this player?")) return;
    await supabase.from(table).delete().eq("user_id", userId);
    await fetchBans();
    await fetchMainLeaderboard();
    await fetchWeeklyLeaderboard();
  };

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) =>
        Object.values(row)
          .map((val) => `"${val ?? ""}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const paginate = (data, page) => data.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  if (loading) return <p>Loading...</p>;
  if (role !== "super_admin") return <p className="text-red-500">🚫 Access Denied</p>;

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        <Button variant={activeTab === "main" ? "default" : "outline"} onClick={() => setActiveTab("main")}>
          Main Game Leaderboard
        </Button>
        <Button variant={activeTab === "weekly" ? "default" : "outline"} onClick={() => setActiveTab("weekly")}>
          Weekly Challenge Leaderboard
        </Button>
        <Button variant={activeTab === "bans" ? "default" : "outline"} onClick={() => setActiveTab("bans")}>
          Banned Users
        </Button>
        <Button variant={activeTab === "players" ? "default" : "outline"} onClick={() => setActiveTab("players")}>
          Players
        </Button>
      </div>

      {/* MAIN */}
      {activeTab === "main" && (
        <>
          <div className="flex justify-between mb-2 items-center">
            <h2 className="text-lg font-bold">Main Game Leaderboard ({mainData.length} total)</h2>
            <div className="flex gap-2">
              <input
                placeholder="Search by name or ID"
                value={mainSearch}
                onChange={(e) => setMainSearch(e.target.value)}
                className="border p-1 rounded"
              />
              <Button onClick={() => exportCSV(mainData, "main_game_leaderboard.csv")}>📥 Export CSV</Button>
              <Button variant="destructive" onClick={() => handleDeleteAll("main_game_leaderboard")}>
                🚨 Burn Down All
              </Button>
            </div>
          </div>
          <div className="border rounded p-2">
            {paginate(
              mainData.filter(
                (row) =>
                  row.player_name?.toLowerCase().includes(mainSearch.toLowerCase()) ||
                  row.user_id?.toLowerCase().includes(mainSearch.toLowerCase())
              ),
              mainPage
            ).map((row, idx) => (
              <div key={row.user_id} className="flex justify-between items-center border-b py-2">
                <div>
                  #{(mainPage - 1) * rowsPerPage + idx + 1} {row.player_name} -{" "}
                  <input
                    type="number"
                    value={row.total_score}
                    onChange={(e) =>
                      handleEditScore("main_game_leaderboard", row.user_id, "total_score", e.target.value)
                    }
                    className="border rounded w-20 p-1"
                  />{" "}
                  pts
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => handleDeleteRow("main_game_leaderboard", row.id)}>
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleBan("main_leaderboard_bans", "main_game_leaderboard", row)}
                  >
                    🚫 Ban
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* WEEKLY */}
      {activeTab === "weekly" && (
        <>
          <div className="flex justify-between mb-2 items-center">
            <h2 className="text-lg font-bold">Weekly Challenge Leaderboard ({weeklyData.length} total)</h2>
            <div className="flex gap-2">
              <input
                placeholder="Search by name or ID"
                value={weeklySearch}
                onChange={(e) => setWeeklySearch(e.target.value)}
                className="border p-1 rounded"
              />
              <input
                type="date"
                value={weeklyFilterWeek}
                onChange={(e) => setWeeklyFilterWeek(e.target.value)}
                className="border p-1 rounded"
              />
              <Button onClick={() => exportCSV(weeklyData, "weekly_leaderboard.csv")}>📥 Export CSV</Button>
              <Button variant="destructive" onClick={() => handleDeleteAll("weekly_leaderboard")}>
                🚨 Burn Down All
              </Button>
            </div>
          </div>
          <div className="border rounded p-2">
            {paginate(
              weeklyData.filter(
                (row) =>
                  (weeklySearch
                    ? row.player_name?.toLowerCase().includes(weeklySearch.toLowerCase()) ||
                      row.user_id?.toLowerCase().includes(weeklySearch.toLowerCase())
                    : true) &&
                  (weeklyFilterWeek ? row.week_start_date?.startsWith(weeklyFilterWeek) : true)
              ),
              weeklyPage
            ).map((row, idx) => (
              <div key={row.user_id} className="flex justify-between items-center border-b py-2">
                <div>
                  #{(weeklyPage - 1) * rowsPerPage + idx + 1} {row.player_name} -{" "}
                  <input
                    type="number"
                    value={row.score}
                    onChange={(e) => handleEditScore("weekly_leaderboard", row.user_id, "score", e.target.value)}
                    className="border rounded w-20 p-1"
                  />{" "}
                  pts ({new Date(row.week_start_date).toLocaleDateString()})
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => handleDeleteRow("weekly_leaderboard", row.id)}>
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleBan("weekly_leaderboard_bans", "weekly_leaderboard", row)}
                  >
                    🚫 Ban
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* BANNED USERS */}
      {activeTab === "bans" && (
        <div>
          <h2 className="text-lg font-bold mb-2">Main Game Bans</h2>
          <div className="border rounded p-2 mb-6">
            {mainBans.length === 0 && <p>No banned users.</p>}
            {mainBans.map((row, idx) => (
              <div key={row.user_id} className="flex justify-between items-center border-b py-2">
                <div>
                  #{idx + 1} {row.player_name} (User ID: {row.user_id}) - banned on{" "}
                  {new Date(row.banned_at).toLocaleDateString()}
                </div>
                <Button onClick={() => handleUnban("main_leaderboard_bans", row.user_id)}>Unban</Button>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-bold mb-2">Weekly Challenge Bans</h2>
          <div className="border rounded p-2">
            {weeklyBans.length === 0 && <p>No banned users.</p>}
            {weeklyBans.map((row, idx) => (
              <div key={row.user_id} className="flex justify-between items-center border-b py-2">
                <div>
                  #{idx + 1} {row.player_name} (User ID: {row.user_id}) - banned on{" "}
                  {new Date(row.banned_at).toLocaleDateString()}
                </div>
                <Button onClick={() => handleUnban("weekly_leaderboard_bans", row.user_id)}>Unban</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PLAYERS */}
      {activeTab === "players" && <PlayerManager />}
    </div>
  );
}
