import React from "react";
import "./LiveMap.css";

import {
  FiFilter,
  FiChevronDown,
  FiRefreshCw,
  FiPlus,
  FiMinus,
  FiCrosshair,
  FiX,
  FiExternalLink
} from "react-icons/fi";

import {
  FaMapMarkerAlt,
  FaWater,
  FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";

const LiveMap = () => {
  return (
    <main className="live-map-page">

      {/* Header */}

      <div className="live-header">

        <div>

          <h1>📍 Live Map</h1>

          <p>
            Real-time overview of hazards and affected areas.
          </p>

        </div>

        <span className="updated">

          Last Updated: 2 min ago

          <FiRefreshCw />

        </span>

      </div>

      <div className="live-layout">

        {/* LEFT */}

        <div className="map-section">

          {/* Filters */}

          <div className="map-filters">

            <button>

              All Hazards

              <FiChevronDown />

            </button>

            <button>

              All Severity

              <FiChevronDown />

            </button>

            <button>

              <FiFilter />

              Filters

            </button>

          </div>

          {/* Map */}

          <div className="map-container">

            <img
              src="https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=900&height=650&center=lon:76.841&lat:29.969&zoom=11&apiKey=YOUR_API_KEY"
              alt="map"
            />

            {/* Sample Pins */}

            <div className="marker high">3</div>

            <div className="marker medium one">2</div>

            <div className="marker medium two">2</div>

            <div className="marker low">4</div>

            <div className="marker flood">

              <FaWater />

            </div>

            {/* Controls */}

            <div className="map-controls">

              <button>

                <FiCrosshair />

              </button>

              <button>

                <FiPlus />

              </button>

              <button>

                <FiMinus />

              </button>

            </div>

            {/* Legend */}

            <div className="legend">

              <span>

                <i className="red"></i>

                High Severity

              </span>

              <span>

                <i className="orange"></i>

                Medium Severity

              </span>

              <span>

                <i className="green"></i>

                Low Severity

              </span>

              <span>

                <i className="blue"></i>

                Your Location

              </span>

            </div>

          </div>

          {/* Alerts */}

          <div className="alerts-card">

            <div className="alerts-head">

              <h3>Recent Alerts</h3>

              <a href="/">View All</a>

            </div>

            <table>

              <tbody>

                <tr>

                  <td>

                    <FaWater className="red-icon"/>

                    Heavy Rainfall

                  </td>

                  <td>Pehowa, Kurukshetra</td>

                  <td>30 mins ago</td>

                  <td>

                    <span className="badge high">

                      High

                    </span>

                  </td>

                </tr>

                <tr>

                  <td>

                    <FaWater className="blue-icon"/>

                    Water Logging

                  </td>

                  <td>Sector 17</td>

                  <td>1 hour ago</td>

                  <td>

                    <span className="badge medium">

                      Medium

                    </span>

                  </td>

                </tr>

                <tr>

                  <td>

                    <FaCheckCircle className="green-icon"/>

                    Incident Resolved

                  </td>

                  <td>Ladwa</td>

                  <td>3 hours ago</td>

                  <td>

                    <span className="badge low">

                      Low

                    </span>

                  </td>

                </tr>

                <tr>

                  <td>

                    <FaExclamationTriangle className="orange-icon"/>

                    Landslide Warning

                  </td>

                  <td>Yamunanagar</td>

                  <td>5 hours ago</td>

                  <td>

                    <span className="badge medium">

                      Medium

                    </span>

                  </td>

                </tr>

              </tbody>

            </table>

          </div>

        </div>

        {/* RIGHT PANEL */}

        <aside className="incident-card">

          <div className="incident-head">

            <h2>Incident Details</h2>

            <FiX />

          </div>

          <span className="severity-pill">

            High Severity

          </span>

          <div className="incident-title">

            <FaWater />

            <h3>Flood</h3>

          </div>

          <div className="detail">

            <span>Location</span>

            <strong>Sector 17, Kurukshetra</strong>

          </div>

          <div className="detail">

            <span>Reported</span>

            <strong>2 minutes ago</strong>

          </div>

          <div className="detail">

            <span>Risk Score</span>

            <strong className="risk">94/100</strong>

          </div>

          <div className="detail">

            <span>Status</span>

            <strong>Active</strong>

          </div>

          <div className="detail">

            <span>Confidence</span>

            <strong>96%</strong>

          </div>

          <hr />

          <h4>Additional Info</h4>

          <div className="detail">

            <span>Incident ID</span>

            <strong>INC-1045</strong>

          </div>

          <div className="detail">

            <span>Source</span>

            <strong>User Report</strong>

          </div>

          <div className="detail">

            <span>Affected Area</span>

            <strong>~1.2 km²</strong>

          </div>

          <div className="detail">

            <span>People Affected</span>

            <strong>High</strong>

          </div>

          <button className="report-btn">

            <FiExternalLink />

            View Full Report

          </button>

        </aside>

      </div>

    </main>
  );
};

export default LiveMap;