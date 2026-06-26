// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";

import Auth from "./pages/Auth/Auth.jsx";
import HomePage from "./pages/HomePage.jsx";
import ReportHazard from "./pages/ReportHazard.jsx";
import LiveMap from "./pages/LiveMap.jsx";
import Analytics from "./pages/Analytics.jsx";
import ReportHistory from "./pages/ReportHistory.jsx";
import EmergencyGuidance from "./pages/EmergencyGuidance.jsx";

// Layout for every page that needs the app chrome (Header + Footer).
// Auth does NOT use this -- it's a standalone full-screen page.
const AppLayout = ({ children }) => (
  <>
    <Header />
    {children}
    <Footer />
  </>
);

// Route paths -- must match Header.jsx's NAV_ITEMS paths exactly, since
// Header highlights the active link based on these.
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public: login/register, the entry point of the app */}
          <Route path="/" element={<Auth />} />

          {/* Protected: everything past login, wrapped in Header/Footer */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <HomePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-hazard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ReportHazard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-map"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <LiveMap />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Analytics />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-history"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ReportHistory />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergency-guidance"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <EmergencyGuidance />
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;