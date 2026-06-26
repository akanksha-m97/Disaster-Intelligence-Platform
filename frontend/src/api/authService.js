// src/api/authService.js
// Replaces firebase/auth calls (signInWithEmailAndPassword,
// createUserWithEmailAndPassword, sendPasswordResetEmail) with REST calls
// to a FastAPI backend. Adjust the paths below to match your actual
// FastAPI route names once the backend exists — these are the
// conventional REST shapes for a JWT + MongoDB auth setup.
//
// Expected backend contract:
//   POST /auth/register   { email, password, role }        -> { token, user }
//   POST /auth/login      { email, password, otp? }         -> { token, user }
//   POST /auth/forgot-password { email }                    -> { message }

import api from "./client";

export const authService = {
  login: async ({ email, password, otp }) => {
    const payload = { email, password };
    if (otp) payload.otp = otp;
    const data = await api.post("/auth/login", payload);
    if (data?.token) {
      localStorage.setItem("authToken", data.token);
    }
    return data;
  },

  register: async ({ email, password, role }) => {
    const data = await api.post("/auth/register", { email, password, role });
    if (data?.token) {
      localStorage.setItem("authToken", data.token);
    }
    return data;
  },

  forgotPassword: async (email) => {
    return api.post("/auth/forgot-password", { email });
  },

  logout: () => {
    localStorage.removeItem("authToken");
  },
};

export default authService;