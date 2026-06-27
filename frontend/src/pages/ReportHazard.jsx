import React, { useState, useRef, useEffect } from "react";
import "./ReportHazard.css";

const API_BASE = "http://localhost:8000/api/v1";

// ── AQI helpers ───────────────────────────────────────────────────────────────
const pm25ToAQI = (pm25) => {
  const breaks = [
    [0.0, 12.0, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200], [150.5, 250.4, 201, 300], [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ];
  if (pm25 == null || isNaN(pm25)) return null;
  const C = Math.round(pm25 * 10) / 10;
  for (const [pLo, pHi, aLo, aHi] of breaks) {
    if (C >= pLo && C <= pHi)
      return Math.round(((aHi - aLo) / (pHi - pLo)) * (C - pLo) + aLo);
  }
  return Math.min(500, Math.round((C / 500.4) * 500));
};

const getAqiLabel = (aqi) => {
  if (!aqi) return "—";
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy*";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

const getAqiColor = (aqi) => {
  if (!aqi) return "#9ca3af";
  if (aqi <= 50)  return "#22c55e";
  if (aqi <= 100) return "#f59e0b";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  return "#9333ea";
};

// ── Disaster type config ──────────────────────────────────────────────────────
const DISASTER_CONFIG = {
  Flood: {
    color: "#2563eb",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
        <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" opacity="0.3"/>
        <path d="M5 19c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M5 16c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <circle cx="12" cy="10" r="3" fill="white" opacity="0.9"/>
      </svg>
    ),
  },
  Earthquake: {
    color: "#b45309",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="26" height="26">
        <path d="M2 12h3l2-4 4 8 2-6 2 3 3-1h4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 20h20" strokeLinecap="round"/>
      </svg>
    ),
  },
  Wildfire: {
    color: "#dc2626",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
        <path d="M12 2c0 0-6 5-6 10a6 6 0 0012 0c0-2-1-4-2-5 0 2-1 3-2 3-1 0-2-1-2-3z" opacity="0.9"/>
        <path d="M10 17c0 1.1.9 2 2 2s2-.9 2-2c0-1-1-2-2-3-1 1-2 2-2 3z"/>
      </svg>
    ),
  },
  Cyclone: {
    color: "#7c3aed",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="26" height="26">
        <path d="M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0"/>
        <path d="M12 5a7 7 0 017 7" strokeLinecap="round"/>
        <path d="M12 3a9 9 0 019 9" strokeLinecap="round"/>
        <path d="M5 12a7 7 0 017-7" strokeLinecap="round"/>
        <path d="M3 12a9 9 0 019-9" strokeLinecap="round"/>
        <path d="M12 19a7 7 0 01-7-7" strokeLinecap="round"/>
        <path d="M12 21a9 9 0 01-9-9" strokeLinecap="round"/>
        <path d="M19 12a7 7 0 01-7 7" strokeLinecap="round"/>
      </svg>
    ),
  },
  Landslide: {
    color: "#92400e",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="26" height="26">
        <path d="M3 20l5-8 4 4 3-5 6 9H3z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 6l2 2-8 8" strokeLinecap="round"/>
      </svg>
    ),
  },
  Tsunami: {
    color: "#0369a1",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="26" height="26">
        <path d="M2 14c2-4 5-6 8-4s6 2 8-2" strokeLinecap="round"/>
        <path d="M2 18c2-2 5-3 8-1s6 1 8-1" strokeLinecap="round"/>
        <path d="M8 6c0-3 4-4 6-2" strokeLinecap="round"/>
        <path d="M10 6l6 4" strokeLinecap="round"/>
      </svg>
    ),
  },
  "Chemical Leak": {
    color: "#15803d",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="26" height="26">
        <path d="M9 3h6M10 3v4L6 14a4 4 0 008.5 2M14 3v4l4 7" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="17" r="3" strokeWidth="1.5"/>
      </svg>
    ),
  },
  "Building Collapse": {
    color: "#4b5563",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="26" height="26">
        <path d="M3 21h18M5 21V8l7-5 7 5v13" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 21v-6h6v6M9 11h.01M15 11h.01M12 11h.01" strokeLinecap="round"/>
        <path d="M2 21l5-8M22 21l-5-8" strokeLinecap="round" strokeOpacity="0.6"/>
      </svg>
    ),
  },
};

const DEFAULT_DISASTER_CONFIG = {
  color: "#6b7280",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="26" height="26">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
    </svg>
  ),
};

// ── Severity config ───────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  Low:      { color: "#22c55e", bars: [1, 1, 0, 0], note: "Situation under control" },
  Medium:   { color: "#f97316", bars: [1, 1, 1, 0], note: "Monitor closely" },
  High:     { color: "#ef4444", bars: [1, 1, 1, 1], note: "Immediate action required" },
  Critical: { color: "#7c3aed", bars: [1, 1, 1, 1], note: "Evacuate immediately" },
};

