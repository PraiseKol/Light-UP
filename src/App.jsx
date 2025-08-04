// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "lib/supabaseClient";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { AuthProvider, useAuth } from "auth/AuthProvider";

import LoginPage from "pages/LoginPage";
import MapAndGame from "pages/MapAndGame";
import WeeklyChallengeScreen from "pages/WeeklyChallengeScreen";
import CreateMultiplayerGame from "components/CreateMultiplayerGame";
import MultiplayerLobby from "components/MultiplayerLobby";
import JoinMultiplayerGame from "components/JoinMultiplayerGame";
import MultiplayerGame from "./components/MultiplayerGame";

import CreateAdmin from "CreateAdmin";
import AdminRoute from "components/AdminRoute";
import AdminLogin from "pages/AdminLogin";
import AdminDashboard from "pages/AdminDashboard"; // we'll build this later

// Protect routes by checking user state from AuthProvider
function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  if (authLoading) return <div className="text-center p-6">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

// Protect admin routes by checking adminSession in localStorage
function AdminProtectedRoute({ children }) {
  const admin = JSON.parse(localStorage.getItem("adminSession") || "null");
  return admin ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  const supabaseClient = supabase;

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Main Game Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Game Routes */}
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <MapAndGame />
                </ProtectedRoute>
              }
            />

            <Route
              path="/weekly-challenge"
              element={
                <ProtectedRoute>
                  <WeeklyChallengeScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/multiplayer/create"
              element={
                <ProtectedRoute>
                  <CreateMultiplayerGame />
                </ProtectedRoute>
              }
            />

            <Route
              path="/multiplayer/lobby/:gameId"
              element={
                <ProtectedRoute>
                  <MultiplayerLobby />
                </ProtectedRoute>
              }
            />

            <Route
              path="/multiplayer/join/:token"
              element={
                <ProtectedRoute>
                  <JoinMultiplayerGame />
                </ProtectedRoute>
              }
            />

            <Route
              path="/multiplayer/game/:gameId"
              element={
                <ProtectedRoute>
                  <MultiplayerGame />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />

            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* One-time route to create first admin */}
            <Route path="/create-admin" element={<CreateAdmin />} />

            {/* Default route */}
            <Route path="*" element={<Navigate to="/map" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </SessionContextProvider>
  );
}
