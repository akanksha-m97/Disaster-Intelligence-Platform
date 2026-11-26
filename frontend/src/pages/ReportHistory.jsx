import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./ReportHistory.css";

import {
  FiSearch,
  FiCalendar,
  FiEye,
  FiMapPin,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiRotateCcw,
} from "react-icons/fi";

import {
  FaWater,
  FaCloudRain,
  FaMountain,
  FaWind,
  FaTemperatureHigh,
  FaExclamationTriangle,
  FaFire,
  FaBuilding,
  FaBiohazard,
} from "react-icons/fa";

const DEFAULT_REPORTS = [
  {
    id: "JRK-2024-0524",
    type: "Flood",
    severity: "High",
    risk: 93,
    location: "Sector 17, Kurukshetra",
    date: "31 May 2024, 10:30 AM",
    description:
      "Heavy rainfall since morning. Water entered houses in low-lying areas near Sector 17.",
    recommendations: [
      "Evacuate nearby residents to designated community shelters",
      "Avoid walking or driving through submerged roads",
      "Disconnect main electricity breaker if water enters home",
      "Contact emergency services on 112 for rescue boats",
    ],
  },
  {
    id: "JRK-2024-0523",
    type: "Heavy Rain",
    severity: "Medium",
    risk: 72,
    location: "Pehowa",
    date: "31 May 2024, 08:45 AM",
    description: "Continuous rainfall causing heavy waterlogging on major roads.",
    recommendations: [
      "Drive with extreme caution and keep headlights on",
      "Clear stormwater drains around properties",
      "Stay indoors during peak cloudburst downpours",
    ],
  },
  {
    id: "JRK-2024-0522",
    type: "Landslide",
    severity: "Low",
    risk: 41,
    location: "Yamunanagar",
    date: "30 May 2024, 07:20 PM",
    description: "Minor rockfall and landslide reported on the hill slope.",
    recommendations: [
      "Avoid vulnerable slope zones until geotechnical clearance",
      "Watch for tilting trees or unusual cracking sounds",
    ],
  },
  {
    id: "JRK-2024-0521",
    type: "Storm",
    severity: "Medium",
    risk: 66,
    location: "Thanesar",
    date: "30 May 2024, 05:15 PM",
    description: "Strong gale winds and thunderstorms disrupting local power lines.",
    recommendations: [
      "Secure outdoor furniture, tin roofs, and loose objects",
      "Stay away from tall trees and electrical poles",
      "Keep flashlights and battery backups charged",
    ],
  },
  {
    id: "JRK-2024-0520",
    type: "Flood",
    severity: "High",
    risk: 91,
    location: "Ladwa",
    date: "29 May 2024, 02:10 PM",
    description: "River overflow warning along low-lying agricultural plains.",
    recommendations: [
      "Move livestock and valuables to elevated ground",
      "Follow local district disaster management alerts closely",
    ],
  },
  {
    id: "JRK-2024-0519",
    type: "Heatwave",
    severity: "Low",
    risk: 38,
    location: "Pipli",
    date: "28 May 2024, 01:00 PM",
    description: "Peak afternoon temperature crossed 44°C with dry westerly winds.",
    recommendations: [
      "Stay hydrated with oral rehydration salts and water",
      "Avoid direct sun exposure between 11 AM and 4 PM",
    ],
  },
  {
    id: "JRK-2024-0518",
    type: "Heavy Rain",
    severity: "Medium",
    risk: 63,
    location: "Shahbad Markanda",
    date: "27 May 2024, 11:40 AM",
    description: "Moderate to intense rainfall reported across the sub-division.",
    recommendations: [
      "Avoid parking under aging trees or unreinforced structures",
      "Monitor local drainage outlets",
    ],
  },
];

const getIcon = (type) => {
  const t = (type || "").toLowerCase();
  if (t.includes("flood") || t.includes("tsunami")) return <FaWater />;
  if (t.includes("rain") || t.includes("drizzle")) return <FaCloudRain />;
  if (t.includes("landslide") || t.includes("mountain")) return <FaMountain />;
  if (t.includes("storm") || t.includes("cyclone") || t.includes("wind")) return <FaWind />;
  if (t.includes("heat") || t.includes("temperature")) return <FaTemperatureHigh />;
  if (t.includes("fire")) return <FaFire />;
  if (t.includes("building") || t.includes("collapse")) return <FaBuilding />;
  if (t.includes("chemical") || t.includes("bio")) return <FaBiohazard />;
  return <FaExclamationTriangle />;
};

