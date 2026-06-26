// src/components/ProtectedRoute.jsx
// Wraps any route element. If there's no auth token, the user is sent
// back to "/" (Auth) instead of seeing the protected page.
//
// Usage in App.jsx:
//   <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;