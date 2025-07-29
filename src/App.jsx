// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "lib/supabaseClient";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { AuthProvider, useAuth } from "auth/AuthProvider";

import LoginPage from "pages/LoginPage";
import MapAndGame from "pages/MapAndGame";
import WeeklyChallengeScreen from "pages/WeeklyChallengeScreen";

// Protect routes by checking user state from AuthProvider
function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  if (authLoading) return <div className="text-center p-6">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const supabaseClient = supabase;

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

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
    <>
      {console.log("📍 Routed to /weekly-challenge")}
      <ProtectedRoute>
        <WeeklyChallengeScreen />
      </ProtectedRoute>
    </>
  }
/>


            <Route path="*" element={<Navigate to="/map" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </SessionContextProvider>
  );
}
