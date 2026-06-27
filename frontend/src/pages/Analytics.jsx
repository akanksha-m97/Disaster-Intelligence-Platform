import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Analytics.css";

import { FiCalendar, FiFilter, FiDownload, FiX, FiChevronDown } from "react-icons/fi";
import { FaFileAlt, FaExclamationTriangle, FaShieldAlt } from "react-icons/fa";
import { MdWarningAmber } from "react-icons/md";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const REFRESH_INTERVAL_MS = 30_000;

// ── Disaster type color palette ───────────────────────────────────────────────
const TYPE_COLORS = [
  "#2563eb", "#60a5fa", "#f59e0b", "#22c55e",
  "#8b5cf6", "#ef4444", "#06b6d4", "#f97316",
];

const SEVERITY_COLORS = {
  High:   "#ef4444",
  Medium: "#f59e0b",
  Low:    "#22c55e",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(date) {
  return date.toISOString().slice(0, 10);
}

function todayStr() { return fmt(new Date()); }

function thirtyDaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return fmt(d);
}

function buildQuery(filters, extra = {}) {
  const params = new URLSearchParams({
    start_date:    filters.startDate,
    end_date:      filters.endDate,
    time_grouping: filters.timeGrouping,
    ...(filters.disasterType && { disaster_type: filters.disasterType }),
    ...(filters.severity      && { severity:      filters.severity      }),
    ...(filters.location      && { location:      filters.location      }),
    ...extra,
  });
  return params.toString();
}

