// src/admin/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Calendar, Users2, MessageSquare, Trophy,
  DollarSign, Swords, BarChart3, Settings, LogOut, Shield,
} from "lucide-react";

import MainGameQuizManager from "@/admin/MainGameQuizManager";
import WeeklyQuizManager from "@/admin/WeeklyQuizManager";
import MultiplayerQuizManager from "@/admin/MultiplayerQuizManager";
import LeaderboardManager from "@/admin/LeaderboardManager";
import AnalyticsDashboard from "@/admin/AnalyticsDashboard";
import FeedbackManager from "@/admin/FeedbackManager";
import FinanceManager from "@/admin/FinanceManager";
import CompetitionManager from "@/admin/CompetitionManager";
import GlobalSettingsManager from "@/admin/GlobalSettingsManager";

const TABS = [
  { key: "main", label: "Main Quiz", icon: BookOpen, superOnly: false },
  { key: "weekly", label: "Weekly Quiz", icon: Calendar, superOnly: false },
  { key: "multiplayer", label: "Multiplayer Quiz", icon: Users2, superOnly: false },
  { key: "feedback", label: "Feedback", icon: MessageSquare, superOnly: false },
  { key: "leaderboard", label: "Leaderboards", icon: Trophy, superOnly: true },
  { key: "finance", label: "Finance", icon: DollarSign, superOnly: true },
  { key: "competition", label: "Competition", icon: Swords, superOnly: false },
  { key: "analytics", label: "Analytics", icon: BarChart3, superOnly: true },
  { key: "settings", label: "Settings", icon: Settings, superOnly: false },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("main");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("game_users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!error && data?.role) {
        if (data.role === "super_admin") {
          setIsSuperAdmin(true);
          setIsAdmin(true);
        } else if (data.role === "admin") {
          setIsAdmin(true);
        }
      }
      setLoadingRole(false);
    };
    fetchRole();
  }, [user]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "main": return <MainGameQuizManager />;
      case "weekly": return <WeeklyQuizManager />;
      case "multiplayer": return <MultiplayerQuizManager />;
      case "feedback": return <FeedbackManager />;
      case "leaderboard": return isSuperAdmin ? <LeaderboardManager /> : null;
      case "finance": return isSuperAdmin ? <FinanceManager /> : null;
      case "competition": return <CompetitionManager />;
      case "analytics": return isSuperAdmin ? <AnalyticsDashboard /> : null;
      case "settings": return <GlobalSettingsManager />;
      default: return null;
    }
  };

  const handleLogout = async () => {
    // NOTE: this used to just clear a "adminSession" localStorage key from
    // the old (removed) password-based admin login. Admin access is now
    // gated by real Supabase Auth + game_users.role, so logging out means
    // actually signing out of Supabase — otherwise this button did nothing.
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-14 h-14 text-slate-300 mb-4" />
        <h1 className="text-xl font-bold text-slate-700">Admin access required</h1>
        <p className="text-slate-500 mt-1">Your account doesn't have admin permissions.</p>
        <button
          onClick={() => navigate("/map")}
          className="mt-6 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors"
        >
          Back to Map
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-none">Admin Dashboard</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isSuperAdmin ? "Super Admin" : "Admin"} access
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 overflow-x-auto">
          <div className="flex gap-1 py-2">
            {TABS.filter((t) => !t.superOnly || isSuperAdmin).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
