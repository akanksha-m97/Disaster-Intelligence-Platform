import React from "react";
import "./Analytics.css";

import {
  FiCalendar,
  FiFilter,
  FiDownload
} from "react-icons/fi";

import {
  FaFileAlt,
  FaExclamationTriangle,
  FaShieldAlt
} from "react-icons/fa";

import {
  MdWarningAmber
} from "react-icons/md";

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
  Cell
} from "recharts";

const lineData = [
  { day: "1 May", reports: 28 },
  { day: "3 May", reports: 41 },
  { day: "5 May", reports: 27 },
  { day: "7 May", reports: 35 },
  { day: "9 May", reports: 22 },
  { day: "11 May", reports: 44 },
  { day: "13 May", reports: 31 },
  { day: "15 May", reports: 65 },
  { day: "17 May", reports: 58 },
  { day: "19 May", reports: 74 },
  { day: "21 May", reports: 42 },
  { day: "23 May", reports: 47 },
  { day: "25 May", reports: 83 },
  { day: "27 May", reports: 68 },
  { day: "29 May", reports: 86 },
  { day: "31 May", reports: 48 }
];

const disasterData = [
  { name: "Flood", value: 195, color: "#2563eb" },
  { name: "Heavy Rain", value: 100, color: "#60a5fa" },
  { name: "Landslide", value: 54, color: "#f59e0b" },
  { name: "Storm", value: 44, color: "#22c55e" },
  { name: "Other", value: 39, color: "#8b5cf6" }
];

const severityData = [
  { name: "High", value: 98, color: "#ef4444" },
  { name: "Medium", value: 210, color: "#f59e0b" },
  { name: "Low", value: 124, color: "#22c55e" }
];

const Analytics = () => {

  return (

    <main className="analytics-page">

      {/* Header */}

      <div className="analytics-header">

        <div>

          <h1>Analytics</h1>

          <p>
            Understand disaster trends and insights from reports.
          </p>

        </div>

        <div className="analytics-actions">

          <button>

            <FiCalendar />

            01 May 2024 - 31 May 2024

          </button>

          <button>

            <FiFilter />

            Filters

          </button>

        </div>

      </div>

      {/* Stats */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="icon blue">

            <FaFileAlt />

          </div>

          <div>

            <span>Total Reports</span>

            <h2>432</h2>

            <small className="green">
              ↑ 18.5% from Apr
            </small>

          </div>

        </div>

        <div className="stat-card">

          <div className="icon red">

            <FaExclamationTriangle />

          </div>

          <div>

            <span>High Severity</span>

            <h2>98</h2>

            <small className="red-text">
              ↑ 12.3% from Apr
            </small>

          </div>

        </div>

        <div className="stat-card">

          <div className="icon orange">

            <MdWarningAmber />

          </div>

          <div>

            <span>Medium Severity</span>

            <h2>210</h2>

            <small className="orange-text">
              ↑ 8.7% from Apr
            </small>

          </div>

        </div>

        <div className="stat-card">

          <div className="icon green">

            <FaShieldAlt />

          </div>

          <div>

            <span>Low Severity</span>

            <h2>124</h2>

            <small className="green">
              ↓ 5.4% from Apr
            </small>

          </div>

        </div>

      </div>

      {/* Charts Row */}

      <div className="charts-grid">

        <div className="chart-card">

          <div className="card-head">

            <h3>Reports Over Time</h3>

            <button>Daily</button>

          </div>

          <ResponsiveContainer width="100%" height={280}>

            <LineChart data={lineData}>

              <CartesianGrid strokeDasharray="3 3"/>

              <XAxis dataKey="day"/>

              <YAxis/>

              <Tooltip/>

              <Line
                type="monotone"
                dataKey="reports"
                stroke="#2563eb"
                strokeWidth={3}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

                {/* Reports by Disaster Type */}

        <div className="chart-card">

          <h3>Reports by Disaster Type</h3>

          <ResponsiveContainer width="100%" height={280}>

            <PieChart>

              <Pie
                data={disasterData}
                dataKey="value"
                outerRadius={90}
                label
              >

                {disasterData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.color}
                  />
                ))}

              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

        {/* Reports by Severity */}

        <div className="chart-card">

          <h3>Reports by Severity</h3>

          <ResponsiveContainer width="100%" height={280}>

            <PieChart>

              <Pie
                data={severityData}
                dataKey="value"
                innerRadius={55}
                outerRadius={90}
              >

                {severityData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.color}
                  />
                ))}

              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* Bottom Section */}

      <div className="bottom-grid">

        {/* Top Areas */}

        <div className="table-card">

          <h3>Top Affected Areas</h3>

          <table>

            <thead>

              <tr>

                <th>Area</th>

                <th>Reports</th>

              </tr>

            </thead>

            <tbody>

              <tr>
                <td>Sector 17, Kurukshetra</td>
                <td>56</td>
              </tr>

              <tr>
                <td>Pehowa</td>
                <td>42</td>
              </tr>

              <tr>
                <td>Ladwa</td>
                <td>31</td>
              </tr>

              <tr>
                <td>Shahbad Markanda</td>
                <td>28</td>
              </tr>

              <tr>
                <td>Thanesar</td>
                <td>25</td>
              </tr>

            </tbody>

          </table>

        </div>

        {/* Recent Reports */}

        <div className="table-card wide">

          <h3>Recent Reports Summary</h3>

          <table>

            <thead>

              <tr>

                <th>Date</th>

                <th>Disaster</th>

                <th>Location</th>

                <th>Severity</th>

                <th>Reports</th>

              </tr>

            </thead>

            <tbody>

              <tr>

                <td>31 May 2024</td>

                <td>Flood</td>

                <td>Sector 17</td>

                <td>
                  <span className="badge high">
                    High
                  </span>
                </td>

                <td>14</td>

              </tr>

              <tr>

                <td>31 May 2024</td>

                <td>Heavy Rain</td>

                <td>Pehowa</td>

                <td>
                  <span className="badge medium">
                    Medium
                  </span>
                </td>

                <td>9</td>

              </tr>

              <tr>

                <td>30 May 2024</td>

                <td>Landslide</td>

                <td>Yamunanagar</td>

                <td>
                  <span className="badge low">
                    Low
                  </span>
                </td>

                <td>6</td>

              </tr>

              <tr>

                <td>30 May 2024</td>

                <td>Storm</td>

                <td>Thanesar</td>

                <td>
                  <span className="badge medium">
                    Medium
                  </span>
                </td>

                <td>5</td>

              </tr>

              <tr>

                <td>29 May 2024</td>

                <td>Flood</td>

                <td>Ladwa</td>

                <td>
                  <span className="badge high">
                    High
                  </span>
                </td>

                <td>11</td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

      {/* Download Button */}

      <div className="download-section">

        <button className="download-btn">

          <FiDownload />

          Download Report (CSV)

        </button>

      </div>

    </main>

  );

};

export default Analytics;