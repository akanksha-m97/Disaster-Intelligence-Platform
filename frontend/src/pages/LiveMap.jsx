import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "./LiveMap.css";
import axios from "axios";
import {
  FiFilter, FiChevronDown, FiRefreshCw,
  FiPlus, FiMinus, FiCrosshair, FiX, FiExternalLink, FiSearch, FiNavigation, FiLayers
} from "react-icons/fi";
import {
  FaWater, FaCheckCircle, FaExclamationTriangle,
  FaTemperatureHigh, FaCloudRain, FaWind, FaTint, FaSmog
} from "react-icons/fa";

// ── Config ───────────────────────────────────────────────────────────────────
const API_BASE_URL    = "http://localhost:8000/api/v1";
const DEFAULT_LAT      = 29.9695;
const DEFAULT_LON      = 76.8783;
const REFRESH_INTERVAL = 30000; // 30 seconds
const OSRM_BASE_URL    = "https://router.project-osrm.org/route/v1/driving";
const OVERPASS_URL      = "https://overpass-api.de/api/interpreter";

const SEVERITY_FILTERS = ["All Severity", "High", "Medium", "Low"];
const TYPE_FILTERS     = ["All Hazards", "Flood", "Landslide", "Water Logging"];
const STATUS_FILTERS   = ["All Status", "Active", "Resolved"];

const SERVICE_TYPES = {
  hospital: { label: "Hospitals",     color: "#dc2626", glyph: "H", query: `node["amenity"="hospital"]` },
  police:   { label: "Police",        color: "#1d4ed8", glyph: "P", query: `node["amenity"="police"]` },
  fire:     { label: "Fire Stations", color: "#ea580c", glyph: "F", query: `node["amenity"="fire_station"]` },
  shelter:  { label: "Shelters",      color: "#16a34a", glyph: "S", query: `node["amenity"="social_facility"]["social_facility"="shelter"]` },
  camp:     { label: "Relief Camps",  color: "#7c3aed", glyph: "R", query: `node["tourism"="camp_site"]` },
};

const markerColor = (severity) => {
  if (severity === "High")   return "#ef4444";
  if (severity === "Medium") return "#f59e0b";
  return "#22c55e";
};

const riskZoneRadius = (severity) => {
  if (severity === "High")   return 4000;
  if (severity === "Medium") return 2500;
  return 1200;
};

// ── Relative time ─────────────────────────────────────────────────────────────
const getRelativeTime = (dateString) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Unknown";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60)   return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)   return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)     return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1)     return "Yesterday";
  return `${days} days ago`;
};

// ── Normalize backend document → UI shape ────────────────────────────────────
//
// MongoDB document shape (after your backend saves GPS + geocoding):
//   {
//     _id, disaster_type, severity, risk_score, confidence,
//     status, recommendations, weather, created_at,
//
//     // Flat coords saved by the backend (new shape):
//     lat: 29.97,
//     lon: 76.88,
//
//     // Location object (may also carry nested lat/lon from old geocoding path):
//     location: {
//       lat: 29.97,            // optional — from geocoding
//       lon: 76.88,            // optional
//       locations: ["Hisar"],  // NLP-extracted place names
//       source: "gps" | "nlp" | "geocoded",
//       geocoded: true | false,
//     }
//   }
//
// Priority for coordinates:
//   1. flat raw.lat / raw.lon  (set by the updated backend save_incident)
//   2. nested raw.location.lat / raw.location.lon  (geocoding enrichment)
//   3. skip — incident is excluded from map; no hardcoded fallback
//
// "gps" is an internal source tag, never shown to users.
const normalizeIncident = (raw) => {
  // ── Coordinates ──────────────────────────────────────────────────────────
  // Prefer flat top-level fields (written by the backend when GPS is used),
  // then fall through to nested geocoded fields.
  const flatLat = typeof raw?.lat === "number" ? raw.lat : null;
  const flatLon = typeof raw?.lon === "number" ? raw.lon : null;

  const nestedLat = typeof raw?.location?.lat === "number" ? raw.location.lat : null;
  const nestedLon = typeof raw?.location?.lon === "number" ? raw.location.lon : null;

  const lat = flatLat ?? nestedLat;
  const lon = flatLon ?? nestedLon;

  // Mark incidents that have no real coordinates so callers can skip them.
  const hasRealCoords = lat !== null && lon !== null;

  // ── Location label ────────────────────────────────────────────────────────
  // Never expose the internal "gps" source string in the UI.
  const rawSource = raw?.location?.source;
  const nlpPlaces = raw?.location?.locations;

  let locationLabel;
  if (Array.isArray(nlpPlaces) && nlpPlaces.length > 0) {
    // NLP extracted a real place name — always prefer this.
    locationLabel = nlpPlaces[0];
  } else if (rawSource && rawSource !== "gps") {
    // Some other source string that isn't the internal "gps" tag.
    locationLabel = rawSource;
  } else if (lat !== null && lon !== null) {
    // GPS-only: no NLP place name, but we have real coordinates.
    locationLabel = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
  } else {
    // Truly no location info.
    locationLabel = "Unknown Location";
  }

  return {
    id:            raw._id ? `INC-${String(raw._id).slice(-6).toUpperCase()}` : "INC-UNKNOWN",
    rawId:         raw._id,
    type:          raw.disaster_type || "Unknown",
    severity:      raw.severity || "Low",
    risk_score:    raw.risk_score ?? 0,
    confidence:    raw.confidence ?? 0,
    location:      locationLabel,
    lat:           hasRealCoords ? lat : null,
    lon:           hasRealCoords ? lon : null,
    hasRealCoords,
    reported:      getRelativeTime(raw.created_at || raw.timestamp),
    reportedAt:    raw.created_at || raw.timestamp || null,
    status:        raw.status || "Active",
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
    weather:       raw.weather || null,
  };
};

