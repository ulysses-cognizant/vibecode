import axios from 'axios';

const GRAPHHOPPER_API_KEY = process.env.REACT_APP_GRAPHHOPPER_API_KEY || 'your_graphhopper_api_key';
const OPENROUTESERVICE_API_KEY = process.env.REACT_APP_OPENROUTESERVICE_API_KEY || 'your_openrouteservice_api_key';

class RoutingService {
  constructor() {
    this.activeProvider = 'openrouteservice'; // Default to OpenRouteService
  }

  /**
   * Calculate routes between origin and destination with pollution awareness
   * @param {Object} origin - {lat, lon} coordinates
   * @param {Object} destination - {lat, lon} coordinates
   * @param {Object} options - routing options
   * @returns {Promise<Array>} Array of route objects
   */
  async calculateRoutes(origin, destination, options = {}) {
    const {
      vehicle = 'car',
      avoidPollution = true,
      pollutionThreshold = 80,
      alternatives = true
    } = options;

    try {
      // Get basic routes
      const routes = await this.getBasicRoutes(origin, destination, vehicle, alternatives);
      
      if (!routes || routes.length === 0) {
        throw new Error('No routes found');
      }

      // Enhance routes with pollution data and health risk assessment
      const enhancedRoutes = await Promise.all(
        routes.map(route => this.enhanceRouteWithPollutionData(route, pollutionThreshold))
      );

      // Sort routes by pollution-adjusted score if pollution avoidance is enabled
      if (avoidPollution) {
        enhancedRoutes.sort((a, b) => a.healthScore - b.healthScore);
      }

      return enhancedRoutes;
    } catch (error) {
      console.error('Error calculating routes:', error);
      throw new Error('Failed to calculate routes. Please try again.');
    }
  }

  /**
   * Get basic routes from routing provider
   */
  async getBasicRoutes(origin, destination, vehicle, alternatives) {
    if (this.activeProvider === 'graphhopper') {
      return this.getGraphHopperRoutes(origin, destination, vehicle, alternatives);
    } else {
      return this.getOpenRouteServiceRoutes(origin, destination, vehicle, alternatives);
    }
  }

  /**
   * Get routes from GraphHopper API
   */
  async getGraphHopperRoutes(origin, destination, vehicle, alternatives) {
    const profileMap = {
      car: 'driving',
      bike: 'cycling',
      foot: 'foot-walking'
    };

    const profile = profileMap[vehicle] || 'driving';
    
    const url = `https://graphhopper.com/api/1/route`;
    const params = {
      point: [`${origin.lat},${origin.lon}`, `${destination.lat},${destination.lon}`],
      vehicle: profile,
      key: GRAPHHOPPER_API_KEY,
      instructions: true,
      points_encoded: false,
      alternative_route: alternatives ? { max_paths: 3 } : undefined
    };

    try {
      const response = await axios.get(url, { params });
      return this.parseGraphHopperResponse(response.data);
    } catch (error) {
      console.warn('GraphHopper API failed, falling back to mock data:', error);
      return this.getMockRoutes(origin, destination, vehicle);
    }
  }

  /**
   * Get routes from OpenRouteService API
   */
  async getOpenRouteServiceRoutes(origin, destination, vehicle, alternatives) {
    const profileMap = {
      car: 'driving-car',
      bike: 'cycling-regular',
      foot: 'foot-walking'
    };

    const profile = profileMap[vehicle] || 'driving-car';
    
    const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
    const headers = {
      'Authorization': OPENROUTESERVICE_API_KEY,
      'Content-Type': 'application/json'
    };

    const data = {
      coordinates: [[origin.lon, origin.lat], [destination.lon, destination.lat]],
      format: 'geojson',
      instructions: true,
      alternative_routes: alternatives ? { target_count: 2 } : undefined
    };

    try {
      const response = await axios.post(url, data, { headers });
      return this.parseOpenRouteServiceResponse(response.data);
    } catch (error) {
      console.warn('OpenRouteService API failed, falling back to mock data:', error);
      return this.getMockRoutes(origin, destination, vehicle);
    }
  }

  /**
   * Parse GraphHopper API response
   */
  parseGraphHopperResponse(data) {
    if (!data.paths || data.paths.length === 0) {
      return [];
    }

    return data.paths.map((path, index) => ({
      id: `graphhopper_${index}`,
      coordinates: path.points.coordinates.map(coord => [coord[1], coord[0]]), // [lat, lon]
      distance: path.distance,
      duration: path.time / 1000, // Convert to seconds
      instructions: path.instructions || [],
      provider: 'graphhopper'
    }));
  }

