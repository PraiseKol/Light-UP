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

import BackgroundMusic from "components/BackgroundMusic";

import LoginPage from "pages/LoginPage";
import MapAndGame from "pages/MapAndGame";
import WeeklyChallengeScreen from "pages/WeeklyChallengeScreen";
import CreateMultiplayerGame from "components/CreateMultiplayerGame";
import MultiplayerLobby from "components/MultiplayerLobby";
import JoinMultiplayerGame from "components/JoinMultiplayerGame";
import MultiplayerGame from "components/MultiplayerGame";

import CreateAdmin from "CreateAdmin";
import AdminRoute from "components/AdminRoute";
import AdminLogin from "pages/AdminLogin";
import AdminDashboard from "pages/AdminDashboard";
import PaymentSuccess from "pages/PaymentSuccess";

import { useState, useEffect } from "react";

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  if (authLoading) return <div className="text-center p-6">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AppContent() {
  const { user } = useAuth();
  const [sound, setSound] = useState("default");

  useEffect(() => {
    if (!user) {
      setSound("default");
      return;
    }
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("game_users")
        .select("sound")
        .eq("user_id", user.id)
        .single();

      setSound(!error && data?.sound ? data.sound : "default");
    };
    fetchSettings();
  }, [user]);

  return (
    <>
      <BackgroundMusic sound={sound} />
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Payment redirect */}
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Game */}
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapAndGame sound={sound} setSound={setSound} />
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

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="/create-admin" element={<CreateAdmin />} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </SessionContextProvider>
  );
}
