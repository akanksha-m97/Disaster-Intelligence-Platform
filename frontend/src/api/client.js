// src/api/client.js
// Moved from src/services/api.js. No Firebase code existed in this file
// originally — it was already a plain axios client reading a JWT from
// localStorage — so the only change here is the file location and adding
// an /auth path the new authService.js relies on. Domain-specific
// services (weather, social, hazard, report, location, utility) are
// unchanged and moved into src/api/ as a single file for now; split
// further if this grows.

import axios from "axios";

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT from localStorage to every request, if present.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unwrap response data; normalize errors.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error.response?.data || error);
  }
);

export default api;

// ---- Weather Services ----
export const weatherService = {
  getCurrentWeather: async (lat, lon) => {
    try {
      return await api.get(`/weather/${lat}/${lon}`);
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  },

  getLocationDetails: async (lat, lon) => {
    try {
      return await api.get(`/location/${lat}/${lon}`);
    } catch (error) {
      throw new Error(`Failed to fetch location details: ${error.message}`);
    }
  },
};

// ---- Social Media Analytics Services ----
export const socialService = {
  getTwitterAnalytics: async (query, lat = null, lon = null, radius = "50km") => {
    try {
      const params = new URLSearchParams({ query });
      if (lat && lon) {
        params.append("lat", lat);
        params.append("lon", lon);
        params.append("radius", radius);
      }
      return await api.get(`/social/twitter/${query}?${params}`);
    } catch (error) {
      throw new Error(`Failed to fetch Twitter data: ${error.message}`);
    }
  },

  getRedditAnalytics: async (query, limit = 25, time = "week") => {
    try {
      return await api.get(`/social/reddit/${query}?limit=${limit}&time=${time}`);
    } catch (error) {
      throw new Error(`Failed to fetch Reddit data: ${error.message}`);
    }
  },

  getCombinedSocialAnalytics: async (query, lat = null, lon = null) => {
    try {
      const [twitterData, redditData] = await Promise.allSettled([
        socialService.getTwitterAnalytics(query, lat, lon),
        socialService.getRedditAnalytics(query),
      ]);

      return {
        twitter: twitterData.status === "fulfilled" ? twitterData.value : null,
        reddit: redditData.status === "fulfilled" ? redditData.value : null,
        combinedAnalytics: {
          totalPosts:
            (twitterData.value?.tweets?.length || 0) +
            (redditData.value?.posts?.length || 0),
          sentiment: combineSentimentData(twitterData.value, redditData.value),
          keywords: combineKeywords(twitterData.value, redditData.value),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch combined social data: ${error.message}`);
    }
  },
};

// ---- Hazard Services ----
export const hazardService = {
  getCurrentHazards: async (lat = null, lon = null, radius = 100) => {
    try {
      const params = new URLSearchParams();
      if (lat && lon) {
        params.append("lat", lat);
        params.append("lon", lon);
        params.append("radius", radius);
      }
      return await api.get(`/hazards/current?${params}`);
    } catch (error) {
      throw new Error(`Failed to fetch hazard data: ${error.message}`);
    }
  },
};

// ---- Report Services ----
export const reportService = {
  submitReport: async (reportData) => {
    try {
      return await api.post("/reports", reportData);
    } catch (error) {
      throw new Error(`Failed to submit report: ${error.message}`);
    }
  },

  getReports: async (lat = null, lon = null, radius = 50, hazardType = null) => {
    try {
      const params = new URLSearchParams();
      if (lat && lon) {
        params.append("lat", lat);
        params.append("lon", lon);
        params.append("radius", radius);
      }
      if (hazardType) {
        params.append("hazard_type", hazardType);
      }
      return await api.get(`/reports?${params}`);
    } catch (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }
  },
};

// ---- Geolocation Services ----
export const locationService = {
  getCurrentPosition: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let message = "Failed to get location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information unavailable";
              break;
            case error.TIMEOUT:
              message = "Location request timed out";
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  },

  watchPosition: (callback, errorCallback) => {
    if (!navigator.geolocation) {
      errorCallback(new Error("Geolocation is not supported"));
      return null;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
    };

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      errorCallback,
      options
    );
  },
};

// ---- Utility Services ----
export const utilityService = {
  healthCheck: async () => {
    try {
      return await api.get("/health");
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },

  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },
};

// ---- Helper functions ----
function combineSentimentData(twitterData, redditData) {
  const combined = { positive: 0, negative: 0, neutral: 0 };

  if (twitterData?.analytics?.sentiment_distribution) {
    Object.keys(combined).forEach((key) => {
      combined[key] += twitterData.analytics.sentiment_distribution[key] || 0;
    });
  }

  if (redditData?.analytics?.sentiment_distribution) {
    Object.keys(combined).forEach((key) => {
      combined[key] += redditData.analytics.sentiment_distribution[key] || 0;
    });
  }

  return combined;
}

function combineKeywords(twitterData, redditData) {
  const keywordMap = new Map();

  if (twitterData?.analytics?.top_keywords) {
    twitterData.analytics.top_keywords.forEach(({ keyword, count }) => {
      keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + count);
    });
  }

  if (redditData?.analytics?.top_keywords) {
    redditData.analytics.top_keywords.forEach(({ keyword, count }) => {
      keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + count);
    });
  }

  return Array.from(keywordMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));
}