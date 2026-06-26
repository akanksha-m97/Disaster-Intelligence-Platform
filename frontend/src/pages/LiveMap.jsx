import React, { useEffect, useRef, useState } from "react";
import "./LiveMap.css";
import {
  FiFilter, FiChevronDown, FiRefreshCw,
  FiPlus, FiMinus, FiCrosshair, FiX, FiExternalLink
} from "react-icons/fi";
import { FaWater, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

// Sample incident data — replace with API call later
const INCIDENTS = [
  {
    id: "INC-1045",
    type: "Flood",
    severity: "High",
    risk_score: 94,
    confidence: 96,
    location: "Sector 17, Kurukshetra",
    lat: 29.9695,
    lon: 76.8783,
    reported: "2 minutes ago",
    status: "Active",
  },
  {
    id: "INC-1044",
    type: "Water Logging",
    severity: "Medium",
    risk_score: 58,
    confidence: 88,
    location: "Pehowa, Kurukshetra",
    lat: 29.9822,
    lon: 76.5762,
    reported: "30 minutes ago",
    status: "Active",
  },
  {
    id: "INC-1043",
    type: "Landslide Warning",
    severity: "Medium",
    risk_score: 62,
    confidence: 79,
    location: "Yamunanagar",
    lat: 30.1290,
    lon: 77.2674,
    reported: "5 hours ago",
    status: "Active",
  },
  {
    id: "INC-1042",
    type: "Incident Resolved",
    severity: "Low",
    risk_score: 18,
    confidence: 91,
    location: "Ladwa",
    lat: 29.9980,
    lon: 77.0440,
    reported: "3 hours ago",
    status: "Resolved",
  },
];

const SEVERITY_FILTERS = ["All Severity", "High", "Medium", "Low"];
const TYPE_FILTERS     = ["All Hazards", "Flood", "Landslide", "Water Logging"];

const markerColor = (severity) => {
  if (severity === "High")   return "#ef4444";
  if (severity === "Medium") return "#f59e0b";
  return "#22c55e";
};

const LiveMap = () => {
  const mapRef        = useRef(null);
  const leafletMap    = useRef(null);
  const markersRef    = useRef([]);

  const [selected,       setSelected]       = useState(INCIDENTS[0]);
  const [severityFilter, setSeverityFilter] = useState("All Severity");
  const [typeFilter,     setTypeFilter]     = useState("All Hazards");
  const [lastUpdated,    setLastUpdated]    = useState("Just now");

  // ── Load Leaflet dynamically ──────────────────────────────────────────────
  useEffect(() => {
    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link  = document.createElement("link");
      link.id     = "leaflet-css";
      link.rel    = "stylesheet";
      link.href   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject Leaflet JS
    const script  = document.createElement("script");
    script.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async  = true;
    script.onload = () => initMap();
    document.head.appendChild(script);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (leafletMap.current || !mapRef.current) return;

    const L   = window.L;
    const map = L.map(mapRef.current, {
      center:    [29.9695, 76.8783],
      zoom:      10,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    leafletMap.current = map;
    addMarkers(INCIDENTS);
  };

  const addMarkers = (incidents) => {
    const L = window.L;
    if (!L || !leafletMap.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    incidents.forEach((inc) => {
      const color  = markerColor(inc.severity);
      const icon   = L.divIcon({
        className: "",
        html: `
          <div style="
            width:42px;height:42px;border-radius:50%;
            background:${color};color:#fff;
            display:flex;align-items:center;justify-content:center;
            font-weight:700;font-size:13px;
            box-shadow:0 4px 14px rgba(0,0,0,0.25);
            border:3px solid #fff;
            cursor:pointer;
          ">
            ${inc.severity === "High" ? "!" : inc.severity === "Medium" ? "~" : "✓"}
          </div>`,
        iconSize:   [42, 42],
        iconAnchor: [21, 21],
      });

      const marker = L.marker([inc.lat, inc.lon], { icon })
        .addTo(leafletMap.current)
        .bindPopup(`
          <div style="min-width:180px;font-family:sans-serif;">
            <strong style="color:#111">${inc.type}</strong><br/>
            <span style="color:#6b7280;font-size:13px">${inc.location}</span><br/>
            <span style="color:${color};font-weight:600;font-size:13px">
              ${inc.severity} Severity
            </span><br/>
            <span style="font-size:13px">Risk Score: <strong>${inc.risk_score}/100</strong></span>
          </div>
        `)
        .on("click", () => setSelected(inc));

      markersRef.current.push(marker);
    });
  };

  // ── Filter incidents ──────────────────────────────────────────────────────
  const filtered = INCIDENTS.filter((inc) => {
    const bySeverity = severityFilter === "All Severity" || inc.severity === severityFilter;
    const byType     = typeFilter === "All Hazards"     || inc.type === typeFilter;
    return bySeverity && byType;
  });

  useEffect(() => {
    if (window.L && leafletMap.current) addMarkers(filtered);
  }, [severityFilter, typeFilter]);

  // ── Map controls ──────────────────────────────────────────────────────────
  const zoomIn  = () => leafletMap.current?.zoomIn();
  const zoomOut = () => leafletMap.current?.zoomOut();
  const locate  = () => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      leafletMap.current?.setView([coords.latitude, coords.longitude], 13);
    });
  };

  const refresh = () => {
    setLastUpdated("Just now");
    if (window.L && leafletMap.current) addMarkers(filtered);
  };

  // ── Alert icon helper ─────────────────────────────────────────────────────
  const alertIcon = (inc) => {
    if (inc.severity === "High")   return <FaWater className="red-icon" />;
    if (inc.severity === "Medium") return <FaExclamationTriangle className="orange-icon" />;
    return <FaCheckCircle className="green-icon" />;
  };

  return (
    <main className="live-map-page">

      {/* Header */}
      <div className="live-header">
        <div>
          <h1>📍 Live Map</h1>
          <p>Real-time overview of hazards and affected areas.</p>
        </div>
        <span className="updated" onClick={refresh} style={{ cursor: "pointer" }}>
          Last Updated: {lastUpdated}
          <FiRefreshCw />
        </span>
      </div>

      <div className="live-layout">

        {/* LEFT */}
        <div className="map-section">

          {/* Filters */}
          <div className="map-filters">
            <div className="filter-select">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {TYPE_FILTERS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <FiChevronDown className="select-icon" />
            </div>

            <div className="filter-select">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                {SEVERITY_FILTERS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <FiChevronDown className="select-icon" />
            </div>

            <button className="filter-btn">
              <FiFilter /> Filters
            </button>
          </div>

          {/* Map */}
          <div className="map-container">
            <div ref={mapRef} className="leaflet-map" />

            {/* Controls */}
            <div className="map-controls">
              <button onClick={locate}  title="My Location"><FiCrosshair /></button>
              <button onClick={zoomIn}  title="Zoom In"><FiPlus /></button>
              <button onClick={zoomOut} title="Zoom Out"><FiMinus /></button>
            </div>

            {/* Legend */}
            <div className="legend">
              <span><i className="red"></i>High Severity</span>
              <span><i className="orange"></i>Medium Severity</span>
              <span><i className="green"></i>Low Severity</span>
              <span><i className="blue"></i>Your Location</span>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="alerts-card">
            <div className="alerts-head">
              <h3>Recent Alerts</h3>
              <a href="/">View All</a>
            </div>
            <div className="alerts-table-wrap">
              <table>
                <tbody>
                  {INCIDENTS.map((inc) => (
                    <tr
                      key={inc.id}
                      onClick={() => setSelected(inc)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{alertIcon(inc)}{inc.type}</td>
                      <td>{inc.location}</td>
                      <td>{inc.reported}</td>
                      <td>
                        <span className={`badge ${inc.severity.toLowerCase()}`}>
                          {inc.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL */}
        {selected && (
          <aside className="incident-card">
            <div className="incident-head">
              <h2>Incident Details</h2>
              <FiX onClick={() => setSelected(null)} />
            </div>

            <span className={`severity-pill ${selected.severity.toLowerCase()}`}>
              {selected.severity} Severity
            </span>

            <div className="incident-title">
              <FaWater />
              <h3>{selected.type}</h3>
            </div>

            <div className="detail">
              <span>Location</span>
              <strong>{selected.location}</strong>
            </div>
            <div className="detail">
              <span>Reported</span>
              <strong>{selected.reported}</strong>
            </div>
            <div className="detail">
              <span>Risk Score</span>
              <strong className="risk">{selected.risk_score}/100</strong>
            </div>
            <div className="detail">
              <span>Status</span>
              <strong>{selected.status}</strong>
            </div>
            <div className="detail">
              <span>Confidence</span>
              <strong>{selected.confidence}%</strong>
            </div>

            <hr />

            <h4>Additional Info</h4>
            <div className="detail">
              <span>Incident ID</span>
              <strong>{selected.id}</strong>
            </div>
            <div className="detail">
              <span>Source</span>
              <strong>User Report</strong>
            </div>

            <button className="report-btn">
              <FiExternalLink />
              View Full Report
            </button>
          </aside>
        )}

      </div>
    </main>
  );
};

export default LiveMap;