// ── Reverse geocoding (Nominatim, free, no key needed) ───────────────────────
// Cache keyed by "lat,lon" rounded to 3 decimal places (~111m grid).
// This means incidents within ~100m of each other share one API call.
const reverseGeocodeCache = {};

const reverseGeocode = async (lat, lon) => {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (reverseGeocodeCache[key]) return reverseGeocodeCache[key];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) throw new Error("Nominatim error");
    const data = await res.json();

    // Build a short, human-readable label from the most specific available fields.
    // Priority: suburb/village → city/town → state_district → state
    const a = data.address || {};
    const label =
      a.suburb       || a.village      || a.town     ||
      a.city_district|| a.county       || a.city     ||
      a.state_district || a.state      || data.display_name?.split(",")[0] ||
      `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;

    reverseGeocodeCache[key] = label;
    return label;
  } catch {
    // On any network failure fall back to coordinates — never crash.
    const fallback = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
    reverseGeocodeCache[key] = fallback;
    return fallback;
  }
};

// ── Haversine distance in km ──────────────────────────────────────────────────
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const LiveMap = () => {
  const mapRef          = useRef(null);
  const leafletMap      = useRef(null);

  const incidentClusterRef = useRef(null);
  const heatLayerRef       = useRef(null);
  const riskZoneLayerRef   = useRef(null);
  const serviceLayersRef   = useRef({});
  const userMarkerRef      = useRef(null);
  const routeLineRef       = useRef(null);
  const refreshTimerRef    = useRef(null);
  const pluginsLoadedRef   = useRef(false);

  const [incidents,      setIncidents]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState(null);
  const [mapReady,       setMapReady]       = useState(false);

  const [selected,       setSelected]       = useState(null);
  const [severityFilter, setSeverityFilter] = useState("All Severity");
  const [typeFilter,     setTypeFilter]     = useState("All Hazards");
  const [statusFilter,   setStatusFilter]   = useState("All Status");
  const [searchTerm,     setSearchTerm]     = useState("");
  const [lastUpdated,    setLastUpdated]    = useState("Just now");
  const [userLocation,   setUserLocation]   = useState(null);

  const [layers, setLayers] = useState({
    incidents: true,
    heatmap:   false,
    riskZones: false,
    hospital:  false,
    police:    false,
    fire:      false,
    shelter:   false,
    camp:      false,
    weather:   true,
  });
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);

  const [services, setServices]               = useState({});
  const [servicesLoading, setServicesLoading] = useState(false);

  const [routeInfo,  setRouteInfo]   = useState(null);
  const [routing,    setRouting]     = useState(false);
  const [routeError, setRouteError]  = useState(null);

  const [highRiskBanner, setHighRiskBanner]   = useState(null);
  const dismissedHighRiskIds = useRef(new Set());

  // ── Fetch incidents ───────────────────────────────────────────────────────
  const fetchIncidents = useCallback(async (isBackground = false) => {
    if (isBackground) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`${API_BASE_URL}/reports`, {
        params: { limit: 50 },
      });
      const rawIncidents = res?.data?.incidents || [];
      const normalized   = rawIncidents.map(normalizeIncident);

      // Reverse-geocode GPS-only incidents in parallel (cached after first call).
      const enriched = await Promise.all(
        normalized.map(async (inc) => {
          // Coord-label pattern: "29.9695°N, 76.8783°E"
          if (inc.hasRealCoords && /°[NE]/.test(inc.location)) {
            const name = await reverseGeocode(inc.lat, inc.lon);
            return { ...inc, location: name };
          }
          return inc;
        })
      );

      setIncidents(enriched);

      setSelected((prev) => {
        if (prev) {
          const stillExists = enriched.find((inc) => inc.rawId === prev.rawId);
          if (stillExists) return stillExists;
        }
        return prev ?? enriched[0] ?? null;
      });

      const newHighRisk = enriched.find(
        (inc) => inc.severity === "High" && !dismissedHighRiskIds.current.has(inc.rawId)
      );
      if (newHighRisk) setHighRiskBanner(newHighRisk);

      setLastUpdated("Just now");
    } catch (err) {
      console.error("Failed to fetch incident reports:", err);
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to reach the server. Please check your connection and try again."
      );
      if (!isBackground) setIncidents([]);
    } finally {
      if (isBackground) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIncidents(false); }, [fetchIncidents]);

  useEffect(() => {
    refreshTimerRef.current = setInterval(() => fetchIncidents(true), REFRESH_INTERVAL);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [fetchIncidents]);

  // ── Map initialization ────────────────────────────────────────────────────
  const initMap = () => {
    if (leafletMap.current || !mapRef.current) return;
    const L   = window.L;
    const map = L.map(mapRef.current, {
      center:      [DEFAULT_LAT, DEFAULT_LON],
      zoom:        10,
      zoomControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    incidentClusterRef.current = L.markerClusterGroup({
      maxClusterRadius:    60,
      spiderfyOnMaxZoom:   true,
      showCoverageOnHover: false,
    });
    riskZoneLayerRef.current = L.layerGroup();
    Object.keys(SERVICE_TYPES).forEach((key) => {
      serviceLayersRef.current[key] = L.layerGroup();
    });

    leafletMap.current = map;
    setMapReady(true);
  };

  useEffect(() => {
    const loadCss = (id, href) => {
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id   = id;
        link.rel  = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    };
    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        const script   = document.createElement("script");
        script.src     = src;
        script.async   = true;
        script.onload  = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

    loadCss("leaflet-css",                "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    loadCss("leaflet-cluster-css",        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css");
    loadCss("leaflet-cluster-default-css","https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css");

    const init = async () => {
      try {
        if (!window.L)                    await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
        if (!window.L.markerClusterGroup) await loadScript("https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js");
        if (!window.L.heatLayer)          await loadScript("https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js");
        pluginsLoadedRef.current = true;
        initMap();
      } catch (e) {
        console.error("Failed to load map libraries:", e);
        setError("Failed to load map libraries. Please check your connection.");
      }
    };
    init();

    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Popup builders ────────────────────────────────────────────────────────
  const buildPopupHtml = (inc) => {
    const color = markerColor(inc.severity);
    return `
      <div style="min-width:200px;font-family:sans-serif;">
        <strong style="color:#111;font-size:14px">${inc.type}</strong><br/>
        <span style="color:#6b7280;font-size:13px">${inc.location}</span><br/>
        <span style="color:${color};font-weight:600;font-size:13px">${inc.severity} Severity</span><br/>
        <span style="font-size:13px">Risk Score: <strong>${inc.risk_score}/100</strong></span><br/>
        <span style="font-size:13px">Confidence: <strong>${inc.confidence}%</strong></span><br/>
        <span style="color:#9ca3af;font-size:12px">Reported ${inc.reported}</span>
      </div>
    `;
  };

  const buildServicePopupHtml = (svc, distanceKm) => `
    <div style="min-width:190px;font-family:sans-serif;">
      <strong style="color:#111;font-size:14px">${svc.name}</strong><br/>
      <span style="color:#6b7280;font-size:13px">${svc.typeLabel}</span><br/>
      ${distanceKm != null ? `<span style="font-size:13px">Distance: <strong>${distanceKm.toFixed(1)} km</strong></span><br/>` : ""}
      <span style="font-size:13px">Contact: <strong>${svc.phone || "Not available"}</strong></span><br/>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lon}"
         target="_blank" rel="noopener noreferrer"
         style="display:inline-block;margin-top:6px;font-size:12px;color:#2563eb;font-weight:600;text-decoration:none;">
        Directions →
      </a>
    </div>
  `;

  // ── Render incident markers ───────────────────────────────────────────────
  // Only incidents with real GPS/geocoded coordinates are placed on the map.
  const renderIncidentMarkers = useCallback((incidentList, highlightId = null) => {
    const L = window.L;
    if (!L || !incidentClusterRef.current) return;

    incidentClusterRef.current.clearLayers();

    incidentList
      .filter((inc) => inc.hasRealCoords)   // ← skip anything without real coords
      .forEach((inc) => {
        const color       = markerColor(inc.severity);
        const isHighlight = highlightId && inc.rawId === highlightId;
        const size        = isHighlight ? 52 : 42;

        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              width:${size}px;height:${size}px;border-radius:50%;
              background:${color};color:#fff;
              display:flex;align-items:center;justify-content:center;
              font-weight:700;font-size:13px;
              box-shadow:${isHighlight
                ? "0 0 0 6px rgba(37,99,235,0.35), 0 4px 14px rgba(0,0,0,0.3)"
                : "0 4px 14px rgba(0,0,0,0.25)"};
              border:3px solid #fff;
              cursor:pointer;
            ">
              ${inc.severity === "High" ? "!" : inc.severity === "Medium" ? "~" : "✓"}
            </div>`,
          iconSize:   [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([inc.lat, inc.lon], { icon })
          .bindPopup(buildPopupHtml(inc))
          .on("click", () => setSelected(inc));

        incidentClusterRef.current.addLayer(marker);

        if (isHighlight) setTimeout(() => marker.openPopup(), 300);
      });
  }, []);

  // ── Heatmap ───────────────────────────────────────────────────────────────
  const renderHeatmap = useCallback((incidentList) => {
    const L = window.L;
    if (!L || !leafletMap.current || !L.heatLayer) return;

    if (heatLayerRef.current) {
      leafletMap.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    const points = incidentList
      .filter((inc) => inc.hasRealCoords)
      .map((inc) => [inc.lat, inc.lon, Math.max(inc.risk_score, 5) / 100]);

    heatLayerRef.current = L.heatLayer(points, {
      radius:   35,
      blur:     25,
      maxZoom:  17,
      gradient: { 0.2: "#22c55e", 0.5: "#f59e0b", 0.8: "#ef4444", 1.0: "#dc2626" },
    });

    if (layers.heatmap) heatLayerRef.current.addTo(leafletMap.current);
  }, [layers.heatmap]);

  // ── Risk zones ────────────────────────────────────────────────────────────
  const renderRiskZones = useCallback((incidentList) => {
    const L = window.L;
    if (!L || !riskZoneLayerRef.current) return;

    riskZoneLayerRef.current.clearLayers();

    incidentList
      .filter((inc) => inc.hasRealCoords)
      .forEach((inc) => {
        const color = markerColor(inc.severity);
        L.circle([inc.lat, inc.lon], {
          radius:      riskZoneRadius(inc.severity),
          color,
          weight:      1.5,
          fillColor:   color,
          fillOpacity: 0.12,
        }).addTo(riskZoneLayerRef.current);
      });
  }, []);

  // ── User location marker ──────────────────────────────────────────────────
  const renderUserMarker = useCallback((lat, lon) => {
    const L = window.L;
    if (!L || !leafletMap.current) return;

    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }

    const icon = L.divIcon({
      className: "",
      html: `
        <div style="
          width:20px;height:20px;border-radius:50%;
          background:#2563eb;border:3px solid #fff;
          box-shadow:0 0 0 6px rgba(37,99,235,0.25), 0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
      iconSize:   [20, 20],
      iconAnchor: [10, 10],
    });

    userMarkerRef.current = L.marker([lat, lon], { icon, zIndexOffset: 1000 })
      .addTo(leafletMap.current)
      .bindPopup("You are here");
  }, []);

  // ── Filtered incidents ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return incidents.filter((inc) => {
      const bySeverity = severityFilter === "All Severity" || inc.severity === severityFilter;
      const byType     = typeFilter     === "All Hazards"  || inc.type     === typeFilter;
      const byStatus   = statusFilter   === "All Status"   || inc.status   === statusFilter;
      const bySearch   = !term || inc.location.toLowerCase().includes(term);
      return bySeverity && byType && byStatus && bySearch;
    });
  }, [incidents, severityFilter, typeFilter, statusFilter, searchTerm]);

  // First filtered incident that matches the search term (for zoom/highlight).
  const searchMatch = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return null;
    // Prefer an incident that actually has real coords so we can zoom to it.
    return filtered.find((inc) => inc.hasRealCoords) || filtered[0] || null;
  }, [searchTerm, filtered]);

  // Re-render map layers whenever the filtered set or map readiness changes.
  useEffect(() => {
    if (!mapReady) return;
    renderIncidentMarkers(filtered, searchMatch?.rawId || null);
    renderHeatmap(filtered);
    renderRiskZones(filtered);
  }, [filtered, searchMatch, mapReady, renderIncidentMarkers, renderHeatmap, renderRiskZones]);

  // Zoom + select on search match.
  useEffect(() => {
    if (searchMatch && leafletMap.current && searchMatch.hasRealCoords) {
      leafletMap.current.setView([searchMatch.lat, searchMatch.lon], 13, { animate: true });
      setSelected(searchMatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMatch]);

  // ── Statistics ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = incidents.length;
    const highRisk = incidents.filter((i) => i.risk_score > 80).length;
    const resolved = incidents.filter((i) => i.status === "Resolved").length;
    const active   = incidents.filter((i) => i.status === "Active").length;
    const avgRisk  = total > 0
      ? Math.round(incidents.reduce((sum, i) => sum + i.risk_score, 0) / total)
      : 0;
    return { total, highRisk, resolved, active, avgRisk };
  }, [incidents]);

  // ── Incident timeline (newest first) ─────────────────────────────────────
  const timeline = useMemo(() =>
    [...incidents].sort((a, b) => {
      const tA = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
      const tB = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
      return tB - tA;
    }),
  [incidents]);

  // ── Layer toggle effects ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !leafletMap.current) return;
    const map = leafletMap.current;
    if (layers.incidents) map.addLayer(incidentClusterRef.current);
    else map.removeLayer(incidentClusterRef.current);
  }, [layers.incidents, mapReady]);

  useEffect(() => {
    if (!mapReady || !leafletMap.current || !heatLayerRef.current) return;
    const map = leafletMap.current;
    if (layers.heatmap) heatLayerRef.current.addTo(map);
    else map.removeLayer(heatLayerRef.current);
  }, [layers.heatmap, mapReady]);

  useEffect(() => {
    if (!mapReady || !leafletMap.current) return;
    const map = leafletMap.current;
    if (layers.riskZones) map.addLayer(riskZoneLayerRef.current);
    else map.removeLayer(riskZoneLayerRef.current);
  }, [layers.riskZones, mapReady]);

  // ── Emergency services ────────────────────────────────────────────────────
  const renderServiceMarkers = useCallback((key, list) => {
    const L = window.L;
    const layerGroup = serviceLayersRef.current[key];
    if (!L || !layerGroup) return;

    layerGroup.clearLayers();
    const config = SERVICE_TYPES[key];

    list.forEach((svc) => {
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:30px;height:30px;border-radius:8px;
            background:${config.color};color:#fff;
            display:flex;align-items:center;justify-content:center;
            font-weight:700;font-size:13px;
            box-shadow:0 3px 10px rgba(0,0,0,0.3);
            border:2px solid #fff;
          ">${config.glyph}</div>`,
        iconSize:   [30, 30],
        iconAnchor: [15, 15],
      });

      const distanceKm = userLocation
        ? haversineKm(userLocation.lat, userLocation.lon, svc.lat, svc.lon)
        : null;

      L.marker([svc.lat, svc.lon], { icon })
        .bindPopup(buildServicePopupHtml(svc, distanceKm))
        .addTo(layerGroup);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  const fetchServicesIfNeeded = useCallback(async (key) => {
    if (services[key]) return;
    setServicesLoading(true);

    const center       = leafletMap.current ? leafletMap.current.getCenter() : { lat: DEFAULT_LAT, lng: DEFAULT_LON };
    const radiusMeters = 15000;
    const config       = SERVICE_TYPES[key];

    const query = `
      [out:json][timeout:15];
      ${config.query}(around:${radiusMeters},${center.lat},${center.lng});
      out body 30;
    `;

    try {
      const res = await axios.post(OVERPASS_URL, query, {
        headers: { "Content-Type": "text/plain" },
      });
      const elements = res?.data?.elements || [];

      const parsed = elements
        .filter((el) => el.lat && el.lon)
        .map((el) => ({
          id:        el.id,
          name:      el.tags?.name || config.label.replace(/s$/, ""),
          typeLabel: config.label,
          lat:       el.lat,
          lon:       el.lon,
          phone:     el.tags?.phone || el.tags?.["contact:phone"] || null,
        }));

      setServices((prev) => ({ ...prev, [key]: parsed }));
      renderServiceMarkers(key, parsed);
    } catch (err) {
      console.error(`Failed to fetch ${key} services:`, err);
      setServices((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setServicesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, renderServiceMarkers]);

  useEffect(() => {
    if (!mapReady || !leafletMap.current) return;
    const map = leafletMap.current;

    Object.keys(SERVICE_TYPES).forEach((key) => {
      const layerGroup = serviceLayersRef.current[key];
      if (!layerGroup) return;

      if (layers[key]) {
        if (!map.hasLayer(layerGroup)) map.addLayer(layerGroup);
        fetchServicesIfNeeded(key);
      } else if (map.hasLayer(layerGroup)) {
        map.removeLayer(layerGroup);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.hospital, layers.police, layers.fire, layers.shelter, layers.camp, mapReady, fetchServicesIfNeeded]);

  // ── Map controls ──────────────────────────────────────────────────────────
  const zoomIn  = () => leafletMap.current?.zoomIn();
  const zoomOut = () => leafletMap.current?.zoomOut();

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        setUserLocation({ lat: latitude, lon: longitude });
        renderUserMarker(latitude, longitude);
        leafletMap.current?.setView([latitude, longitude], 13, { animate: true });
      },
      (err) => console.error("Geolocation error:", err)
    );
  };

  const refresh = () => fetchIncidents(false);

  const handleAlertClick = (inc) => {
    setSelected(inc);
    if (leafletMap.current && inc.hasRealCoords) {
      leafletMap.current.setView([inc.lat, inc.lon], 13, { animate: true });
      incidentClusterRef.current?.eachLayer((marker) => {
        const { lat, lng } = marker.getLatLng();
        if (Math.abs(lat - inc.lat) < 1e-6 && Math.abs(lng - inc.lon) < 1e-6) {
          incidentClusterRef.current.zoomToShowLayer(marker, () => marker.openPopup());
        }
      });
    }
  };

  // ── Routing ───────────────────────────────────────────────────────────────
  const drawRoute = async (fromLat, fromLon, destination) => {
    const L = window.L;
    if (!L || !leafletMap.current) { setRouting(false); return; }

    try {
      const url = `${OSRM_BASE_URL}/${fromLon},${fromLat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`;
      const res = await axios.get(url);
      const route = res?.data?.routes?.[0];
      if (!route) throw new Error("No route found");

      const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

      if (routeLineRef.current) leafletMap.current.removeLayer(routeLineRef.current);
      routeLineRef.current = L.polyline(coords, { color: "#2563eb", weight: 5, opacity: 0.85 })
        .addTo(leafletMap.current);

      leafletMap.current.fitBounds(routeLineRef.current.getBounds(), { padding: [40, 40] });

      setRouteInfo({
        distanceKm:  route.distance / 1000,
        durationMin: route.duration / 60,
        destination: destination.name,
      });
    } catch (err) {
      console.error("Routing failed, falling back to straight line:", err);
      if (routeLineRef.current) leafletMap.current.removeLayer(routeLineRef.current);
      routeLineRef.current = L.polyline(
        [[fromLat, fromLon], [destination.lat, destination.lon]],
        { color: "#2563eb", weight: 4, opacity: 0.7, dashArray: "8 8" }
      ).addTo(leafletMap.current);

      leafletMap.current.fitBounds(routeLineRef.current.getBounds(), { padding: [40, 40] });

      setRouteInfo({
        distanceKm:  haversineKm(fromLat, fromLon, destination.lat, destination.lon),
        durationMin: null,
        destination: destination.name,
        approximate: true,
      });
    } finally {
      setRouting(false);
    }
  };

  const navigateToNearestShelter = async () => {
    setRouteError(null);
    if (!navigator.geolocation) {
      setRouteError("Geolocation is not supported by your browser.");
      return;
    }
    setRouting(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude, longitude } = coords;
      setUserLocation({ lat: latitude, lon: longitude });
      renderUserMarker(latitude, longitude);
      if (!layers.shelter) setLayers((prev) => ({ ...prev, shelter: true }));
      await fetchServicesIfNeeded("shelter");

      setServices((current) => {
        const shelterList = current.shelter || [];
        if (shelterList.length === 0) {
          setRouteError("No shelters found nearby. Try a different area.");
          setRouting(false);
          return current;
        }
        let nearest     = shelterList[0];
        let nearestDist = haversineKm(latitude, longitude, nearest.lat, nearest.lon);
        shelterList.forEach((s) => {
          const d = haversineKm(latitude, longitude, s.lat, s.lon);
          if (d < nearestDist) { nearest = s; nearestDist = d; }
        });
        drawRoute(latitude, longitude, nearest);
        return current;
      });
    }, (err) => {
      console.error("Geolocation error:", err);
      setRouteError("Unable to get your location. Please enable location access.");
      setRouting(false);
    });
  };

  const clearRoute = () => {
    if (routeLineRef.current && leafletMap.current) {
      leafletMap.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    setRouteInfo(null);
    setRouteError(null);
  };

  const dismissHighRiskBanner = () => {
    if (highRiskBanner) dismissedHighRiskIds.current.add(highRiskBanner.rawId);
    setHighRiskBanner(null);
  };

  const toggleLayer = (key) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const alertIcon = (inc) => {
    if (inc.severity === "High")   return <FaWater className="red-icon" />;
    if (inc.severity === "Medium") return <FaExclamationTriangle className="orange-icon" />;
    return <FaCheckCircle className="green-icon" />;
  };

  const weather = selected?.weather;

  // ── Render ────────────────────────────────────────────────────────────────
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
          <FiRefreshCw className={refreshing ? "spin-icon" : ""} />
        </span>
      </div>

      {/* High Risk Banner */}
      {highRiskBanner && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
          padding: "12px 18px", borderRadius: 12, marginBottom: 18,
          fontSize: 14, fontWeight: 600, gap: 12, flexWrap: "wrap",
        }}>
          <span>⚠ High Risk {highRiskBanner.type} reported near {highRiskBanner.location}</span>
          <FiX style={{ cursor: "pointer", flexShrink: 0 }} onClick={dismissHighRiskBanner} />
        </div>
      )}

      {/* Stats */}
      <div className="map-filters" style={{ marginBottom: 22, display: "flex", flexWrap: "wrap" }}>
        {[
          { label: "Total Incidents", value: stats.total },
          { label: "High Risk",       value: stats.highRisk },
          { label: "Active",          value: stats.active },
          { label: "Resolved",        value: stats.resolved },
          { label: "Avg. Risk Score", value: stats.avgRisk },
        ].map((s) => (
          <div key={s.label} style={{ flex: "1 1 140px", textAlign: "center", padding: "8px 12px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="live-layout">

        {/* LEFT */}
        <div className="map-section">

          {/* Search */}
          <div className="map-filters">
            <div className="filter-select" style={{ flex: 1, minWidth: 220 }}>
              <FiSearch className="select-icon" style={{ left: 12, right: "auto" }} />
              <input
                type="text"
                placeholder="Search by location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%", height: 44, padding: "0 16px 0 38px",
                  border: "1px solid #e5e7eb", borderRadius: 10,
                  fontSize: 14, color: "#374151", background: "#fff",
                }}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="map-filters">
            <div className="filter-select">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                {TYPE_FILTERS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <FiChevronDown className="select-icon" />
            </div>
            <div className="filter-select">
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                {SEVERITY_FILTERS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <FiChevronDown className="select-icon" />
            </div>
            <div className="filter-select">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <FiChevronDown className="select-icon" />
            </div>

            {/* Layer toggle */}
            <div className="filter-select" style={{ position: "relative" }}>
              <button className="filter-btn" onClick={() => setLayersMenuOpen((o) => !o)} style={{ height: 44 }}>
                <FiLayers /> Layers
              </button>
              {layersMenuOpen && (
                <div style={{
                  position: "absolute", top: 48, right: 0, zIndex: 1200,
                  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
                  boxShadow: "0 8px 22px rgba(0,0,0,.12)", padding: 14, minWidth: 200,
                }}>
                  {[
                    ["incidents", "Incidents"],
                    ["heatmap",   "Heatmap"],
                    ["riskZones", "Risk Zones"],
                    ["hospital",  "Hospitals"],
                    ["police",    "Police"],
                    ["fire",      "Fire Stations"],
                    ["shelter",   "Shelters"],
                    ["camp",      "Relief Camps"],
                    ["weather",   "Weather"],
                  ].map(([key, label]) => (
                    <label key={key} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 13, color: "#374151", marginBottom: 8, cursor: "pointer",
                    }}>
                      <input type="checkbox" checked={!!layers[key]} onChange={() => toggleLayer(key)} />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button className="filter-btn">
              <FiFilter /> Filters
            </button>
          </div>

          {/* Map */}
          <div className="map-container">
            <div ref={mapRef} className="leaflet-map" />

            {loading && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1000, fontSize: 14, fontWeight: 600, color: "#374151",
                flexDirection: "column", gap: 10,
              }}>
                <span className="spinner" />
                Loading incident reports...
              </div>
            )}

            {!loading && refreshing && (
              <div style={{
                position: "absolute", top: 16, left: 16, zIndex: 1000,
                background: "#fff", padding: "6px 14px", borderRadius: 999,
                boxShadow: "0 4px 14px rgba(0,0,0,.12)",
                fontSize: 12, fontWeight: 600, color: "#2563eb",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <FiRefreshCw className="spin-icon" /> Refreshing...
              </div>
            )}

            {servicesLoading && (
              <div style={{
                position: "absolute", top: 16, left: 16, zIndex: 1000,
                background: "#fff", padding: "6px 14px", borderRadius: 999,
                boxShadow: "0 4px 14px rgba(0,0,0,.12)",
                fontSize: 12, fontWeight: 600, color: "#7c3aed",
                display: "flex", alignItems: "center", gap: 6,
                marginTop: refreshing ? 36 : 0,
              }}>
                <FiRefreshCw className="spin-icon" /> Loading nearby services...
              </div>
            )}

            {!loading && error && incidents.length === 0 && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(255,255,255,0.92)",
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 10, zIndex: 1000, padding: 20, textAlign: "center",
              }}>
                <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 14 }}>{error}</span>
                <button className="filter-btn" onClick={refresh}><FiRefreshCw /> Retry</button>
              </div>
            )}

            {!loading && error && incidents.length > 0 && (
              <div style={{
                position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
                zIndex: 1000, background: "#fef2f2", border: "1px solid #fecaca",
                color: "#dc2626", fontSize: 12, fontWeight: 600,
                padding: "8px 16px", borderRadius: 10, boxShadow: "0 4px 14px rgba(0,0,0,.1)",
                whiteSpace: "nowrap",
              }}>
                {error}
              </div>
            )}

            {/* Route panel */}
            <div style={{
              position: "absolute", bottom: 16, right: 16, zIndex: 1000,
              background: "#fff", borderRadius: 12, boxShadow: "0 4px 14px rgba(0,0,0,.12)",
              padding: 14, maxWidth: 240,
            }}>
              {!routeInfo && (
                <button
                  className="filter-btn"
                  onClick={navigateToNearestShelter}
                  disabled={routing}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <FiNavigation /> {routing ? "Finding route..." : "Navigate to Nearest Shelter"}
                </button>
              )}
              {routeInfo && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                    To: {routeInfo.destination}
                  </div>
                  <div style={{ fontSize: 13, color: "#374151" }}>
                    Distance: <strong>{routeInfo.distanceKm.toFixed(1)} km</strong>
                    {routeInfo.approximate && <span style={{ color: "#9ca3af" }}> (approx.)</span>}
                  </div>
                  {routeInfo.durationMin != null && (
                    <div style={{ fontSize: 13, color: "#374151" }}>
                      Est. time: <strong>{Math.round(routeInfo.durationMin)} min</strong>
                    </div>
                  )}
                  <button
                    className="filter-btn"
                    onClick={clearRoute}
                    style={{ width: "100%", justifyContent: "center", marginTop: 8, height: 36 }}
                  >
                    <FiX /> Clear Route
                  </button>
                </div>
              )}
              {routeError && (
                <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{routeError}</div>
              )}
            </div>

            {/* Floating weather */}
            {layers.weather && weather && selected && (
              <div style={{
                position: "absolute", top: 16, right: 16, zIndex: 1000,
                background: "#fff", borderRadius: 12, boxShadow: "0 4px 14px rgba(0,0,0,.12)",
                padding: 14, minWidth: 170,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                  Weather — {selected.location}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {weather.temperature !== undefined && (
                    <span style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                      <FaTemperatureHigh style={{ color: "#f59e0b" }} /> {weather.temperature}°C
                    </span>
                  )}
                  {weather.rainfall !== undefined && (
                    <span style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                      <FaCloudRain style={{ color: "#2563eb" }} /> {weather.rainfall} mm
                    </span>
                  )}
                  {weather.wind_speed !== undefined && (
                    <span style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                      <FaWind style={{ color: "#6b7280" }} /> {weather.wind_speed} km/h
                    </span>
                  )}
                  {weather.humidity !== undefined && (
                    <span style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                      <FaTint style={{ color: "#0ea5e9" }} /> {weather.humidity}%
                    </span>
                  )}
                  {weather.aqi !== undefined && (
                    <span style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                      <FaSmog style={{ color: "#78716c" }} /> AQI {weather.aqi}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="map-controls">
              <button onClick={locateMe} title="Locate Me"><FiCrosshair /></button>
              <button onClick={zoomIn}   title="Zoom In"><FiPlus /></button>
              <button onClick={zoomOut}  title="Zoom Out"><FiMinus /></button>
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
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "#6b7280" }}>
                        No incidents match your filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map((inc) => (
                    <tr key={inc.rawId || inc.id} onClick={() => handleAlertClick(inc)} style={{ cursor: "pointer" }}>
                      <td>{alertIcon(inc)}{inc.type}</td>
                      <td>{inc.location}</td>
                      <td>{inc.reported}</td>
                      <td><span className={`badge ${inc.severity.toLowerCase()}`}>{inc.severity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Incident Timeline */}
          <div className="alerts-card">
            <div className="alerts-head">
              <h3>Incident Timeline</h3>
            </div>
            <div className="alerts-table-wrap">
              <table>
                <tbody>
                  {!loading && timeline.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", color: "#6b7280" }}>
                        No reports yet.
                      </td>
                    </tr>
                  )}
                  {timeline.map((inc) => (
                    <tr key={`tl-${inc.rawId || inc.id}`} onClick={() => handleAlertClick(inc)} style={{ cursor: "pointer" }}>
                      <td>{alertIcon(inc)}{inc.type}</td>
                      <td>{inc.location}</td>
                      <td>{inc.reported}</td>
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

            <div className="detail"><span>Location</span><strong>{selected.location}</strong></div>
            <div className="detail"><span>Reported</span><strong>{selected.reported}</strong></div>
            <div className="detail"><span>Risk Score</span><strong className="risk">{selected.risk_score}/100</strong></div>
            <div className="detail"><span>Status</span><strong>{selected.status}</strong></div>
            <div className="detail"><span>Confidence</span><strong>{selected.confidence}%</strong></div>

            <hr />

            <h4>Additional Info</h4>
            <div className="detail"><span>Incident ID</span><strong>{selected.id}</strong></div>
            <div className="detail"><span>Source</span><strong>User Report</strong></div>

            {weather && (
              <>
                <hr />
                <h4>Weather Conditions</h4>
                {weather.temperature !== undefined && (
                  <div className="detail">
                    <span><FaTemperatureHigh style={{ marginRight: 6, color: "#f59e0b" }} />Temperature</span>
                    <strong>{weather.temperature}°C</strong>
                  </div>
                )}
                {weather.rainfall !== undefined && (
                  <div className="detail">
                    <span><FaCloudRain style={{ marginRight: 6, color: "#2563eb" }} />Rainfall</span>
                    <strong>{weather.rainfall} mm</strong>
                  </div>
                )}
                {weather.wind_speed !== undefined && (
                  <div className="detail">
                    <span><FaWind style={{ marginRight: 6, color: "#6b7280" }} />Wind Speed</span>
                    <strong>{weather.wind_speed} km/h</strong>
                  </div>
                )}
                {weather.humidity !== undefined && (
                  <div className="detail">
                    <span><FaTint style={{ marginRight: 6, color: "#0ea5e9" }} />Humidity</span>
                    <strong>{weather.humidity}%</strong>
                  </div>
                )}
                {weather.aqi !== undefined && (
                  <div className="detail">
                    <span><FaSmog style={{ marginRight: 6, color: "#78716c" }} />AQI</span>
                    <strong>{weather.aqi}</strong>
                  </div>
                )}
              </>
            )}

            {selected.recommendations && selected.recommendations.length > 0 && (
              <>
                <hr />
                <h4>Recommendations</h4>
                <ul style={{ paddingLeft: 18, marginBottom: 10 }}>
                  {selected.recommendations.map((rec, idx) => (
                    <li key={idx} style={{ fontSize: 14, color: "#374151", marginBottom: 8, lineHeight: 1.4 }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <button className="report-btn">
              <FiExternalLink />
              View Full Report
            </button>
          </aside>
        )}

      </div>

      <style>{`
        .spin-icon { animation: live-map-spin 1s linear infinite; }
        .spinner {
          width: 28px; height: 28px; border-radius: 50%;
          border: 3px solid #e5e7eb; border-top-color: #2563eb;
          animation: live-map-spin 0.8s linear infinite;
        }
        @keyframes live-map-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
};

export default LiveMap;