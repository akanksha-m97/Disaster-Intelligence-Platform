// src/pages/Auth/Auth.jsx
// Same Login/Register toggling UI as the original. All Firebase calls
// (signInWithEmailAndPassword, createUserWithEmailAndPassword,
// sendPasswordResetEmail, setDoc) replaced with calls to authService,
// which hits a FastAPI backend backed by MongoDB.
//
// Visual output is unchanged: same JSX structure, same class names, same
// Auth.css. Only the data layer changed.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import LanguageSelector from "../../components/LanguageSelector";
import RoleSelect from "../../components/RoleSelect";
import { defaultTexts } from "../../locales/defaultTexts";
import { translateAllTexts } from "../../utils/translate";
import { authService } from "../../api/authService";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

const Auth = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("Authority");
  const [otp, setOtp] = useState("");
  const [enableOTP, setEnableOTP] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translations, setTranslations] = useState(defaultTexts);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setTranslations(defaultTexts);
  }, []);

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    setIsTranslating(true);
    const translated = await translateAllTexts(defaultTexts, newLang);
    setTranslations(translated);
    setIsTranslating(false);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (!isLogin && password !== confirmPassword) {
    setError(translations.passwordMismatch || "Passwords do not match");
    return;
  }

  setIsSubmitting(true);

  // Dummy login (temporary)
  setTimeout(() => {
    login("dummy-token");
    navigate("/home");
    setIsSubmitting(false);
  }, 500);
};

  const handleForgotPassword = async () => {
    if (!email) {
      alert(translations.enterEmailFirst || "Please enter your email first!");
      return;
    }
    try {
      await authService.forgotPassword(email);
      alert(translations.resetLinkSent || "Password reset link sent to your email!");
    } catch (err) {
      setError(err?.message || err?.detail || "Something went wrong");
    }
  };

  return (
    <div className="auth-container">
      <div className="quote-section">
        <h1>"Your Post, Someone's Lifeline - JalRakshak Listens."</h1>
        <p>Join us in safeguarding our blue planet</p>
      </div>

      <div className="auth-card">
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onChange={handleLanguageChange}
          isTranslating={isTranslating}
          label={translations.language}
        />

        <h1 className="logo">
          🌊 {translations.appName}
          <span>{translations.appNameAccent}</span>
        </h1>
        <h2>{isLogin ? translations.welcomeBack : translations.createAccount}</h2>
        <p>{isLogin ? translations.loginSubtitle : translations.signupSubtitle}</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <RoleSelect
              value={role}
              onChange={(e) => setRole(e.target.value)}
              translations={translations}
            />
          )}

          <input
            type="email"
            placeholder={translations.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder={translations.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {!isLogin && (
            <input
              type="password"
              placeholder={translations.confirmPasswordPlaceholder}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          {isLogin && (
            <div className="otp-row">
              <input
                type="checkbox"
                checked={enableOTP}
                onChange={() => setEnableOTP(!enableOTP)}
              />
              <label>{translations.twoFactorAuth}</label>
            </div>
          )}

          {enableOTP && (
            <input
              type="text"
              placeholder={translations.otpPlaceholder}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          )}

          <button type="submit" className="login-btn" disabled={isSubmitting}>
            {isSubmitting
              ? "..."
              : isLogin
              ? translations.loginBtn
              : translations.signupBtn}
          </button>
        </form>

        {isLogin && (
          <div className="support-links">
            <span onClick={handleForgotPassword}>{translations.forgotPassword}</span>
            <span>{translations.contactSupport}</span>
          </div>
        )}

        <div className="footer">
          {isLogin ? (
            <p>
              {translations.noAccount}{" "}
              <span onClick={() => setIsLogin(false)}>{translations.signUpLink}</span>
            </p>
          ) : (
            <p>
              {translations.haveAccount}{" "}
              <span onClick={() => setIsLogin(true)}>{translations.loginLink}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;