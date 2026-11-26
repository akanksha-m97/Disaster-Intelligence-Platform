import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import {
  FaTint,
  FaHome,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaChartBar,
  FaHistory,
  FaShieldAlt,
  FaBell,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useNotifications } from "../context/NotificationContext";
import NotificationDropdown from "./NotificationDropdown";
import "./Header.css";

// Central place to edit nav items/routes — change paths here if your
// router uses different ones.
const NAV_ITEMS = [
  { label: "Home", path: "/home", icon: <FaHome /> },
  { label: "Report Hazard", path: "/report-hazard", icon: <FaExclamationTriangle /> },
  { label: "Live Map", path: "/live-map", icon: <FaMapMarkerAlt /> },
  { label: "Analytics", path: "/analytics", icon: <FaChartBar /> },
  { label: "Report History", path: "/report-history", icon: <FaHistory /> },
  { label: "Emergency Guidance", path: "/emergency-guidance", icon: <FaShieldAlt /> },
];

const Header = ({ notificationCount }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const bellWrapperRef = useRef(null);

  const { unreadCount } = useNotifications();
  const displayCount = notificationCount !== undefined ? notificationCount : unreadCount;

  // Close the mobile menu automatically if the viewport grows back to
  // desktop size (e.g. rotating a tablet), so it doesn't get stuck open.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        bellWrapperRef.current &&
        !bellWrapperRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="app-header">
      <div className="header-inner">
        <NavLink to="/home" className="header-brand" onClick={closeMenu}>
          <span className="brand-icon">
            <FaTint />
          </span>
          <div className="brand-text">
            <h1>DisasterIQ</h1>
            <p>Disaster Intelligence Platform</p>
          </div>
        </NavLink>

        <nav className={`header-nav ${menuOpen ? "open" : ""}`}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/home"}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <div className="notification-bell-wrapper" ref={bellWrapperRef}>
            <button
              className={`icon-btn ${dropdownOpen ? "active" : ""}`}
              aria-label="Notifications"
              aria-expanded={dropdownOpen}
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <FaBell />
              {displayCount > 0 && (
                <span className="badge">
                  {displayCount > 99 ? "99+" : displayCount}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <NotificationDropdown onClose={() => setDropdownOpen(false)} />
            )}
          </div>

          <button
            className="hamburger-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Backdrop closes the mobile menu when tapped outside it */}
      {menuOpen && (
        <div
          className="nav-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </header>
  );
};

export default Header;
