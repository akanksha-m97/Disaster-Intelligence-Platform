import React, { useState } from "react";
import "./ReportHistory.css";

import {
  FiSearch,
  FiCalendar,
  FiEye,
  FiMapPin,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

import {
  FaWater,
  FaCloudRain,
  FaMountain,
  FaWind,
  FaTemperatureHigh,
  FaExclamationTriangle,
} from "react-icons/fa";

const reports = [
  {
    id: "JRK-2024-0524",
    type: "Flood",
    severity: "High",
    risk: 93,
    location: "Sector 17, Kurukshetra",
    date: "31 May 2024, 10:30 AM",
    description:
      "Heavy rainfall since morning. Water entered houses in low-lying areas near Sector 17.",
  },
  {
    id: "JRK-2024-0523",
    type: "Heavy Rain",
    severity: "Medium",
    risk: 72,
    location: "Pehowa",
    date: "31 May 2024, 08:45 AM",
    description: "Continuous rainfall causing waterlogging.",
  },
  {
    id: "JRK-2024-0522",
    type: "Landslide",
    severity: "Low",
    risk: 41,
    location: "Yamunanagar",
    date: "30 May 2024, 07:20 PM",
    description: "Minor landslide reported.",
  },
  {
    id: "JRK-2024-0521",
    type: "Storm",
    severity: "Medium",
    risk: 66,
    location: "Thanesar",
    date: "30 May 2024, 05:15 PM",
    description: "Strong winds and thunderstorms.",
  },
  {
    id: "JRK-2024-0520",
    type: "Flood",
    severity: "High",
    risk: 91,
    location: "Ladwa",
    date: "29 May 2024, 02:10 PM",
    description: "River overflow warning.",
  },
  {
    id: "JRK-2024-0519",
    type: "Heatwave",
    severity: "Low",
    risk: 38,
    location: "Pipli",
    date: "28 May 2024, 01:00 PM",
    description: "Temperature crossed 44°C.",
  },
  {
    id: "JRK-2024-0518",
    type: "Heavy Rain",
    severity: "Medium",
    risk: 63,
    location: "Shahbad Markanda",
    date: "27 May 2024, 11:40 AM",
    description: "Moderate rainfall.",
  },
];

const getIcon = (type) => {
  switch (type) {
    case "Flood":
      return <FaWater />;
    case "Heavy Rain":
      return <FaCloudRain />;
    case "Landslide":
      return <FaMountain />;
    case "Storm":
      return <FaWind />;
    case "Heatwave":
      return <FaTemperatureHigh />;
    default:
      return <FaExclamationTriangle />;
  }
};

const ReportHistory = () => {
  const [selected, setSelected] = useState(reports[0]);

  return (
    <main className="report-history">

      {/* Header */}

      <div className="history-header">
        <div>
          <h1>Report History</h1>
          <p>View all the disaster reports you have submitted.</p>
        </div>
      </div>

      {/* Filters */}

      <div className="history-filters">

        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by location or description..."
          />
        </div>

        <select>
          <option>All Disaster Types</option>
        </select>

        <select>
          <option>All Severity</option>
        </select>

        <button className="date-btn">
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

              {reports.map((item) => (
                <tr key={item.id}>

                  <td>{item.id}</td>

                  <td className="disaster-cell">
                    <span className="icon-circle">
                      {getIcon(item.type)}
                    </span>
                    {item.type}
                  </td>

                  <td>
                    <span
                      className={`severity ${item.severity.toLowerCase()}`}
                    >
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
                      onClick={() => setSelected(item)}
                    >
                      <FiEye />
                    </button>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

          <div className="table-footer">

            <span>
              Showing 1 to 7 of 24 reports
            </span>

            <div className="pagination">

              <button>
                <FiChevronLeft />
              </button>

              <button className="active">1</button>

              <button>2</button>

              <button>3</button>

              <button>4</button>

              <button>
                <FiChevronRight />
              </button>

            </div>

          </div>

        </div>

        {/* Right Panel */}

        <div className="details-card">

          <div className="details-top">

            <h3>Report Details</h3>

            <button>✕</button>

          </div>

          <div className="high-tag">

            <FaExclamationTriangle />
            High Severity

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
            <strong className="risk">
              {selected.risk}/100
            </strong>
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
              <li>✔ Evacuate nearby residents</li>
              <li>✔ Avoid walking or driving in flooded areas</li>
              <li>✔ Disconnect electricity if water enters home</li>
              <li>✔ Contact local authorities for help</li>
            </ul>

          </div>

          <button className="map-btn">
            <FiMapPin />
            View on Map
          </button>

        </div>

      </div>

    </main>
  );
};

export default ReportHistory;