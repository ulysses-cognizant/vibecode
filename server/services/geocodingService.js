const axios = require('axios');

class GeocodingService {
  constructor() {
    this.openWeatherGeoURL = 'http://api.openweathermap.org/geo/1.0';
    this.mapboxURL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  }

  async searchLocation(query) {
    try {
      // Try OpenWeatherMap geocoding first
      const owmResults = await this.searchWithOpenWeatherMap(query);
      
      // If we have good results, return them, otherwise try Mapbox
      if (owmResults.length > 0) {
        return { results: owmResults, source: 'openweathermap' };
      }

      // Fallback to Mapbox if available
      if (this.mapboxToken) {
        const mapboxResults = await this.searchWithMapbox(query);
        return { results: mapboxResults, source: 'mapbox' };
      }

      return { results: [], source: 'none' };
    } catch (error) {
      console.error('Error in location search:', error.message);
      throw new Error('Failed to search location');
    }
  }

  async searchWithOpenWeatherMap(query) {
    try {
      const response = await axios.get(`${this.openWeatherGeoURL}/direct`, {
        params: {
          q: `${query},GB`,
          limit: 5,
          appid: this.apiKey
        }
      });

      return response.data.map(location => {
        const stateStr = location.state ? `, ${location.state}` : '';
        return {
          name: location.name,
          country: location.country,
          state: location.state,
          lat: location.lat,
          lon: location.lon,
          displayName: `${location.name}${stateStr}, ${location.country}`
        };
      });
    } catch (error) {
      console.error('OpenWeatherMap geocoding error:', error.response?.data || error.message);
      return [];
    }
  }

  async searchWithMapbox(query) {
    try {
      const response = await axios.get(`${this.mapboxURL}/${encodeURIComponent(query)}.json`, {
        params: {
          access_token: this.mapboxToken,
          country: 'GB',
          limit: 5,
          types: 'place,locality,neighborhood,address'
        }
      });

      return response.data.features.map(feature => ({
        name: feature.text,
        country: 'GB',
        state: this.extractRegion(feature.place_name),
        lat: feature.center[1],
        lon: feature.center[0],
        displayName: feature.place_name,
        postcode: this.extractPostcode(feature.place_name)
      }));
    } catch (error) {
      console.error('Mapbox geocoding error:', error.response?.data || error.message);
      return [];
    }
  }

  async getCoordinatesFromPostcode(postcode) {
    try {
      // Clean up postcode format
      const cleanPostcode = postcode.replace(/\s+/g, ' ').trim().toUpperCase();
      
      // Try OpenWeatherMap first
      const response = await axios.get(`${this.openWeatherGeoURL}/zip`, {
        params: {
          zip: `${cleanPostcode},GB`,
          appid: this.apiKey
        }
      });

      return {
        postcode: cleanPostcode,
        name: response.data.name,
        country: response.data.country,
        lat: response.data.lat,
        lon: response.data.lon
      };
    } catch (error) {
      // Fallback to Mapbox if OpenWeatherMap fails
      if (this.mapboxToken) {
        try {
          const mapboxResponse = await axios.get(`${this.mapboxURL}/${encodeURIComponent(postcode)}.json`, {
            params: {
              access_token: this.mapboxToken,
              country: 'GB',
              types: 'postcode'
            }
          });

          if (mapboxResponse.data.features.length > 0) {
            const feature = mapboxResponse.data.features[0];
            return {
              postcode: postcode,
              name: feature.text,
              country: 'GB',
              lat: feature.center[1],
              lon: feature.center[0],
              displayName: feature.place_name
            };
          }
        } catch (mapboxError) {
          console.error('Mapbox postcode lookup error:', mapboxError.response?.data || mapboxError.message);
        }
      }

      console.error('Postcode lookup error:', error.response?.data || error.message);
      throw new Error(`Invalid or not found postcode: ${postcode}`);
    }
  }

  async reverseGeocode(lat, lon) {
    try {
      // Try OpenWeatherMap reverse geocoding first
      const response = await axios.get(`${this.openWeatherGeoURL}/reverse`, {
        params: {
          lat,
          lon,
          limit: 1,
          appid: this.apiKey
        }
      });

      if (response.data.length > 0) {
        const location = response.data[0];
        const stateStr = location.state ? `, ${location.state}` : '';
        return {
          name: location.name,
          country: location.country,
          state: location.state,
          lat: location.lat,
          lon: location.lon,
          displayName: `${location.name}${stateStr}, ${location.country}`
        };
      }

      // Fallback to Mapbox
      if (this.mapboxToken) {
        const mapboxResponse = await axios.get(`${this.mapboxURL}/${lon},${lat}.json`, {
          params: {
            access_token: this.mapboxToken,
            types: 'place,locality,neighborhood'
          }
        });

        if (mapboxResponse.data.features.length > 0) {
          const feature = mapboxResponse.data.features[0];
          return {
            name: feature.text,
            country: 'GB',
            state: this.extractRegion(feature.place_name),
            lat: lat,
            lon: lon,
            displayName: feature.place_name
          };
        }
      }

      throw new Error('Location not found');
    } catch (error) {
      console.error('Reverse geocoding error:', error.response?.data || error.message);
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  extractRegion(placeName) {
    // Extract region/county from place name
    const parts = placeName.split(',');
    if (parts.length >= 3) {
      return parts[parts.length - 2].trim();
    }
    return null;
  }

  extractPostcode(placeName) {
    // Extract postcode from place name using regex
    const postcodeRegex = /[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}/i;
    const match = placeName.match(postcodeRegex);
    return match ? match[0] : null;
  }
}

module.exports = new GeocodingService();
