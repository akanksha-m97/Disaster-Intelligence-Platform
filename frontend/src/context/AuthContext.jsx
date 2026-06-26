// src/context/AuthContext.jsx
// Replaces Firebase's onAuthStateChanged / auth.currentUser pattern.
// Since there's no Firebase SDK anymore, "being logged in" just means
// "we have a JWT in localStorage". Swap the storage check for a
// /auth/me call to your FastAPI backend later if you want to verify
// the token is still valid on load, rather than trusting localStorage blindly.

import React, { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));

  const login = useCallback((newToken) => {
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    setToken(null);
  }, []);

  const value = {
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};