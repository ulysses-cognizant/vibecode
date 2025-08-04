import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making API request to: ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const airQualityAPI = {
  // Geocoding endpoints
  searchLocation: async (query) => {
    const response = await api.get('/geocoding/search', { params: { query } });
    return response.data;
  },

  getCoordinatesFromPostcode: async (postcode) => {
    const response = await api.get(`/geocoding/postcode/${postcode}`);
    return response.data;
  },

  reverseGeocode: async (lat, lon) => {
    const response = await api.get(`/geocoding/reverse/${lat}/${lon}`);
    return response.data;
  },

  // Air quality endpoints
  getCurrentAirQuality: async (lat, lon) => {
    const response = await api.get(`/air-quality/current/${lat}/${lon}`);
    return response.data;
  },

  getAirQualityForecast: async (lat, lon) => {
    const response = await api.get(`/air-quality/forecast/${lat}/${lon}`);
    return response.data;
  },

  getHistoricalAirQuality: async (lat, lon, start, end) => {
    const params = {};
    if (start) params.start = start;
    if (end) params.end = end;
    
    const response = await api.get(`/air-quality/history/${lat}/${lon}`, { params });
    return response.data;
  },

  getUKRegionsAirQuality: async () => {
    const response = await api.get('/air-quality/regions');
    return response.data;
  },

  getPollutionRankings: async (pollutant = 'aqi') => {
    const response = await api.get('/air-quality/rankings', { params: { pollutant } });
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

export default airQualityAPI;