const DEFAULT_SEVERITY_CONFIG = {
  color: "#6b7280", bars: [0, 0, 0, 0], note: "Severity unknown",
};

// ── Component ─────────────────────────────────────────────────────────────────
const ReportHazard = () => {
  const [description, setDescription]       = useState("");
  const [uploadedImage, setUploadedImage]   = useState(null);
  const [imageFile, setImageFile]           = useState(null);
  const [isDragging, setIsDragging]         = useState(false);

  const [submitting, setSubmitting]         = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedId, setSavedId]               = useState(null);
  const [error, setError]                   = useState(null);

  const [liveWeather, setLiveWeather]       = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [coords, setCoords]                 = useState({ lat: 29.9645, lon: 76.8808 });

  const fileInputRef = useRef(null);
  const MAX_CHARS = 500;

  // ── Fetch live weather ────────────────────────────────────────────────────
  const fetchLiveWeather = async (lat, lon) => {
    setWeatherLoading(true);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m&current_weather=true&timezone=auto&forecast_days=1`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&timezone=auto`),
      ]);
      const wJson = await wRes.json();
      const aJson = await aRes.json();
      const cw    = wJson.current_weather || {};
      const aqi   = pm25ToAQI(aJson?.hourly?.pm2_5?.[0]);
      setLiveWeather({
        temperature_c:    cw.temperature    ?? null,
        wind_speed_kmph:  cw.windspeed      ?? null,
        humidity_percent: wJson.hourly?.relativehumidity_2m?.[0] ?? null,
        rainfall_mm:      wJson.hourly?.precipitation?.[0]       ?? null,
        aqi,
      });
      setCoords({ lat, lon });
    } catch {
      setLiveWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords: c }) => fetchLiveWeather(c.latitude, c.longitude),
        () => fetchLiveWeather(29.9645, 76.8808)
      );
    } else {
      fetchLiveWeather(29.9645, 76.8808);
    }
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setUploadedImage(URL.createObjectURL(file)); setImageFile(file); }
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setUploadedImage(URL.createObjectURL(file)); setImageFile(file); }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    setAnalysisResult(null);
    setSavedId(null);

    try {
      const payload = {
       incident_text: description,
  latitude: coords.lat,   // kept if /predict uses it
  longitude: coords.lon,   // kept if /predict uses it
  gps_lat: coords.lat,   // added for save_incident fallback
  gps_lon: coords.lon,   // added for save_incident fallback
        weather: {
          rainfall_mm:      liveWeather?.rainfall_mm      ?? 0,
          humidity_percent: liveWeather?.humidity_percent ?? 0,
          wind_speed_kmph:  liveWeather?.wind_speed_kmph  ?? 0,
          temperature_c:    liveWeather?.temperature_c    ?? 0,
          aqi:              liveWeather?.aqi               ?? 0,
        },
      };

      const res = await fetch(`${API_BASE}/predict`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
      }

      const prediction = await res.json();
      setAnalysisResult(prediction);
      setSavedId(prediction.incident_id);

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const result            = analysisResult;
  const riskScore         = result?.risk_score      ?? 0;
  const confidence        = result?.confidence      ?? 0;
  const severity          = result?.severity        ?? "—";
  const disasterType      = result?.disaster_type   ?? "—";
  const recommendations   = result?.recommendations ?? [];
  const extractedLocation = result?.location?.locations?.join(", ") ?? "—";

  const weather = result
    ? { ...liveWeather, ...result.weather }
    : liveWeather;

  const radius        = 36;
  const circumference = 2 * Math.PI * radius;
  const offset        = circumference - (riskScore / 100) * circumference;

  const disasterCfg = DISASTER_CONFIG[disasterType] ?? DEFAULT_DISASTER_CONFIG;
  const severityCfg = SEVERITY_CONFIG[severity]     ?? DEFAULT_SEVERITY_CONFIG;

  const getRiskColor = (score) => {
    if (score >= 75) return "#7c3aed";
    if (score >= 50) return "#ef4444";
    if (score >= 25) return "#f97316";
    return "#22c55e";
  };
  const riskColor      = getRiskColor(riskScore);
  const riskTrackColor = riskColor + "33";

  const btnLabel = submitting ? "Analyzing…" : savedId ? "Submitted" : "Submit Report";

  return (
    <main className="rh-page">
      <h1 className="rh-title">Report a Hazard</h1>
      <p className="rh-subtitle">
        Describe what you are seeing. Our AI will analyze and save your report automatically.
      </p>

      {/* ── Live weather strip ────────────────────────────────────────────── */}
      <div className="rh-weather-strip">
        {[
          {
            label: "Current Temp",
            value: weatherLoading ? "…" : `${liveWeather?.temperature_c ?? "—"}°C`,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="20" height="20">
                <path d="M12 2a2 2 0 012 2v9.586A4 4 0 1110 17V4a2 2 0 012-2z" strokeLinecap="round"/>
              </svg>
            ),
          },
          {
            label: "AQI",
            value: weatherLoading ? "…" : (liveWeather?.aqi ?? "—"),
            sublabel: !weatherLoading && liveWeather?.aqi ? getAqiLabel(liveWeather.aqi) : null,
            color: !weatherLoading ? getAqiColor(liveWeather?.aqi) : "#9ca3af",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" width="20" height="20">
                <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" strokeLinecap="round"/>
              </svg>
            ),
          },
          {
            label: "Wind Speed",
            value: weatherLoading ? "…" : `${liveWeather?.wind_speed_kmph ?? "—"} km/h`,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" width="20" height="20">
                <path d="M17.7 7.7a2.5 2.5 0 111.8 4.3H2M9.6 4.6A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2" strokeLinecap="round"/>
              </svg>
            ),
          },
          {
            label: "Humidity",
            value: weatherLoading ? "…" : `${liveWeather?.humidity_percent ?? "—"}%`,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" width="20" height="20">
                <path d="M12 2C6 10 4 14 4 16a8 8 0 0016 0c0-2-2-6-8-14z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
          },
          {
            label: "Rainfall",
            value: weatherLoading ? "…" : `${liveWeather?.rainfall_mm ?? "—"} mm`,
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" width="20" height="20">
                <path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 15.25M8 16l-2 6M12 16l-2 6M16 16l-2 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
          },
        ].map(({ label, value, sublabel, color, icon }) => (
          <div key={label} className="rh-ws-item">
            <div className="rh-ws-icon">{icon}</div>
            <div className="rh-ws-body">
              <span className="rh-ws-value" style={color ? { color } : undefined}>{value}</span>
              {sublabel && <span className="rh-ws-sublabel" style={{ color }}>{sublabel}</span>}
              <span className="rh-ws-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Input card ───────────────────────────────────────────────────── */}
      <div className="rh-card rh-input-card">
        <div className="rh-input-row">

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
                disabled={submitting}
              />
              <span className="rh-char-count">{description.length}/{MAX_CHARS}</span>
            </div>
          </div>

          <div className="rh-field rh-field-upload">
            <label className="rh-label">Upload Image (Optional)</label>
            <div
              className={`rh-dropzone ${isDragging ? "rh-dropzone--active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !submitting && fileInputRef.current.click()}
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
                  <p className="rh-upload-hint">JPG, PNG up to 10 MB</p>
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

        {/* ── Location row ──────────────────────────────────────────────── */}
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
            <span>Lat: {coords.lat.toFixed(4)}°</span>
            <span>Long: {coords.lon.toFixed(4)}°</span>
          </div>
          <button
            className="rh-use-location-btn"
            onClick={() => {
              navigator.geolocation?.getCurrentPosition(
                ({ coords: c }) => fetchLiveWeather(c.latitude, c.longitude),
                () => {}
              );
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="8" strokeDasharray="2 2"/>
            </svg>
            Use Current Location
          </button>
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="rh-error-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Progress banner ───────────────────────────────────────────────── */}
      {submitting && (
        <div className="rh-progress-banner">
          <span className="rh-spinner rh-spinner--blue" />
          Analyzing with AI and saving report…
        </div>
      )}

      {/* ── Submit button ─────────────────────────────────────────────────── */}
      <button
        className="rh-analyze-btn"
        onClick={handleSubmit}
        disabled={submitting || !description.trim() || weatherLoading || !!savedId}
      >
        {submitting ? (
          <><span className="rh-spinner" />{btnLabel}</>
        ) : savedId ? (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1 14.5l-4-4 1.41-1.41L11 13.67l5.59-5.58L18 9.5l-7 7z"/>
            </svg>
            {btnLabel}
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2z"/>
              <path d="M19 14l1 2.5 2.5 1-2.5 1L19 21l-1-2.5L15.5 17.5l2.5-1L19 14z"/>
            </svg>
            {btnLabel}
          </>
        )}
      </button>

      {/* ── AI Analysis Result ────────────────────────────────────────────── */}
      {result && (
        <div className="rh-card rh-result-card">
          <div className="rh-result-header-row">
            <div>
              <h2 className="rh-result-title">AI Analysis Result</h2>
              <p className="rh-result-sub">Our AI model has analyzed your report.</p>
            </div>
            {savedId && (
              <div className="rh-saved-pill">
                <svg viewBox="0 0 24 24" fill="#16a34a" width="14" height="14">
                  <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1 14.5l-4-4 1.41-1.41L11 13.67l5.59-5.58L18 9.5l-7 7z"/>
                </svg>
                Saved · ID: {savedId}
              </div>
            )}
          </div>

          {/* ── 4 stat tiles ─────────────────────────────────────────────── */}
          <div className="rh-stats-grid">

            {/* Disaster Type */}
            <div className="rh-stat-tile">
              <p className="rh-stat-label">Disaster Type</p>
              <div className="rh-flood-row">
                <div className="rh-flood-icon" style={{ background: disasterCfg.color }}>
                  {disasterCfg.icon}
                </div>
                <div>
                  <p className="rh-disaster-name">{disasterType}</p>
                  <span className="rh-confidence-badge">
                    Confidence: {Number(confidence).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Severity */}
            <div className="rh-stat-tile">
              <p className="rh-stat-label">Severity</p>
              <div className="rh-severity-row">
                <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
                  {[
                    { x: 2,  y: 14, h: 8  },
                    { x: 8,  y: 10, h: 12 },
                    { x: 14, y: 6,  h: 16 },
                    { x: 20, y: 2,  h: 20 },
                  ].map(({ x, y, h }, i) => (
                    <rect
                      key={i}
                      x={x} y={y} width="4" height={h} rx="1"
                      fill={severityCfg.bars[i] ? severityCfg.color : "#e5e7eb"}
                    />
                  ))}
                </svg>
                <p className="rh-severity-label" style={{ color: severityCfg.color }}>
                  {severity}
                </p>
              </div>
              <p className="rh-severity-note" style={{ color: severityCfg.color }}>
                {severityCfg.note}
              </p>
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
                <p className="rh-ext-loc-text">{extractedLocation}</p>
              </div>
            </div>

            {/* Risk Score */}
            <div className="rh-stat-tile">
              <p className="rh-stat-label">
                Risk Score <span className="rh-info-icon" title="Calculated risk level">ⓘ</span>
              </p>
              <div className="rh-risk-row">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r={radius} fill="none"
                    stroke={riskTrackColor} strokeWidth="8"/>
                  <circle cx="42" cy="42" r={radius} fill="none"
                    stroke={riskColor} strokeWidth="8"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" transform="rotate(-90 42 42)"/>
                </svg>
                <div className="rh-risk-text">
                  <span className="rh-risk-score" style={{ color: riskColor }}>
                    {Math.round(riskScore)}
                  </span>
                  <span className="rh-risk-max">/100</span>
                  <p className="rh-risk-label" style={{ color: riskColor }}>
                    {riskScore >= 75 ? "Very High Risk"
                      : riskScore >= 50 ? "High Risk"
                      : riskScore >= 25 ? "Moderate Risk"
                      : "Low Risk"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom two panels ─────────────────────────────────────────── */}
          <div className="rh-bottom-grid">

            {/* Weather panel */}
            <div className="rh-weather-panel">
              <div className="rh-panel-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" width="18" height="18">
                  <path d="M3 10a6 6 0 1110.89-3M17 18a4 4 0 00-4-4H6a4 4 0 000 8h11a3 3 0 000-6z"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="rh-panel-title">Weather at Time of Report</span>
              </div>
              <div className="rh-weather-grid">
                {[
                  { label: "Temperature", val: `${weather?.temperature_c    ?? "—"} °C`  },
                  { label: "Humidity",    val: `${weather?.humidity_percent ?? "—"} %`    },
                  { label: "Wind Speed",  val: `${weather?.wind_speed_kmph  ?? "—"} km/h` },
                  { label: "Rainfall",    val: `${weather?.rainfall_mm      ?? "—"} mm`   },
                  {
                    label: "AQI",
                    val: weather?.aqi
                      ? `${weather.aqi} (${getAqiLabel(weather.aqi)})`
                      : "—",
                  },
                ].map(({ label, val }) => (
                  <div key={label} className="rh-weather-item">
                    <svg viewBox="0 0 24 24" fill="#3b82f6" width="14" height="14">
                      <circle cx="12" cy="12" r="5"/>
                    </svg>
                    <span className="rh-weather-key">{label}</span>
                    <span className="rh-weather-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations panel */}
            <div className="rh-rec-panel">
              <div className="rh-panel-header">
                <svg viewBox="0 0 24 24" fill="#6b7280" width="18" height="18">
                  <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2z"/>
                </svg>
                <span className="rh-panel-title">AI Recommendations</span>
              </div>
              <ul className="rh-rec-list">
                {recommendations.map((rec, i) => (
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
    </main>
  );
};

export default ReportHazard;