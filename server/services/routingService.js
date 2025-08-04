const axios = require('axios');
const airQualityService = require('./airQualityService');

class RoutingService {
  constructor() {
    this.graphHopperKey = process.env.GRAPHHOPPER_API_KEY;
    this.openRouteServiceKey = process.env.OPENROUTESERVICE_API_KEY;
    this.baseGraphHopperURL = 'https://graphhopper.com/api/1';
    this.baseOpenRouteURL = 'https://api.openrouteservice.org/v2';
  }

  /**
   * Calculate multiple route options with pollution weighting
   */
  async calculateCleanRoutes(origin, destination, options = {}) {
    const { 
      vehicle = 'car', 
      avoidHighPollution = true,
      maxAlternatives = 3,
      pollutionThreshold = 80 // AQI threshold
    } = options;

    try {
      // Get base routes from available services
      let allRoutes = [];

      // Try GraphHopper first (if key available)
      if (this.graphHopperKey && this.graphHopperKey !== 'your_graphhopper_api_key_here') {
        try {
          const graphHopperRoutes = await this.getGraphHopperRoutes(origin, destination, vehicle, maxAlternatives);
          allRoutes = allRoutes.concat(graphHopperRoutes.map(route => ({
            ...route,
            provider: 'GraphHopper'
          })));
        } catch (error) {
          console.warn('GraphHopper API error:', error.message);
        }
      }

      // Try OpenRouteService (if key available)
      if (this.openRouteServiceKey && this.openRouteServiceKey !== 'your_openrouteservice_api_key_here') {
        try {
          const openRouteRoutes = await this.getOpenRouteServiceRoutes(origin, destination, vehicle, maxAlternatives);
          allRoutes = allRoutes.concat(openRouteRoutes.map(route => ({
            ...route,
            provider: 'OpenRouteService'
          })));
        } catch (error) {
          console.warn('OpenRouteService API error:', error.message);
        }
      }

      // If no external APIs available, generate mock routes
      if (allRoutes.length === 0) {
        console.log('Generating mock routes...');
        allRoutes = await this.generateMockRoutes(origin, destination, vehicle);
        console.log('Mock routes generated:', allRoutes, 'type:', typeof allRoutes, 'isArray:', Array.isArray(allRoutes));
      }

      if (avoidHighPollution && allRoutes.length > 0) {
        console.log('Enriching routes with pollution data...');
        // Enrich routes with pollution data and calculate clean scores
        allRoutes = await this.enrichRoutesWithPollutionData(allRoutes, pollutionThreshold);
        console.log('Routes enriched:', allRoutes, 'type:', typeof allRoutes, 'isArray:', Array.isArray(allRoutes));
      }

      console.log('allRoutes before sort:', allRoutes, 'type:', typeof allRoutes, 'isArray:', Array.isArray(allRoutes));

      // Ensure allRoutes is an array before sorting
      if (!Array.isArray(allRoutes)) {
        console.error('allRoutes is not an array:', allRoutes);
        throw new Error('Failed to generate valid routes array');
      }

      // Sort by clean score (lower pollution exposure)
      allRoutes.sort((a, b) => (a.pollutionScore || 0) - (b.pollutionScore || 0));

      // Limit to requested number of alternatives
      const routes = allRoutes.slice(0, maxAlternatives);

      return {
        success: true,
        routes: routes,
        cleanestRoute: routes.length > 0 ? routes[0] : null,
        totalRoutes: routes.length
      };

    } catch (error) {
      console.error('Route calculation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate routes'
      };
    }
  }

  /**
   * Get routes from GraphHopper API
   */
  async getGraphHopperRoutes(origin, destination, vehicle, alternatives = 3) {
    const vehicleProfile = this.mapVehicleToGraphHopper(vehicle);
    
    const params = {
      point: [`${origin.lat},${origin.lon}`, `${destination.lat},${destination.lon}`],
      vehicle: vehicleProfile,
      locale: 'en',
      calc_points: true,
      debug: false,
      elevation: false,
      points_encoded: false,
      type: 'json',
      algorithm: 'alternative_route',
      'alternative_route.max_paths': alternatives,
      key: this.graphHopperKey
    };

    const response = await axios.get(`${this.baseGraphHopperURL}/route`, { params });
    
    if (response.data.paths) {
      return response.data.paths.map((path, index) => ({
        id: `gh_${index}`,
        coordinates: path.points.coordinates,
        distance: path.distance,
        duration: path.time / 1000, // Convert to seconds
        provider: 'GraphHopper',
        instructions: path.instructions || []
      }));
    }

    throw new Error('No routes found from GraphHopper');
  }

