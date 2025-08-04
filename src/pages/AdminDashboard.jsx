// src/admin/AdminDashboard.jsx
import { useState } from "react";
import { Button } from "components/ui/button";

import MainGameQuizManager from "admin/MainGameQuizManager";
import WeeklyQuizManager from "admin/WeeklyQuizManager";
import MultiplayerQuizManager from "admin/MultiplayerQuizManager";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("main");

  const renderTabContent = () => {
    switch (activeTab) {
      case "main":
        return <MainGameQuizManager />;
      case "weekly":
        return <WeeklyQuizManager />;
      case "multiplayer":
        return <MultiplayerQuizManager />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminSession");
    window.location.href = "/map";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow rounded-lg overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h1 className="text-xl font-bold">🛠 Admin Dashboard</h1>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-100">
          <button
            className={`flex-1 px-4 py-2 font-medium text-center transition ${
              activeTab === "main"
                ? "bg-white border-b-2 border-blue-500"
                : "hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("main")}
          >
            Main Game Quiz
          </button>
          <button
            className={`flex-1 px-4 py-2 font-medium text-center transition ${
              activeTab === "weekly"
                ? "bg-white border-b-2 border-blue-500"
                : "hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("weekly")}
          >
            Weekly Quiz
          </button>
          <button
            className={`flex-1 px-4 py-2 font-medium text-center transition ${
              activeTab === "multiplayer"
                ? "bg-white border-b-2 border-blue-500"
                : "hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("multiplayer")}
          >
            Multiplayer Quiz
          </button>
        </div>

        {/* Tab Content */}
        <div>{renderTabContent()}</div>
      </div>
    </div>
  );
}
