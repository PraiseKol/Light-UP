// src/admin/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";

import MainGameQuizManager from "@/admin/MainGameQuizManager";
import WeeklyQuizManager from "@/admin/WeeklyQuizManager";
import MultiplayerQuizManager from "@/admin/MultiplayerQuizManager";
import LeaderboardManager from "@/admin/LeaderboardManager";
import AnalyticsDashboard from "@/admin/AnalyticsDashboard";
import FeedbackManager from "@/admin/FeedbackManager";
import FinanceManager from "@/admin/FinanceManager";



export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("main");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("game_users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!error && data?.role === "super_admin") {
        setIsSuperAdmin(true);
      }
    };
    fetchRole();
  }, [user]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "main":
        return <MainGameQuizManager />;
      case "weekly":
        return <WeeklyQuizManager />;
      case "multiplayer":
        return <MultiplayerQuizManager />;
      case "feedback":
        return isSuperAdmin ? <FeedbackManager /> : null
      case "leaderboard":
        return isSuperAdmin ? <LeaderboardManager /> : null;
        case "finance":
        return isSuperAdmin ? <FinanceManager /> : null;
      case "analytics":
        return isSuperAdmin ? <AnalyticsDashboard /> : null;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminSession");
    window.location.href = "/map";
  };

  const tabButton = (key, label, show = true) =>
    show && (
      <button
        key={key}
        className={`flex-1 px-4 py-2 font-medium text-center transition ${
          activeTab === key
            ? "bg-white border-b-2 border-blue-500"
            : "hover:bg-gray-200"
        }`}
        onClick={() => setActiveTab(key)}
      >
        {label}
      </button>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white shadow rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h1 className="text-xl font-bold">🛠 Admin Dashboard</h1>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-100 flex-wrap">
          {tabButton("main", "Main Game Quiz")}
          {tabButton("weekly", "Weekly Quiz")}
          {tabButton("multiplayer", "Multiplayer Quiz")}
          {tabButton("feedback", "Feedback", isSuperAdmin)}
          {tabButton("leaderboard", "Leaderboards", isSuperAdmin)}
          {tabButton("finance", "Finance", isSuperAdmin)}
          {tabButton("analytics", "Analytics", isSuperAdmin)}
        </div>

        {/* Tab Content */}
        <div>{renderTabContent()}</div>
      </div>
    </div>
  );
}