  /**
   * Get routes from OpenRouteService API
   */
  async getOpenRouteServiceRoutes(origin, destination, vehicle, alternatives = 3) {
    const vehicleProfile = this.mapVehicleToOpenRoute(vehicle);
    
    const requestBody = {
      coordinates: [[origin.lon, origin.lat], [destination.lon, destination.lat]],
      format_out: 'geojson',
      geometry_format: 'geojson',
      instructions_format: 'json',
      alternative_routes: {
        target_count: alternatives,
        weight_factor: 1.4,
        share_factor: 0.6
      }
    };

    const headers = {
      'Authorization': this.openRouteServiceKey,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(
      `${this.baseOpenRouteURL}/directions/${vehicleProfile}/geojson`,
      requestBody,
      { headers }
    );

    if (response.data.features) {
      return response.data.features.map((feature, index) => ({
        id: `ors_${index}`,
        coordinates: feature.geometry.coordinates,
        distance: feature.properties.segments[0].distance,
        duration: feature.properties.segments[0].duration,
        provider: 'OpenRouteService',
        instructions: feature.properties.segments[0].steps || []
      }));
    }

    throw new Error('No routes found from OpenRouteService');
  }

  /**
   * Generate mock routes when external APIs are not available
   */
  /**
   * Generate mock routes with real road-like paths using OSRM (free OpenStreetMap routing)
   */
  async generateMockRoutes(origin, destination, vehicle) {
    try {
      // Try to use OSRM (free OpenStreetMap routing service)
      const osrmRoutes = await this.getOSRMRoutes(origin, destination, vehicle);
      if (osrmRoutes.length > 0) {
        return osrmRoutes;
      }
    } catch (error) {
      console.warn('OSRM routing failed, using enhanced mock routes:', error.message);
    }

    // Fallback to enhanced mock routes with realistic waypoints
    return this.generateEnhancedMockRoutes(origin, destination, vehicle);
  }

  /**
   * Get routes from free OSRM service (OpenStreetMap routing)
   */
  async getOSRMRoutes(origin, destination, vehicle) {
    const profiles = {
      'car': 'driving',
      'bike': 'cycling', 
      'foot': 'walking'
    };
    
    const profile = profiles[vehicle] || 'driving';
    const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    
    const params = {
      overview: 'full',
      geometries: 'geojson',
      alternatives: 'true',
      steps: 'true'
    };
    
    const response = await axios.get(url, { 
      params,
      timeout: 10000 // 10 second timeout
    });
    
    if (response.data.routes && response.data.routes.length > 0) {
      return response.data.routes.map((route, index) => ({
        id: `osrm_${index}`,
        coordinates: route.geometry.coordinates, // [lon, lat] format
        distance: route.distance,
        duration: route.duration,
        provider: 'OSRM (OpenStreetMap)',
        instructions: route.legs?.[0]?.steps?.map(step => ({
          text: step.maneuver?.instruction || 'Continue',
          distance: step.distance
        })) || [
          { text: 'Head towards destination', distance: 0 },
          { text: 'Arrive at destination', distance: route.distance }
        ]
      }));
    }
    
    return [];
  }

  /**
   * Generate enhanced mock routes with realistic road-like patterns
   */
  generateEnhancedMockRoutes(origin, destination, vehicle) {
    const routes = [];
    const baseDistance = this.calculateDistance(origin, destination) * 1000; // Convert to meters
    const baseDuration = this.estimateDuration(baseDistance / 1000, vehicle);
    
    // Generate 3 different route types
    const routeConfigs = [
      {
        name: 'Optimal Route',
        distanceMultiplier: 1.0,
        durationMultiplier: 1.0,
        variation: 'direct',
        pollution_level: 'low'
      },
      {
        name: 'Scenic Route',
        distanceMultiplier: 1.2,
        durationMultiplier: 1.15,
        variation: 'scenic',
        pollution_level: 'medium'
      },
      {
        name: 'Highway Route',
        distanceMultiplier: 0.95,
        durationMultiplier: 0.85,
        variation: 'highway',
        pollution_level: 'high'
      }
    ];

    routeConfigs.forEach((config, index) => {
      const route = {
        id: `enhanced_mock_${index}`,
        name: config.name,
        coordinates: this.generateRealisticCoordinates(origin, destination, config.variation),
        distance: Math.round(baseDistance * config.distanceMultiplier),
        duration: Math.round(baseDuration * config.durationMultiplier),
        pollution_level: config.pollution_level,
        provider: 'Enhanced Mock',
        instructions: this.generateRealisticInstructions(origin, destination, config.name)
      };
      routes.push(route);
    });

    return routes;
  }

  /**
   * Generate realistic coordinates that simulate road paths
   */
  generateRealisticCoordinates(origin, destination, variation) {
    const coordinates = [];
    const segments = 25; // More segments for smoother paths
    
    // Calculate great circle distance and bearing
    const totalDistance = this.calculateDistance(origin, destination);
    const bearing = this.calculateBearing(origin, destination);
    
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments;
      
      // Base interpolation
      let lat = origin.lat + (destination.lat - origin.lat) * progress;
      let lon = origin.lon + (destination.lon - origin.lon) * progress;
      
      // Add realistic road-like variations based on route type
      if (i > 0 && i < segments) {
        let deviation = 0;
        
        switch (variation) {
          case 'direct':
            // Minimal deviation, following main roads
            deviation = 0.001 * Math.sin(progress * Math.PI * 2);
            break;
          case 'scenic':
            // More curves, avoiding highways
            deviation = 0.003 * Math.sin(progress * Math.PI * 4) + 
                       0.002 * Math.cos(progress * Math.PI * 3);
            break;
          case 'highway':
            // Straighter path, following major routes
            deviation = 0.0005 * Math.sin(progress * Math.PI);
            break;
        }
        
        // Apply deviation perpendicular to the bearing
        const perpBearing = bearing + Math.PI / 2;
        lat += deviation * Math.sin(perpBearing);
        lon += deviation * Math.cos(perpBearing);
        
        // Add small random variations to simulate road following
        lat += (Math.random() - 0.5) * 0.0001;
        lon += (Math.random() - 0.5) * 0.0001;
      }
      
      coordinates.push([lon, lat]); // [lon, lat] format
    }
    
    return coordinates;
  }