  /**
   * Parse OpenRouteService API response
   */
  parseOpenRouteServiceResponse(data) {
    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features.map((feature, index) => ({
      id: `openrouteservice_${index}`,
      coordinates: feature.geometry.coordinates.map(coord => [coord[1], coord[0]]), // [lat, lon]
      distance: feature.properties.segments[0].distance,
      duration: feature.properties.segments[0].duration,
      instructions: feature.properties.segments[0].steps || [],
      provider: 'openrouteservice'
    }));
  }

  /**
   * Generate mock routes for testing/fallback
   */
  getMockRoutes(origin, destination, vehicle) {
    const distance = this.calculateDistance(origin, destination);
    const baseDuration = this.estimateDuration(distance, vehicle);

    // Generate more realistic route coordinates with multiple waypoints
    const generateRouteCoordinates = (start, end, variation = 0) => {
      const points = [];
      const segments = 8; // More segments for smoother routes
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        
        // Linear interpolation with some road-like variation
        let lat = start.lat + (end.lat - start.lat) * t;
        let lon = start.lon + (end.lon - start.lon) * t;
        
        // Add some realistic road curvature
        if (i > 0 && i < segments) {
          const curveAmount = 0.001 * Math.sin(t * Math.PI * 2); // Sinusoidal variation
          lat += curveAmount * (1 + variation);
          lon += curveAmount * 0.5 * (1 + variation);
          
          // Add small random variations to simulate road following
          lat += (Math.random() - 0.5) * 0.0005 * (1 + variation);
          lon += (Math.random() - 0.5) * 0.0005 * (1 + variation);
        }
        
        points.push([lon, lat]); // [lon, lat] format for consistency
      }
      
      return points;
    };

