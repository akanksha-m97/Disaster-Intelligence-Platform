// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { NotificationProvider } from "./context/NotificationContext.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";

import HomePage from "./pages/HomePage.jsx";
import ReportHazard from "./pages/ReportHazard.jsx";
import LiveMap from "./pages/LiveMap.jsx";
import Analytics from "./pages/Analytics.jsx";
import ReportHistory from "./pages/ReportHistory.jsx";
import EmergencyGuidance from "./pages/EmergencyGuidance.jsx";

// Layout for every page that needs the app chrome (Header + Footer).
const AppLayout = ({ children }) => (
  <>
    <Header />
    {children}
    <Footer />
  </>
);

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          {/* Direct entry point to dashboard */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          <Route
            path="/home"
            element={
              <AppLayout>
                <HomePage />
              </AppLayout>
            }
          />
          <Route
            path="/report-hazard"
            element={
              <AppLayout>
                <ReportHazard />
              </AppLayout>
            }
          />
          <Route
            path="/live-map"
            element={
              <AppLayout>
                <LiveMap />
              </AppLayout>
            }
          />
          <Route
            path="/analytics"
            element={
              <AppLayout>
                <Analytics />
              </AppLayout>
            }
          />
          <Route
            path="/report-history"
            element={
              <AppLayout>
                <ReportHistory />
              </AppLayout>
            }
          />
          <Route
            path="/emergency-guidance"
            element={
              <AppLayout>
                <EmergencyGuidance />
              </AppLayout>
            }
          />

          {/* Catch-all: redirect to home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
