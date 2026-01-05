// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";

import BackgroundMusic from "@/components/BackgroundMusic";

import LoginPage from "@/pages/LoginPage";
import MapAndGame from "@/pages/MapAndGame";
import WeeklyChallengeScreen from "@/pages/WeeklyChallengeScreen";
import CreateMultiplayerGame from "@/components/CreateMultiplayerGame";
import MultiplayerLobby from "@/components/MultiplayerLobby";
import JoinMultiplayerGame from "@/components/JoinMultiplayerGame";
import MultiplayerGame from "@/components/MultiplayerGame";

import CreateAdmin from "@/CreateAdmin";
import AdminRoute from "@/components/AdminRoute";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import PaymentSuccess from "@/pages/PaymentSuccess";
import CompetitionPage from "@/pages/CompetitionPage";
import CompetitionViewerPage from "@/pages/CompetitionViewerPage";
import PopGamePage from "@/pages/PopGamePage";
import ScriptureMatchPage from "@/pages/ScriptureMatchPage";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react"; // ✅ Import Vercel Analytics
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";

import { useState, useEffect } from "react";
import { claimDailyStreakBonus } from "@/utils/talentUtils";

// ✅ Create query client once (outside components)
const queryClient = new QueryClient();

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  if (authLoading) return <div className="text-center p-6">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AppContent() {
  const { user } = useAuth();
  const [sound, setSound] = useState("default");
  const [effectsOn, setEffectsOn] = useState(true);

  // Fetch user settings
  useEffect(() => {
    if (!user?.id) {
      setSound("default");
      setEffectsOn(true);
      return;
    }

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("game_users")
        .select("sound, effects_on")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user settings:", error);
        setSound("default");
        setEffectsOn(true);
        return;
      }

      setSound(data?.sound || "default");
      setEffectsOn(data?.effects_on ?? true);
    };

    fetchSettings();
  }, [user?.id]);

  // ✅ Claim daily streak bonus once per login/game load
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const data = await claimDailyStreakBonus(user.id);
        if (data?.bonusApplied) {
          console.log(
            `Daily streak bonus applied! +${data.bonusAmount} talents for ${data.bonusApplied}`
          );
        } else if (data?.message) {
          console.log(`Daily streak info: ${data.message}`);
        }
      } catch (err) {
        console.error("❌ Failed to claim daily streak bonus:", err);
      }
    })();
  }, [user?.id]);

  return (
    <>
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      <BackgroundMusic sound={sound} />
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Payment redirect */}
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Game routes */}
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapAndGame
                sound={sound}
                setSound={setSound}
                effectsOn={effectsOn}
                setEffectsOn={setEffectsOn}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/weekly-challenge"
          element={
            <ProtectedRoute>
              <WeeklyChallengeScreen
                sound={sound}
                setSound={setSound}
                effectsOn={effectsOn}
                setEffectsOn={setEffectsOn}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/multiplayer/create"
          element={
            <ProtectedRoute>
              <CreateMultiplayerGame
                sound={sound}
                setSound={setSound}
                effectsOn={effectsOn}
                setEffectsOn={setEffectsOn}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/multiplayer/lobby/:gameId"
          element={
            <ProtectedRoute>
              <MultiplayerLobby
                sound={sound}
                setSound={setSound}
                effectsOn={effectsOn}
                setEffectsOn={setEffectsOn}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/multiplayer/join/:token"
          element={
            <ProtectedRoute>
              <JoinMultiplayerGame
                sound={sound}
                setSound={setSound}
                effectsOn={effectsOn}
                setEffectsOn={setEffectsOn}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/multiplayer/game/:gameId"
          element={
            <ProtectedRoute>
              <MultiplayerGame
                sound={sound}
                setSound={setSound}
                effectsOn={effectsOn}
                setEffectsOn={setEffectsOn}
              />
            </ProtectedRoute>
          }
        />

        {/* Competition */}
        <Route
          path="/competition"
          element={
            <ProtectedRoute>
              <CompetitionPage effectsOn={effectsOn} />
            </ProtectedRoute>
          }
        />
        <Route path="/competition/view" element={<CompetitionViewerPage />} />
        <Route
          path="/pop-game"
          element={
            <ProtectedRoute>
              <PopGamePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scripture-match"
          element={
            <ProtectedRoute>
              <ScriptureMatchPage effectsOn={effectsOn} />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard
                sound={sound}
                setSound={setSound}
                effectsOn={effectsOn}
                setEffectsOn={setEffectsOn}
              />
            </AdminRoute>
          }
        />
        <Route path="/create-admin" element={<CreateAdmin />} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>

      {/* ✅ Add Vercel Analytics at the root */}
      <Analytics />
    </>
  );
}

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Router>
        <AuthProvider>
          {/* ✅ React Query provider */}
          <QueryClientProvider client={queryClient}>
            <AppContent />
          </QueryClientProvider>
        </AuthProvider>
      </Router>
    </SessionContextProvider>
  );
}