function downloadCSV(rows) {
  if (!rows || !rows.length) return;
  const headers = [
    "Date", "Disaster Type", "Location", "Severity",
    "Risk Score", "Confidence", "Status", "Latitude", "Longitude", "Description",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.date         ?? "",
        r.disaster_type ?? "",
        r.location     ?? "",
        r.severity     ?? "",
        r.risk_score   ?? "",
        r.confidence   ?? "",
        r.status       ?? "",
        r.lat          ?? "",
        r.lon          ?? "",
        `"${(r.description ?? "").replace(/"/g, '""')}"`,
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "analytics_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Filter Panel ──────────────────────────────────────────────────────────────
function FilterPanel({ filters, meta, onChange, onClose }) {
  const [local, setLocal] = useState({ ...filters });

  const set = (k, v) => setLocal((p) => ({ ...p, [k]: v }));

  function apply() {
    onChange(local);
    onClose();
  }

  function reset() {
    const fresh = {
      startDate:    thirtyDaysAgoStr(),
      endDate:      todayStr(),
      disasterType: "",
      severity:     "",
      location:     "",
      timeGrouping: "daily",
    };
    setLocal(fresh);
    onChange(fresh);
    onClose();
  }

  return (
    <div className="filter-overlay" onClick={onClose}>
      <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
        <div className="filter-header">
          <h4>Filters</h4>
          <button onClick={onClose}><FiX /></button>
        </div>

        <label>Start Date
          <input type="date" value={local.startDate}
            onChange={(e) => set("startDate", e.target.value)} />
        </label>

        <label>End Date
          <input type="date" value={local.endDate}
            onChange={(e) => set("endDate", e.target.value)} />
        </label>

        <label>Disaster Type
          <select value={local.disasterType} onChange={(e) => set("disasterType", e.target.value)}>
            <option value="">All</option>
            {(meta.disasterTypes || []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label>Severity
          <select value={local.severity} onChange={(e) => set("severity", e.target.value)}>
            <option value="">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>

        <label>Location
          <input type="text" placeholder="e.g. Pehowa"
            value={local.location}
            onChange={(e) => set("location", e.target.value)} />
        </label>

        <div className="filter-actions">
          <button className="btn-secondary" onClick={reset}>Reset</button>
          <button className="btn-primary"   onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
      <p style={{ fontSize: 15 }}>{message || "No data available."}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const Analytics = () => {
  const defaultFilters = {
    startDate:    thirtyDaysAgoStr(),
    endDate:      todayStr(),
    disasterType: "",
    severity:     "",
    location:     "",
    timeGrouping: "daily",
  };

  const [filters,     setFilters]     = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [data,        setData]        = useState(null);
  const [meta,        setMeta]        = useState({ disasterTypes: [] });
  const timerRef = useRef(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (f) => {
    try {
      setError(null);
      const qs  = buildQuery(f);
      const res = await fetch(`${API_BASE}/analytics/dashboard?${qs}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setData(json);

      // Build distinct disaster types for filter dropdown
      const types = (json.disaster_type_distribution || []).map((d) => d.disaster_type).filter(Boolean);
      setMeta((m) => ({ ...m, disasterTypes: types }));
    } catch (err) {
      setError(err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData(filters);

    timerRef.current = setInterval(() => fetchData(filters), REFRESH_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [filters, fetchData]);

  // ── CSV download via dedicated endpoint ──────────────────────────────────
  async function handleDownload() {
    try {
      const qs  = buildQuery(filters, { limit: 10000 });
      const res = await fetch(`${API_BASE}/analytics/export?${qs}`);
      if (!res.ok) throw new Error("Export failed");
      const rows = await res.json();
      downloadCSV(rows);
    } catch {
      // Fallback: use recent_summary from current data
      downloadCSV(data?.recent_summary || []);
    }
  }

  // ── Derived chart data ────────────────────────────────────────────────────
  const lineChartData = (data?.reports_over_time || []).map((d) => ({
    day:     d.date,
    reports: d.count,
  }));

  const disasterChartData = (data?.disaster_type_distribution || []).map((d, i) => ({
    name:  d.disaster_type,
    value: d.count,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }));

  const severityChartData = Object.entries(SEVERITY_COLORS).map(([name, color]) => ({
    name,
    value: data?.severity_breakdown?.[name.toLowerCase()] ?? 0,
    color,
  }));

  const dateLabel = `${filters.startDate} – ${filters.endDate}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="analytics-page">

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          meta={meta}
          onChange={(f) => { setFilters(f); }}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1>Analytics</h1>
          <p>Understand disaster trends and insights from reports.</p>
        </div>

        <div className="analytics-actions">
          <button>
            <FiCalendar />
            {dateLabel}
          </button>
          <button onClick={() => setShowFilters(true)}>
            <FiFilter />
            Filters
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: "#fee2e2", color: "#dc2626", padding: "14px 20px",
          borderRadius: 10, marginBottom: 20, fontSize: 14,
        }}>
          ⚠ {error} — <button style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 600 }}
            onClick={() => fetchData(filters)}>Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="icon blue"><FaFileAlt /></div>
          <div>
            <span>Total Reports</span>
            <h2>{loading ? "—" : (data?.total_reports ?? 0)}</h2>
            <small className="green">
              {data?.change?.total != null
                ? `${data.change.total >= 0 ? "↑" : "↓"} ${Math.abs(data.change.total)}% from prev period`
                : "\u00a0"}
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="icon red"><FaExclamationTriangle /></div>
          <div>
            <span>High Severity</span>
            <h2>{loading ? "—" : (data?.severity_breakdown?.high ?? 0)}</h2>
            <small className="red-text">&nbsp;</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="icon orange"><MdWarningAmber /></div>
          <div>
            <span>Medium Severity</span>
            <h2>{loading ? "—" : (data?.severity_breakdown?.medium ?? 0)}</h2>
            <small className="orange-text">&nbsp;</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="icon green"><FaShieldAlt /></div>
          <div>
            <span>Low Severity</span>
            <h2>{loading ? "—" : (data?.severity_breakdown?.low ?? 0)}</h2>
            <small className="green">&nbsp;</small>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">

        {/* Reports Over Time */}
        <div className="chart-card">
          <div className="card-head">
            <h3>Reports Over Time</h3>
            <select
              value={filters.timeGrouping}
              onChange={(e) => setFilters((f) => ({ ...f, timeGrouping: e.target.value }))}
              style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {loading ? <EmptyState message="Loading…" /> : lineChartData.length === 0
            ? <EmptyState message="No data for this period." />
            : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="reports" stroke="#2563eb" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Reports by Disaster Type */}
        <div className="chart-card">
          <h3>Reports by Disaster Type</h3>
          {loading ? <EmptyState message="Loading…" /> : disasterChartData.length === 0
            ? <EmptyState message="No disaster data." />
            : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={disasterChartData} dataKey="value" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {disasterChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Reports by Severity */}
        <div className="chart-card">
          <h3>Reports by Severity</h3>
          {loading ? <EmptyState message="Loading…" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={severityChartData}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={90}
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                    if (!value) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
                        {value}
                      </text>
                    );
                  }}
                >
                  {severityChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => (
                    <span style={{ fontSize: 13, color: "#374151" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-grid">

        {/* Top Areas */}
        <div className="table-card">
          <h3>Top Affected Areas</h3>
          {loading ? <EmptyState message="Loading…" /> : !(data?.top_affected_areas?.length)
            ? <EmptyState message="No area data." />
            : (
              <table>
                <thead>
                  <tr>
                    <th>Area</th>
                    <th>Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_affected_areas.map((row, i) => (
                    <tr key={i}>
                      <td>{row.area}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* Recent Reports */}
        <div className="table-card wide">
          <h3>Recent Reports Summary</h3>
          {loading ? <EmptyState message="Loading…" /> : !(data?.recent_summary?.length)
            ? <EmptyState message="No recent reports." />
            : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Disaster</th>
                    <th>Location</th>
                    <th>Severity</th>
                    <th>Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_summary.map((r, i) => (
                    <tr key={i}>
                      <td>{r.date}</td>
                      <td>{r.disaster_type}</td>
                      <td>{r.location}</td>
                      <td>
                        <span className={`badge ${r.severity?.toLowerCase()}`}>
                          {r.severity}
                        </span>
                      </td>
                      <td>{r.risk_score != null ? Number(r.risk_score).toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {/* Download Button */}
      <div className="download-section">
        <button className="download-btn" onClick={handleDownload}>
          <FiDownload />
          Download Report (CSV)
        </button>
      </div>

      {/* Inline filter panel styles — appended to avoid modifying Analytics.css */}
      <style>{`
        .filter-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:999;display:flex;align-items:flex-start;justify-content:flex-end;}
        .filter-panel{background:#fff;width:320px;min-height:100vh;padding:28px 24px;display:flex;flex-direction:column;gap:18px;box-shadow:-4px 0 30px rgba(0,0,0,.12);}
        .filter-header{display:flex;justify-content:space-between;align-items:center;}
        .filter-header h4{font-size:18px;font-weight:700;color:#111827;}
        .filter-header button{background:none;border:none;cursor:pointer;font-size:20px;color:#6b7280;}
        .filter-panel label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#374151;}
        .filter-panel input,.filter-panel select{padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;outline:none;}
        .filter-panel input:focus,.filter-panel select:focus{border-color:#2563eb;}
        .filter-actions{display:flex;gap:12px;margin-top:auto;}
        .btn-primary{flex:1;background:#2563eb;color:#fff;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;}
        .btn-primary:hover{background:#1d4ed8;}
        .btn-secondary{flex:1;background:#f3f4f6;color:#374151;border:none;padding:12px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;}
        .btn-secondary:hover{background:#e5e7eb;}
      `}</style>
    </main>
  );
};

export default Analytics;