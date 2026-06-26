import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { useNavigate, NavLink } from 'react-router-dom';
import './HomePage.css';

// ── Utility Functions ─────────────────────────────────────────────────────────
const pm25ToAQI = (pm25) => {
  const breaks = [
    [0.0, 12.0, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200], [150.5, 250.4, 201, 300], [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ];
  if (pm25 === null || pm25 === undefined || isNaN(pm25)) return null;
  const C = Math.round(pm25 * 10) / 10;
  for (let i = 0; i < breaks.length; i++) {
    const [pmLo, pmHi, aLo, aHi] = breaks[i];
    if (C >= pmLo && C <= pmHi)
      return Math.round(((aHi - aLo) / (pmHi - pmLo)) * (C - pmLo) + aLo);
  }
  return Math.min(500, Math.round((C / 500.4) * 500));
};

const reverseGeocode = async (lat, lon) => {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&addressdetails=1`);
    const data = await res.json();
    const addr = data.address || {};
    const specific = addr.neighbourhood || addr.suburb || addr.village || addr.town || addr.city;
    const broad    = addr.city || addr.state_district || addr.state;
    if (specific && broad && specific !== broad) return `${specific}, ${broad}`;
    return specific || broad || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  } catch {
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
};

const weatherCodeToText = (code) => {
  const map = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail',
  };
  return map[code] || 'N/A';
};

const getWeatherEmoji = (code) => {
  const isDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
  const map = {
    0: isDay ? '☀️' : '🌙', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️',
    51: '🌧️', 53: '🌧️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '🌨️', 80: '🌧️', 81: '🌧️', 82: '🌧️',
    95: '🌩️', 96: '⛈️', 99: '⛈️',
  };
  return map[code] || '❓';
};

const formatTime = (str) => {
  if (!str) return '--:--';
  return new Date(str).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getDayLabel = (dateStr, idx) => {
  if (idx === 0) return 'TODAY';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
};

const getAQILabel = (aqi) => {
  if (!aqi) return { label: 'N/A', color: '#888' };
  if (aqi <= 50)  return { label: 'Good',          color: '#22c55e' };
  if (aqi <= 100) return { label: 'Moderate',       color: '#f59e0b' };
  if (aqi <= 150) return { label: 'Unhealthy*',     color: '#f97316' };
  if (aqi <= 200) return { label: 'Unhealthy',      color: '#ef4444' };
  if (aqi <= 300) return { label: 'Very Unhealthy', color: '#9333ea' };
  return             { label: 'Hazardous',         color: '#7f1d1d' };
};

// ── Component ─────────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate  = useNavigate();
  const chartRef  = useRef(null);
  const mapRef    = useRef(null);

  const [weatherData, setWeatherData] = useState(null);
  const [aqiData,     setAqiData]     = useState(null);
  const [location,    setLocation]    = useState('Detecting location...');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [incidents,   setIncidents]   = useState([]);

  // ── Fetch weather + AQI ──────────────────────────────────────────────────
  const fetchWeather = async (lat, lon) => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m,weathercode,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,weathercode,uv_index_max&current_weather=true&forecast_days=10&timezone=auto`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5`),
      ]);
      const wJson = await wRes.json();
      const aJson = await aRes.json();
      const loc   = await reverseGeocode(lat, lon);
      setLocation(loc);
      setWeatherData(wJson);
      setAqiData(aJson);
    } catch {
      setError('Could not fetch weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res  = await fetch('http://localhost:8000/api/v1/reports?limit=5');
      const data = await res.json();
      setIncidents(data.incidents || []);
    } catch {
      setIncidents([]);
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    setLoading(true);
    setLocation('Detecting your location...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => fetchWeather(coords.latitude, coords.longitude),
      () => { setError('Location access denied. Using New Delhi.'); fetchWeather(28.7041, 77.1025); }
    );
  };

  useEffect(() => { handleLocate(); fetchIncidents(); }, []);

  // ── Chart ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!weatherData?.daily || !chartRef.current) return;
    if (chartRef.current._chart) chartRef.current._chart.destroy();
    const { time, temperature_2m_max, temperature_2m_min, precipitation_sum } = weatherData.daily;
    chartRef.current._chart = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: time,
        datasets: [
          { label: 'Max °C',    data: temperature_2m_max, type: 'line', tension: 0.3, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)',  yAxisID: 'y' },
          { label: 'Min °C',    data: temperature_2m_min, type: 'line', tension: 0.3, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', yAxisID: 'y' },
          { label: 'Rain (mm)', data: precipitation_sum,  backgroundColor: 'rgba(59,130,246,0.5)', yAxisID: 'y1' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          y:  { position: 'left',  title: { display: true, text: 'Temperature (°C)' } },
          y1: { position: 'right', title: { display: true, text: 'Rain (mm)' }, grid: { drawOnChartArea: false } },
        },
      },
    });
  }, [weatherData]);

  // ── Leaflet map ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !weatherData) return;
    const lat = weatherData.latitude  || 28.7041;
    const lon = weatherData.longitude || 77.1025;
    const pins = incidents.length > 0
      ? incidents.map(i => ({
          lat:      i.location?.lat || lat + (Math.random() - 0.5) * 0.1,
          lon:      i.location?.lon || lon + (Math.random() - 0.5) * 0.1,
          severity: i.severity || 'Low',
          type:     i.disaster_type || 'Incident',
          score:    i.risk_score || 0,
        }))
      : [
          { lat: lat + 0.04, lon: lon + 0.04, severity: 'High',   type: 'Flood',     score: 94 },
          { lat: lat - 0.03, lon: lon + 0.02, severity: 'Medium', type: 'Landslide', score: 62 },
          { lat: lat + 0.02, lon: lon - 0.04, severity: 'Low',    type: 'Drizzle',   score: 20 },
        ];

    const colorMap = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };

    mapRef.current.srcdoc = `<!DOCTYPE html><html><head>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>body,html{margin:0;padding:0;}#map{width:100%;height:100vh;}</style>
    </head><body><div id="map"></div><script>
      const map = L.map('map').setView([${lat},${lon}], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);
      const pins = ${JSON.stringify(pins)};
      const colors = ${JSON.stringify(colorMap)};
      pins.forEach(p => {
        const color = colors[p.severity] || '#888';
        L.circle([p.lat, p.lon], {
          color, fillColor: color, fillOpacity: 0.35,
          radius: p.severity === 'High' ? 2500 : p.severity === 'Medium' ? 1800 : 1000
        }).addTo(map).bindPopup('<b>' + p.type + '</b><br>Severity: ' + p.severity + '<br>Risk Score: ' + p.score + '/100');
      });
    </script></body></html>`;
  }, [weatherData, incidents]);

  // ── Derived values ────────────────────────────────────────────────────────
  const cw      = weatherData?.current_weather || {};
  const hourly  = weatherData?.hourly           || {};
  const daily   = weatherData?.daily            || {};
  const aqiNow  = pm25ToAQI(aqiData?.hourly?.pm2_5?.[0]);
  const aqiInfo = getAQILabel(aqiNow);

  return (
    <div className="hp-root">

      {/* ── HERO ── */}
      <section className="hp-hero">
        <div className="hp-hero-content">
          <h1>Stay Ahead of Disasters</h1>
          <p>Real-time AI-powered monitoring of weather, air quality, and disaster risks to keep your community safe.</p>
          <div className="hp-hero-btns">
            <button className="hp-btn-primary" onClick={handleLocate}>
              📍 Update Location
            </button>
            {/* NavLink keeps the active state in sync with the Header nav */}
            <NavLink to="/report-hazard" className="hp-btn-secondary hp-btn-link">
              🚨 Report Hazard
            </NavLink>
            <NavLink to="/live-map" className="hp-btn-secondary hp-btn-link">
              🗺️ Live Map
            </NavLink>
          </div>
        </div>
      </section>

      {/* ── STATS BANNER ── */}
      <div className="hp-stats">
        <div className="hp-stat">
          <span className="hp-stat-val">{cw.temperature ?? '--'}°C</span>
          <span className="hp-stat-lbl">Temperature</span>
        </div>
        <div className="hp-stat">
          <span className="hp-stat-val" style={{ color: aqiInfo.color }}>{aqiNow ?? '--'}</span>
          <span className="hp-stat-lbl">AQI — {aqiInfo.label}</span>
        </div>
        <div className="hp-stat">
          <span className="hp-stat-val">{cw.windspeed ?? '--'}</span>
          <span className="hp-stat-lbl">Wind km/h</span>
        </div>
        <div className="hp-stat">
          <span className="hp-stat-val">{hourly.relativehumidity_2m?.[0] ?? '--'}%</span>
          <span className="hp-stat-lbl">Humidity</span>
        </div>
      </div>

      {loading && <div className="hp-loading">⏳ Fetching weather data...</div>}
      {error   && <div className="hp-error">⚠️ {error}</div>}

      {/* ── MAIN CONTENT ── */}
      <div className="hp-main">

        {/* LEFT COLUMN */}
        <div className="hp-left">

          {/* Current Weather Card */}
          <div className="hp-card">
            <div className="hp-card-head">
              <h3>Location &amp; Current Weather</h3>
              <button className="hp-update-btn" onClick={handleLocate}>Update</button>
            </div>
            <div className="hp-weather-info">
              <div className="hp-info-item">📍 {location}</div>
              <div className="hp-info-item">{getWeatherEmoji(cw.weathercode)} {weatherCodeToText(cw.weathercode)}</div>
              <div className="hp-info-item">🌡️ {cw.temperature ?? '--'}°C</div>
              <div className="hp-info-item">💨 {cw.windspeed ?? '--'} km/h</div>
            </div>
          </div>

          {/* Hazard Map — "View Full Map" links to /live-map */}
          <div className="hp-card">
            <div className="hp-card-head">
              <h3>🗺️ Nearby Hazards</h3>
              <NavLink to="/live-map" className="hp-update-btn hp-btn-link">
                Full Map ↗
              </NavLink>
            </div>
            <div className="hp-map-wrap">
              <iframe ref={mapRef} title="Hazard Map" className="hp-map-iframe" />
              <div className="hp-map-legend">
                <span><i style={{ background: '#ef4444' }}></i>High</span>
                <span><i style={{ background: '#f59e0b' }}></i>Medium</span>
                <span><i style={{ background: '#22c55e' }}></i>Low</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="hp-right">

          {/* 10-Day Chart — "Full Analytics" links to /analytics */}
          <div className="hp-card">
            <div className="hp-card-head">
              <h3>📈 10-Day Forecast</h3>
              <NavLink to="/analytics" className="hp-update-btn hp-btn-link">
                Analytics ↗
              </NavLink>
            </div>
            <div className="hp-chart-wrap">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          {/* Daily Forecast */}
          <div className="hp-card">
            <div className="hp-card-head"><h3>📅 Daily Forecast</h3></div>
            <div className="hp-scroll-row">
              {daily.time?.map((date, i) => (
                <div key={i} className="hp-day-item">
                  <div className="hp-day-name">{getDayLabel(date, i)}</div>
                  <div className="hp-day-emoji">{getWeatherEmoji(daily.weathercode?.[i])}</div>
                  <div className="hp-day-temps">
                    {Math.round(daily.temperature_2m_max?.[i])}° / {Math.round(daily.temperature_2m_min?.[i])}°
                  </div>
                  <div className="hp-day-rain">{daily.precipitation_sum?.[i]}mm</div>
                </div>
              ))}
            </div>
          </div>

          {/* Next 12 Hours */}
          <div className="hp-card">
            <div className="hp-card-head"><h3>⏱️ Next 12 Hours</h3></div>
            <div className="hp-scroll-row">
              {hourly.time?.slice(0, 12).map((t, i) => (
                <div key={i} className="hp-hour-item">
                  <div className="hp-day-name">{formatTime(t)}</div>
                  <div className="hp-day-emoji">{getWeatherEmoji(hourly.weathercode?.[i])}</div>
                  <div className="hp-day-temps">{Math.round(hourly.temperature_2m?.[i])}°</div>
                  <div className="hp-day-rain">{hourly.precipitation?.[i]}mm</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="hp-footer">
        <div className="hp-footer-col">
          <h3>JalRakshak</h3>
          <p>Protecting coastal communities through real-time monitoring of weather, air quality, and water hazards.</p>
        </div>
        <div className="hp-footer-col">
          <h4>Quick Links</h4>
          <NavLink to="/home">Home</NavLink>
          <NavLink to="/report-hazard">Report Hazard</NavLink>
          <NavLink to="/live-map">Live Dashboard</NavLink>
          <NavLink to="/socialmedia">Social Media</NavLink>
          <NavLink to="/socialmedia">Connect with us</NavLink>
        </div>
        <div className="hp-footer-col">
          <h4>Contact</h4>
          <p>Email: support@jalrakshak.com</p>
          <p>Phone: +91 1234567890</p>
          <p>Address: New Delhi, India</p>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;