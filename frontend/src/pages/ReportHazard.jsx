import React, { useState, useRef } from "react";
import "./ReportHazard.css";

const ReportHazard = () => {
  const [description, setDescription] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_CHARS = 500;

  const location = {
    lat: "29.9645° N",
    long: "76.8808° E",
  };

  const analysisResult = {
    disasterType: "Flood",
    confidence: 96,
    severity: "High",
    severityNote: "Immediate action required",
    extractedLocation: "Sector 17, Kurukshetra, Haryana",
    riskScore: 92,
    riskLabel: "Very High Risk",
    weather: {
      rainfall: "120 mm",
      humidity: "92 %",
      windSpeed: "28 km/h",
      temperature: "29 °C",
      aqi: "180",
      aqiLabel: "Moderate",
    },
    recommendations: [
      "Evacuate immediately to safer places.",
      "Avoid walking or driving through flooded areas.",
      "Disconnect electricity to prevent accidents.",
      "Keep emergency kit and medicines ready.",
      "Contact local authorities for assistance.",
    ],
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedImage(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setUploadedImage(URL.createObjectURL(file));
  };

  const handleAnalyze = () => {
    if (description.trim()) setAnalyzed(true);
  };

  // Circular progress for risk score
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (analysisResult.riskScore / 100) * circumference;

  return (
    <main className="rh-page">
      <h1 className="rh-title">Report a Hazard</h1>
      <p className="rh-subtitle">
        Describe what you are seeing. Our AI will analyze and provide insights.
      </p>

      {/* Input Card */}
      <div className="rh-card rh-input-card">
        <div className="rh-input-row">
          {/* Description */}
          <div className="rh-field rh-field-desc">
            <label className="rh-label">
              Describe the Situation <span className="rh-required">*</span>
            </label>
            <div className="rh-textarea-wrap">
              <textarea
                className="rh-textarea"
                placeholder="E.g. Heavy rainfall since morning. Water entered houses near Sector 17. People are trapped and need help."
                maxLength={MAX_CHARS}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="rh-char-count">
                {description.length}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <div className="rh-field rh-field-upload">
            <label className="rh-label">Upload Image (Optional)</label>
            <div
              className={`rh-dropzone ${isDragging ? "rh-dropzone--active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              {uploadedImage ? (
                <img src={uploadedImage} alt="Uploaded" className="rh-uploaded-img" />
              ) : (
                <>
                  <svg className="rh-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20 16.5A3.5 3.5 0 0016.5 20h-9A3.5 3.5 0 004 16.5" strokeLinecap="round"/>
                  </svg>
                  <p className="rh-upload-text">Click to upload or drag &amp; drop</p>
                  <p className="rh-upload-hint">JPG, PNG up to 10MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>

        {/* Location Row */}
        <div className="rh-location-row">
          <div className="rh-location-left">
            <svg className="rh-loc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="8" r="2.5"/>
            </svg>
            <span className="rh-location-label">Location</span>
            <span className="rh-auto-badge">Auto Detected</span>
          </div>
          <div className="rh-location-coords">
            <span>Lat: {location.lat}</span>
            <span>Long: {location.long}</span>
          </div>
          <button className="rh-use-location-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="8" strokeDasharray="2 2"/>
            </svg>
            Use Current Location
          </button>
        </div>
      </div>

      {/* Analyze Button */}
      <button className="rh-analyze-btn" onClick={handleAnalyze}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
          <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2z" fill="currentColor" stroke="none"/>
          <path d="M19 14l1 2.5 2.5 1-2.5 1L19 21l-1-2.5L15.5 17.5l2.5-1L19 14z" fill="currentColor" stroke="none"/>
          <path d="M5 17l.7 1.8 1.8.7-1.8.7L5 22l-.7-1.8L2.5 19.5l1.8-.7L5 17z" fill="currentColor" stroke="none"/>
        </svg>
        Analyze with AI
      </button>

      {/* AI Analysis Result */}
      {analyzed && (
        <div className="rh-card rh-result-card">
          <div className="rh-result-header">
            <h2 className="rh-result-title">AI Analysis Result</h2>
            <p className="rh-result-sub">Our AI model has analyzed your report.</p>
          </div>

          {/* 4 stat tiles */}
          <div className="rh-stats-grid">
            {/* Disaster Type */}
            <div className="rh-stat-tile">
              <p className="rh-stat-label">Disaster Type</p>
              <div className="rh-flood-row">
                <div className="rh-flood-icon">
                  <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
                    <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" opacity="0.3"/>
                    <path d="M12 7v5l3 3" strokeLinecap="round"/>
                    <path d="M5 19c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    <path d="M5 16c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    <circle cx="12" cy="10" r="3" fill="white" opacity="0.9"/>
                  </svg>
                </div>
                <div>
                  <p className="rh-disaster-name">Flood</p>
                  <span className="rh-confidence-badge">Confidence: {analysisResult.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Severity */}
            <div className="rh-stat-tile">
              <p className="rh-stat-label">Severity</p>
              <div className="rh-severity-row">
                <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
                  <rect x="2" y="14" width="4" height="8" rx="1" fill="#f97316"/>
                  <rect x="8" y="10" width="4" height="12" rx="1" fill="#f97316"/>
                  <rect x="14" y="6" width="4" height="16" rx="1" fill="#ef4444"/>
                  <rect x="20" y="2" width="4" height="20" rx="1" fill="#ef4444"/>
                </svg>
                <p className="rh-severity-label">High</p>
              </div>
              <p className="rh-severity-note">{analysisResult.severityNote}</p>
            </div>

            {/* Extracted Location */}
            <div className="rh-stat-tile">
              <p className="rh-stat-label">Extracted Location</p>
              <div className="rh-ext-loc-row">
                <div className="rh-loc-pin">
                  <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                    <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z"/>
                    <circle cx="12" cy="8" r="2.5" fill="#16a34a"/>
                  </svg>
                </div>
                <p className="rh-ext-loc-text">{analysisResult.extractedLocation}</p>
              </div>
            </div>

            {/* Risk Score */}
            <div className="rh-stat-tile">
              <p className="rh-stat-label">
                Risk Score
                <span className="rh-info-icon" title="Calculated risk level">ⓘ</span>
              </p>
              <div className="rh-risk-row">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r={radius} fill="none" stroke="#fee2e2" strokeWidth="8"/>
                  <circle
                    cx="42" cy="42" r={radius}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 42 42)"
                  />
                </svg>
                <div className="rh-risk-text">
                  <span className="rh-risk-score">{analysisResult.riskScore}</span>
                  <span className="rh-risk-max">/100</span>
                  <p className="rh-risk-label">{analysisResult.riskLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom two panels */}
          <div className="rh-bottom-grid">
            {/* Live Weather */}
            <div className="rh-weather-panel">
              <div className="rh-panel-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" width="18" height="18">
                  <path d="M3 10a6 6 0 1110.89-3M17 18a4 4 0 00-4-4H6a4 4 0 000 8h11a3 3 0 000-6z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="rh-panel-title">Live Weather</span>
              </div>
              <div className="rh-weather-grid">
                <div className="rh-weather-item">
                  <svg viewBox="0 0 24 24" fill="#3b82f6" width="16" height="16"><path d="M12 2a2 2 0 012 2v10a4 4 0 11-4 0V4a2 2 0 012-2z"/></svg>
                  <span className="rh-weather-key">Rainfall</span>
                  <span className="rh-weather-val">{analysisResult.weather.rainfall}</span>
                </div>
                <div className="rh-weather-item">
                  <svg viewBox="0 0 24 24" fill="#3b82f6" width="16" height="16"><path d="M12 2a2 2 0 012 2v10a4 4 0 11-4 0V4a2 2 0 012-2z"/></svg>
                  <span className="rh-weather-key">Temperature</span>
                  <span className="rh-weather-val">{analysisResult.weather.temperature}</span>
                </div>
                <div className="rh-weather-item">
                  <svg viewBox="0 0 24 24" fill="#60a5fa" width="16" height="16"><circle cx="12" cy="12" r="5"/></svg>
                  <span className="rh-weather-key">Humidity</span>
                  <span className="rh-weather-val">{analysisResult.weather.humidity}</span>
                </div>
                <div className="rh-weather-item">
                  <span className="rh-aqi-dot"></span>
                  <span className="rh-weather-key">AQI</span>
                  <span className="rh-weather-val">
                    {analysisResult.weather.aqi}{" "}
                    <span className="rh-aqi-label">({analysisResult.weather.aqiLabel})</span>
                  </span>
                </div>
                <div className="rh-weather-item">
                  <svg viewBox="0 0 24 24" fill="#3b82f6" width="16" height="16"><circle cx="12" cy="12" r="4"/></svg>
                  <span className="rh-weather-key">Wind Speed</span>
                  <span className="rh-weather-val">{analysisResult.weather.windSpeed}</span>
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="rh-rec-panel">
              <div className="rh-panel-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" width="18" height="18">
                  <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2z" fill="#6b7280" stroke="none"/>
                </svg>
                <span className="rh-panel-title">AI Recommendations</span>
              </div>
              <ul className="rh-rec-list">
                {analysisResult.recommendations.map((rec, i) => (
                  <li key={i} className="rh-rec-item">
                    <svg viewBox="0 0 24 24" fill="#16a34a" width="18" height="18">
                      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1 14.5l-4-4 1.41-1.41L11 13.67l5.59-5.58L18 9.5l-7 7z"/>
                    </svg>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Save Report */}
      <button className="rh-save-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 21v-8h6v8M9 3v5h6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Save Report
      </button>
    </main>
  );
};

export default ReportHazard;