  /**
   * Generate realistic turn-by-turn instructions
   */
  generateRealisticInstructions(origin, destination, routeName) {
    const instructions = [];
    const bearing = this.calculateBearing(origin, destination);
    const direction = this.bearingToDirection(bearing);
    
    instructions.push({
      text: `Head ${direction} from origin`,
      distance: 0
    });
    
    if (routeName.includes('Highway')) {
      instructions.push({ text: 'Enter highway/motorway', distance: 500 });
      instructions.push({ text: 'Continue on highway for main journey', distance: 2000 });
      instructions.push({ text: 'Exit highway near destination', distance: -1000 });
    } else if (routeName.includes('Scenic')) {
      instructions.push({ text: 'Take scenic route through countryside', distance: 1000 });
      instructions.push({ text: 'Continue on minor roads', distance: 3000 });
      instructions.push({ text: 'Follow winding roads', distance: 5000 });
    } else {
      instructions.push({ text: 'Continue on main road', distance: 1000 });
      instructions.push({ text: 'Follow direct route', distance: 3000 });
    }
    
    instructions.push({
      text: 'Arrive at destination',
      distance: -1
    });
    
    return instructions;
  }

  /**
   * Convert bearing to cardinal direction
   */
  bearingToDirection(bearing) {
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const index = Math.round(((bearing * 180 / Math.PI) + 360) % 360 / 45) % 8;
    return directions[index];
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(origin, destination) {
    const dLon = (destination.lon - origin.lon) * Math.PI / 180;
    const lat1 = origin.lat * Math.PI / 180;
    const lat2 = destination.lat * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    return Math.atan2(y, x);
  }

  /**
   * Enrich routes with air quality data
   */
  async enrichRoutesWithPollutionData(routes, threshold) {
    const enrichedRoutes = [];

    for (const route of routes) {
      try {
        // Sample points along the route for air quality data
        const samplePoints = this.sampleRoutePoints(route.coordinates, 5);
        let totalAQI = 0;
        let validSamples = 0;
        let highPollutionSegments = 0;

        for (const point of samplePoints) {
          try {
            const airQuality = await airQualityService.getCurrentAirQuality(point.lat, point.lon);
            if (airQuality.success && airQuality.data) {
              const aqi = this.calculateAQI(airQuality.data);
              totalAQI += aqi;
              validSamples++;

              if (aqi > threshold) {
                highPollutionSegments++;
              }
            }
          } catch (error) {
            // Use mock AQI if service fails
            const mockAQI = 50 + Math.random() * 50; // 50-100 range
            totalAQI += mockAQI;
            validSamples++;

            if (mockAQI > threshold) {
              highPollutionSegments++;
            }
          }
        }

        const avgAQI = validSamples > 0 ? totalAQI / validSamples : 75;
        
        enrichedRoutes.push({
          ...route,
          pollutionScore: avgAQI,
          healthRisk: this.calculateHealthRisk(avgAQI),
          highPollutionSegments: highPollutionSegments,
          airQualityData: {
            averageAQI: avgAQI,
            sampledPoints: validSamples,
            threshold: threshold
          }
        });

      } catch (error) {
        console.warn(`Failed to enrich route ${route.id} with pollution data:`, error);
        // Add route with default pollution data
        enrichedRoutes.push({
          ...route,
          pollutionScore: 75, // Default moderate AQI
          healthRisk: 'moderate',
          highPollutionSegments: 0
        });
      }
    }

    return enrichedRoutes;
  }

  /**
   * Sample points along a route for air quality checking
   */
  sampleRoutePoints(coordinates, sampleCount) {
    if (coordinates.length <= sampleCount) {
      return coordinates.map(coord => ({ lat: coord[1], lon: coord[0] }));
    }

    const samples = [];
    const interval = Math.floor(coordinates.length / sampleCount);

    for (let i = 0; i < coordinates.length; i += interval) {
      const coord = coordinates[i];
      samples.push({ lat: coord[1], lon: coord[0] });
    }

    return samples.slice(0, sampleCount);
  }

  /**
   * Calculate AQI from air quality data
   */
  calculateAQI(airQualityData) {
    // Use PM2.5 as primary indicator, with fallbacks
    const components = airQualityData.components || {};
    const pm25 = components.pm2_5;
    const pm10 = components.pm10;
    const no2 = components.no2;
    const o3 = components.o3;

    // Simple AQI calculation based on PM2.5
    if (pm25 !== undefined) {
      if (pm25 <= 12) return 25;
      if (pm25 <= 35) return 50;
      if (pm25 <= 55) return 75;
      if (pm25 <= 150) return 100;
      if (pm25 <= 250) return 150;
      return 200;
    }

    // Fallback to simulated AQI
    return 50 + Math.random() * 50;
  }

  /**
   * Calculate health risk level from AQI
   */
  calculateHealthRisk(aqi) {
    if (aqi <= 50) return 'low';
    if (aqi <= 100) return 'moderate';
    if (aqi <= 150) return 'high';
    return 'very_high';
  }

  /**
   * Get health zones (schools, hospitals, etc.) in an area
   */
  async getHealthZones(center, radius = 5000) {
    // Mock health zones data - in production, this would query a database
    const mockZones = [
      {
        id: 1,
        type: 'school',
        name: 'Local Primary School',
        coords: [center.lat + 0.005, center.lon + 0.005],
        priority: 'high'
      },
      {
        id: 2,
        type: 'hospital',
        name: 'Community Hospital',
        coords: [center.lat - 0.003, center.lon + 0.008],
        priority: 'high'
      },
      {
        id: 3,
        type: 'elderly_care',
        name: 'Retirement Home',
        coords: [center.lat + 0.002, center.lon - 0.006],
        priority: 'medium'
      }
    ];

    return {
      success: true,
      zones: mockZones.filter(zone => {
        const distance = this.calculateDistance(center, { lat: zone.coords[0], lon: zone.coords[1] });
        return distance <= radius;
      })
    };
  }

  /**
   * Get real-time traffic and pollution conditions
   */
  async getRealTimeConditions(bounds) {
    // Mock real-time data
    return {
      success: true,
      conditions: {
        traffic: 'moderate',
        averageAQI: 65,
        timestamp: new Date().toISOString(),
        alerts: []
      }
    };
  }

  // Helper methods
  mapVehicleToGraphHopper(vehicle) {
    const mapping = {
      car: 'car',
      bike: 'bike',
      foot: 'foot'
    };
    return mapping[vehicle] || 'car';
  }

  mapVehicleToOpenRoute(vehicle) {
    const mapping = {
      car: 'driving-car',
      bike: 'cycling-regular',
      foot: 'foot-walking'
    };
    return mapping[vehicle] || 'driving-car';
  }

  calculateDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = point1.lat * Math.PI / 180;
    const lat2Rad = point2.lat * Math.PI / 180;
    const deltaLatRad = (point2.lat - point1.lat) * Math.PI / 180;
    const deltaLonRad = (point2.lon - point1.lon) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  estimateDuration(distance, vehicle) {
    const speeds = {
      car: 13.89, // 50 km/h in m/s
      bike: 4.17, // 15 km/h in m/s
      foot: 1.39  // 5 km/h in m/s
    };
    
    return distance / (speeds[vehicle] || speeds.car);
  }

  getDirection(origin, destination) {
    const deltaLat = destination.lat - origin.lat;
    const deltaLon = destination.lon - origin.lon;
    
    if (Math.abs(deltaLat) > Math.abs(deltaLon)) {
      return deltaLat > 0 ? 'north' : 'south';
    } else {
      return deltaLon > 0 ? 'east' : 'west';
    }
  }
}

module.exports = new RoutingService();