    return [
      {
        id: 'mock_direct',
        name: 'Direct Route (Clean Air)',
        coordinates: generateRouteCoordinates(origin, destination, 0),
        distance: distance * 1000, // Convert to meters
        duration: baseDuration,
        pollution_level: 'low',
        pollutionScore: 45.2,
        healthScore: 2.1,
        instructions: [
          { text: 'Head towards destination via clean air route', distance: 0 },
          { text: 'Continue on main road', distance: distance * 300 },
          { text: 'Follow clean air corridor', distance: distance * 600 },
          { text: 'Arrive at destination', distance: distance * 1000 }
        ],
        provider: 'mock'
      },
      {
        id: 'mock_alternative',
        name: 'Alternative Route (Scenic)',
        coordinates: generateRouteCoordinates(origin, destination, 0.3),
        distance: distance * 1150, // 15% longer
        duration: baseDuration * 1.15,
        pollution_level: 'medium',
        pollutionScore: 67.8,
        healthScore: 3.2,
        instructions: [
          { text: 'Head towards destination via scenic route', distance: 0 },
          { text: 'Take detour through park area', distance: distance * 400 },
          { text: 'Continue on secondary roads', distance: distance * 800 },
          { text: 'Arrive at destination', distance: distance * 1150 }
        ],
        provider: 'mock'
      },
      {
        id: 'mock_fastest',
        name: 'Fastest Route (Main Roads)',
        coordinates: generateRouteCoordinates(origin, destination, -0.2),
        distance: distance * 950, // 5% shorter
        duration: baseDuration * 0.85,
        pollution_level: 'high',
        pollutionScore: 89.1,
        healthScore: 4.7,
        instructions: [
          { text: 'Head towards destination via main roads', distance: 0 },
          { text: 'Continue on major highway', distance: distance * 200 },
          { text: 'Take fastest route through city center', distance: distance * 700 },
          { text: 'Arrive at destination', distance: distance * 950 }
        ],
        provider: 'mock'
      }
    ];
  }

  /**
   * Enhance route with pollution data and health risk assessment
   */
  async enhanceRouteWithPollutionData(route, pollutionThreshold) {
    try {
      // Sample points along the route for pollution data
      const samplePoints = this.sampleRoutePoints(route.coordinates, 5);
      
      // Get pollution data for sample points
      const pollutionData = await Promise.all(
        samplePoints.map(point => this.getPollutionData(point.lat, point.lon))
      );

      // Calculate pollution metrics
      const avgPollution = pollutionData.reduce((sum, data) => sum + data.aqi, 0) / pollutionData.length;
      const maxPollution = Math.max(...pollutionData.map(data => data.aqi));
      const pollutionHotspots = pollutionData.filter(data => data.aqi > pollutionThreshold).length;

      // Calculate health risk score (lower is better)
      const healthScore = this.calculateHealthScore(route, avgPollution, maxPollution, pollutionHotspots);

      return {
        ...route,
        pollution: {
          average: Math.round(avgPollution),
          maximum: Math.round(maxPollution),
          hotspots: pollutionHotspots,
          samplePoints: pollutionData
        },
        healthScore,
        healthRisk: this.getHealthRiskLevel(avgPollution),
        recommendations: this.generateRecommendations(route, avgPollution, maxPollution)
      };
    } catch (error) {
      console.warn('Error enhancing route with pollution data:', error);
      return {
        ...route,
        pollution: { average: 50, maximum: 60, hotspots: 0, samplePoints: [] },
        healthScore: 50,
        healthRisk: 'moderate',
        recommendations: ['Monitor air quality during travel']
      };
    }
  }

  /**
   * Sample points along a route for pollution analysis
   */
  sampleRoutePoints(coordinates, numSamples) {
    if (coordinates.length <= numSamples) {
      return coordinates.map(coord => ({ lat: coord[0], lon: coord[1] }));
    }

    const samples = [];
    const step = Math.floor(coordinates.length / numSamples);
    
    for (let i = 0; i < coordinates.length; i += step) {
      samples.push({ lat: coordinates[i][0], lon: coordinates[i][1] });
    }

    return samples;
  }

  /**
   * Get pollution data for a specific point
   */
  async getPollutionData(lat, lon) {
    try {
      const response = await axios.get(`/api/air-quality/current/${lat}/${lon}`);
      return response.data.data;
    } catch (error) {
      // Return mock pollution data if API fails
      return {
        aqi: Math.floor(Math.random() * 100) + 20,
        pm25: Math.floor(Math.random() * 50) + 10,
        pm10: Math.floor(Math.random() * 60) + 15,
        no2: Math.floor(Math.random() * 40) + 10
      };
    }
  }

  /**
   * Calculate health score for a route (lower is better)
   */
  calculateHealthScore(route, avgPollution, maxPollution, hotspots) {
    const pollutionWeight = 0.6;
    const distanceWeight = 0.2;
    const durationWeight = 0.1;
    const hotspotsWeight = 0.1;

    const normalizedDistance = Math.min(route.distance / 10000, 1); // Normalize to 10km
    const normalizedDuration = Math.min(route.duration / 3600, 1); // Normalize to 1 hour
    const normalizedPollution = avgPollution / 100;
    const normalizedHotspots = Math.min(hotspots / 3, 1);

    return Math.round(
      (normalizedPollution * pollutionWeight +
       normalizedDistance * distanceWeight +
       normalizedDuration * durationWeight +
       normalizedHotspots * hotspotsWeight) * 100
    );
  }

  /**
   * Get health risk level based on pollution
   */
  getHealthRiskLevel(avgPollution) {
    if (avgPollution <= 50) return 'low';
    if (avgPollution <= 80) return 'moderate';
    if (avgPollution <= 120) return 'high';
    return 'very_high';
  }

  /**
   * Generate route recommendations
   */
  generateRecommendations(route, avgPollution, maxPollution) {
    const recommendations = [];

    if (avgPollution > 80) {
      recommendations.push('Consider postponing non-essential travel');
      recommendations.push('Use air filtration if available in vehicle');
    }

    if (maxPollution > 100) {
      recommendations.push('Avoid areas with highest pollution levels');
    }

    if (route.distance > 5000) {
      recommendations.push('Consider breaking journey into segments');
    }

    if (recommendations.length === 0) {
      recommendations.push('Air quality is good for travel');
    }

    return recommendations;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lon - point1.lon);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Estimate travel duration based on distance and vehicle type
   */
  estimateDuration(distance, vehicle) {
    const speeds = {
      car: 40, // km/h average in city
      bike: 15, // km/h average
      foot: 5   // km/h average walking speed
    };

    const speed = speeds[vehicle] || speeds.car;
    return (distance / speed) * 3600; // Convert to seconds
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Switch routing provider
   */
  setProvider(provider) {
    if (['graphhopper', 'openrouteservice'].includes(provider)) {
      this.activeProvider = provider;
    }
  }
}

export default new RoutingService();