const ITEMS_PER_PAGE = 7;

const ReportHistory = () => {
  const navigate = useNavigate();

  const [reportsData, setReportsData] = useState(DEFAULT_REPORTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(DEFAULT_REPORTS[0]);
  const [showDetails, setShowDetails] = useState(true);

  // Fetch reports from backend if available, merge with default reports
  useEffect(() => {
    const fetchBackendReports = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/reports?limit=100");
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.incidents) && data.incidents.length > 0) {
          const mapped = data.incidents.map((inc) => {
            let loc = "Unknown Location";
            if (inc.location && typeof inc.location === "object") {
              if (inc.location.locations && inc.location.locations.length > 0) {
                loc = inc.location.locations.join(", ");
              } else if (inc.location.name) {
                loc = inc.location.name;
              } else if (inc.location.lat && inc.location.lon) {
                loc = `${inc.location.lat.toFixed(2)}, ${inc.location.lon.toFixed(2)}`;
              }
            } else if (typeof inc.location === "string" && inc.location) {
              loc = inc.location;
            }

            const dt = inc.created_at ? new Date(inc.created_at) : new Date();
            const formattedDate =
              dt.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }) +
              ", " +
              dt.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

            return {
              id: `RPT-${String(inc._id).slice(-6).toUpperCase()}`,
              _rawId: inc._id,
              type: inc.disaster_type || "Hazard",
              severity: (inc.severity || "Medium").charAt(0).toUpperCase() + (inc.severity || "Medium").slice(1).toLowerCase(),
              risk: Math.round(inc.risk_score || 50),
              location: loc,
              date: formattedDate,
              description: inc.incident_text || "Disaster incident reported.",
              recommendations:
                inc.recommendations && inc.recommendations.length > 0
                  ? inc.recommendations
                  : [
                      "Follow official directives from district administration",
                      "Keep emergency contacts and supplies ready",
                      "Stay away from damaged infrastructure",
                    ],
            };
          });

          // Prepend backend incidents before defaults
          const merged = [...mapped, ...DEFAULT_REPORTS];
          setReportsData(merged);
        }
      } catch {
        // Keep default reports
      }
    };

    fetchBackendReports();
  }, []);

  // Filtered reports computed live based on search query, type, and severity
  const filteredReports = useMemo(() => {
    return reportsData.filter((item) => {
      // 1. Search Query filter (matches location, description, type, ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesLoc = item.location?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesType = item.type?.toLowerCase().includes(q);
        const matchesId = item.id?.toLowerCase().includes(q);
        if (!matchesLoc && !matchesDesc && !matchesType && !matchesId) {
          return false;
        }
      }

      // 2. Disaster Type filter
      if (selectedType !== "All") {
        if (item.type?.toLowerCase() !== selectedType.toLowerCase()) {
          return false;
        }
      }

      // 3. Severity filter
      if (selectedSeverity !== "All") {
        if (item.severity?.toLowerCase() !== selectedSeverity.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [reportsData, searchQuery, selectedType, selectedSeverity]);

  // Keep selected report updated with the filtered list
  useEffect(() => {
    if (filteredReports.length > 0) {
      if (!selected || !filteredReports.some((r) => r.id === selected.id)) {
        setSelected(filteredReports[0]);
      }
    }
  }, [filteredReports, selected]);

  // Pagination calculation
  const totalReports = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(totalReports / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const currentReports = filteredReports.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedType("All");
    setSelectedSeverity("All");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedType !== "All" ||
    selectedSeverity !== "All";

  // Unique disaster types for dropdown
  const disasterTypes = useMemo(() => {
    const types = new Set(["Flood", "Heavy Rain", "Landslide", "Storm", "Heatwave", "Wildfire", "Cyclone", "Earthquake"]);
    reportsData.forEach((r) => {
      if (r.type) types.add(r.type);
    });
    return Array.from(types);
  }, [reportsData]);

  return (
    <main className="report-history">
      {/* Header */}
      <div className="history-header">
        <div>
          <h1>Report History</h1>
          <p>View all the disaster reports you have submitted.</p>
        </div>
      </div>

      {/* Filters & Search Engine */}
      <div className="history-filters">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by location, description, or disaster type..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={handleClearSearch}
              title="Clear search"
            >
              <FiX />
            </button>
          )}
        </div>

        <select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="All">All Disaster Types</option>
          {disasterTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => {
            setSelectedSeverity(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="All">All Severity</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            className="reset-filters-btn"
            onClick={handleResetFilters}
            title="Reset all filters"
          >
            <FiRotateCcw />
            Reset
          </button>
        )}

        <button className="date-btn" title="Filter by date">
          <FiCalendar />
          01 May 2024 - 31 May 2024
        </button>
      </div>

      <div className="history-content">
        {/* Table */}
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Disaster Type</th>
                <th>Severity</th>
                <th>Location</th>
                <th>Reported On</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentReports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-reports-row">
                    <p style={{ fontWeight: 600, color: "#1f2937", marginBottom: 6 }}>
                      No disaster reports found
                    </p>
                    <span style={{ fontSize: 13 }}>
                      No reports match "{searchQuery}". Try a different keyword or reset filters.
                    </span>
                  </td>
                </tr>
              ) : (
                currentReports.map((item) => (
                  <tr
                    key={item.id}
                    className={selected?.id === item.id ? "selected-row" : ""}
                    onClick={() => {
                      setSelected(item);
                      setShowDetails(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontWeight: 600 }}>{item.id}</td>

                    <td className="disaster-cell">
                      <span className="icon-circle">{getIcon(item.type)}</span>
                      {item.type}
                    </td>

                    <td>
                      <span className={`severity ${item.severity.toLowerCase()}`}>
                        {item.severity}
                      </span>
                    </td>

                    <td>
                      <div className="location">
                        <FiMapPin />
                        {item.location}
                      </div>
                    </td>

                    <td>
                      <div className="date">
                        <FiCalendar />
                        {item.date}
                      </div>
                    </td>

                    <td>
                      <button
                        className="view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(item);
                          setShowDetails(true);
                        }}
                        title="View details"
                      >
                        <FiEye />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="table-footer">
            <span>
              {totalReports === 0
                ? "No matching reports"
                : `Showing ${startIndex + 1} to ${Math.min(
                    startIndex + ITEMS_PER_PAGE,
                    totalReports
                  )} of ${totalReports} reports`}
            </span>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={validCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    opacity: validCurrentPage === 1 ? 0.4 : 1,
                    cursor: validCurrentPage === 1 ? "not-allowed" : "pointer",
                  }}
                  title="Previous page"
                >
                  <FiChevronLeft />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    className={validCurrentPage === pg ? "active" : ""}
                    onClick={() => setCurrentPage(pg)}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  disabled={validCurrentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  style={{
                    opacity: validCurrentPage === totalPages ? 0.4 : 1,
                    cursor: validCurrentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                  title="Next page"
                >
                  <FiChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Details Panel */}
        {showDetails && selected && (
          <div className="details-card">
            <div className="details-top">
              <h3>Report Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                title="Hide details"
              >
                ✕
              </button>
            </div>

            <div
              className={`high-tag ${selected.severity.toLowerCase()}`}
            >
              <FaExclamationTriangle />
              {selected.severity} Severity
            </div>

            <div className="detail-row">
              <span>Report ID</span>
              <strong>{selected.id}</strong>
            </div>

            <div className="detail-row">
              <span>Disaster Type</span>
              <strong>{selected.type}</strong>
            </div>

            <div className="detail-row">
              <span>Severity</span>
              <strong>{selected.severity}</strong>
            </div>

            <div className="detail-row">
              <span>Risk Score</span>
              <strong className="risk">{selected.risk}/100</strong>
            </div>

            <div className="detail-row">
              <span>Location</span>
              <strong>{selected.location}</strong>
            </div>

            <div className="detail-row">
              <span>Reported On</span>
              <strong>{selected.date}</strong>
            </div>

            <div className="description">
              <h4>Description</h4>
              <p>{selected.description}</p>
            </div>

            <div className="recommendation">
              <h4>AI Recommendation</h4>
              <ul>
                {selected.recommendations && selected.recommendations.length > 0 ? (
                  selected.recommendations.map((rec, i) => (
                    <li key={i}>✔ {rec}</li>
                  ))
                ) : (
                  <>
                    <li>✔ Evacuate nearby residents to safety</li>
                    <li>✔ Avoid walking or driving in affected areas</li>
                    <li>✔ Follow updates from local disaster authorities</li>
                  </>
                )}
              </ul>
            </div>

            <button
              className="map-btn"
              onClick={() => navigate("/live-map")}
              title="Open Live Map"
            >
              <FiMapPin />
              View on Map
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default ReportHistory;
