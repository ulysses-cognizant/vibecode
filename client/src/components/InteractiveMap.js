import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Paper,
  CircularProgress,
  Button
} from '@mui/material';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import airQualityAPI from '../services/api';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const InteractiveMap = ({ selectedLocation, onLocationSelect }) => {
  const [regionsData, setRegionsData] = useState([]);
  const [selectedPollutant, setSelectedPollutant] = useState('aqi');
  const [popupInfo, setPopupInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  const pollutantOptions = [
    { value: 'aqi', label: 'Air Quality Index', unit: '' },
    { value: 'pm2_5', label: 'PM2.5', unit: 'μg/m³' },
    { value: 'pm10', label: 'PM10', unit: 'μg/m³' },
    { value: 'no2', label: 'NO₂', unit: 'μg/m³' },
    { value: 'o3', label: 'O₃', unit: 'μg/m³' },
    { value: 'so2', label: 'SO₂', unit: 'μg/m³' }
  ];

  useEffect(() => {
    if (MAPBOX_TOKEN) {
      initializeMap();
      fetchRegionsData();
    } else {
      setError('Mapbox access token is not configured. Please check your environment variables.');
    }

    return () => {
      // Clean up markers first
      if (markers.current) {
        markers.current.forEach(marker => {
          try {
            marker.remove();
          } catch (e) {
            console.warn('Error removing marker:', e);
          }
        });
        markers.current = [];
      }
      
      // Then clean up map
      if (map.current) {
        try {
          map.current.remove();
          map.current = null;
        } catch (e) {
          console.warn('Error removing map:', e);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (map.current && regionsData.length > 0) {
      updateMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionsData, selectedPollutant]);

  useEffect(() => {
    if (selectedLocation && map.current) {
      map.current.flyTo({
        center: [selectedLocation.lon, selectedLocation.lat],
        zoom: 10,
        duration: 2000
      });
    }
  }, [selectedLocation]);

  const initializeMap = () => {
    if (map.current || !mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v10',
        center: [-3.5, 54.5],
        zoom: 5.5
      });

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        // Update markers once map is loaded if we have data
        if (regionsData.length > 0) {
          updateMarkers();
        }
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('Failed to load map. Please check your Mapbox configuration.');
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setError('Failed to initialize map. Please check your Mapbox configuration.');
    }
  };

  const fetchRegionsData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await airQualityAPI.getUKRegionsAirQuality();
      setRegionsData(data.filter(region => region.airQuality));
    } catch (err) {
      setError('Failed to fetch regional data for map.');
    } finally {
      setIsLoading(false);
    }
  };

  const getValue = (region, pollutant) => {
    if (!region.airQuality || !region.airQuality.list || !region.airQuality.list[0]) {
      return null;
    }

    const data = region.airQuality.list[0];
    if (pollutant === 'aqi') {
      return data.aqi;
    }
    return data.components[pollutant];
  };

  const getMarkerColor = (region, pollutant) => {
    const value = getValue(region, pollutant);
    if (value === null) return '#808080';

    if (pollutant === 'aqi') {
      switch (value) {
        case 1: return '#4CAF50'; // Green
        case 2: return '#8BC34A'; // Light Green
        case 3: return '#FF9800'; // Orange
        case 4: return '#F44336'; // Red
        case 5: return '#9C27B0'; // Purple
        default: return '#808080';
      }
    }

    // For other pollutants, use thresholds
    const thresholds = {
      pm2_5: { low: 15, moderate: 35 },
      pm10: { low: 25, moderate: 50 },
      no2: { low: 40, moderate: 80 },
      o3: { low: 100, moderate: 160 },
      so2: { low: 20, moderate: 80 }
    };

    const threshold = thresholds[pollutant];
    if (!threshold) return '#808080';

    if (value <= threshold.low) return '#4CAF50';
    if (value <= threshold.moderate) return '#FF9800';
    return '#F44336';
  };

  const createMarkerElement = (region, pollutant) => {
    const value = getValue(region, pollutant);
    const color = getMarkerColor(region, pollutant);
    const size = 15 + (pollutant === 'aqi' ? value * 5 : 10);

    const el = document.createElement('div');
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '2px solid white';
    el.style.cursor = 'pointer';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '10px';
    el.style.fontWeight = 'bold';
    el.style.color = 'white';
    el.style.textShadow = '1px 1px 1px rgba(0,0,0,0.7)';
    el.innerHTML = value?.toFixed?.(0) || '?';

    el.addEventListener('click', () => handleMarkerClick(region));

    return el;
  };

  const updateMarkers = () => {
    // Check if map is ready
    if (!map.current || !map.current.isStyleLoaded()) {
      console.log('Map not ready, skipping marker update');
      return;
    }

    // Clear existing markers safely
    if (markers.current) {
      markers.current.forEach(marker => {
        try {
          marker.remove();
        } catch (e) {
          console.warn('Error removing marker:', e);
        }
      });
      markers.current = [];
    }

    // Add new markers
    regionsData.forEach(region => {
      try {
        const el = createMarkerElement(region, selectedPollutant);
        
        const marker = new mapboxgl.Marker(el)
          .setLngLat([region.lon, region.lat])
          .addTo(map.current);

        markers.current.push(marker);
      } catch (error) {
        console.warn('Error adding marker for region:', region.name, error);
      }
    });

    // Add selected location marker if exists
    if (selectedLocation) {
      try {
        const selectedEl = document.createElement('div');
        selectedEl.style.width = '30px';
        selectedEl.style.height = '30px';
        selectedEl.style.borderRadius = '50%';
        selectedEl.style.backgroundColor = '#2196F3';
        selectedEl.style.border = '3px solid white';
        selectedEl.style.boxShadow = '0 0 10px rgba(33, 150, 243, 0.6)';
        selectedEl.style.animation = 'pulse 2s infinite';

        const selectedMarker = new mapboxgl.Marker(selectedEl)
          .setLngLat([selectedLocation.lon, selectedLocation.lat])
          .addTo(map.current);

        markers.current.push(selectedMarker);
      } catch (error) {
        console.warn('Error adding selected location marker:', error);
      }
    }
  };

  const handleMarkerClick = async (region) => {
    setPopupInfo(region);
    
    if (onLocationSelect) {
      try {
        const airQuality = await airQualityAPI.getCurrentAirQuality(region.lat, region.lon);
        onLocationSelect(region, airQuality);
      } catch (err) {
        console.error('Failed to get air quality for clicked location:', err);
      }
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <Typography variant="h6">Mapbox Configuration Required</Typography>
            <Typography>
              To use the interactive map, please:
            </Typography>
            <ol>
              <li>Sign up for a free Mapbox account at mapbox.com</li>
              <li>Get your access token</li>
              <li>Create a .env file in the client directory</li>
              <li>Add: REACT_APP_MAPBOX_ACCESS_TOKEN=your_token_here</li>
              <li>Restart the application</li>
            </ol>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Interactive UK Air Quality Map
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel>Select Pollutant</InputLabel>
          <Select
            value={selectedPollutant}
            onChange={(e) => setSelectedPollutant(e.target.value)}
            label="Select Pollutant"
          >
            {pollutantOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ position: 'relative', height: 600, width: '100%' }}>
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 1000
                }}
              >
                <CircularProgress />
              </Box>
            )}

            {/* Mapbox container */}
            <div 
              ref={mapContainer} 
              style={{ 
                width: '100%', 
                height: '100%',
                borderRadius: '8px'
              }} 
            />

            {/* Popup Info */}
            {popupInfo && (
              <Paper 
                sx={{ 
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  p: 2,
                  minWidth: 200,
                  maxWidth: 300,
                  zIndex: 1000
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6">
                    {popupInfo.name}
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={() => setPopupInfo(null)}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    ×
                  </Button>
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {popupInfo.lat.toFixed(4)}, {popupInfo.lon.toFixed(4)}
                </Typography>

                {popupInfo.airQuality && popupInfo.airQuality.list && popupInfo.airQuality.list[0] && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Current Air Quality:
                    </Typography>
                    
                    <Box sx={{ mb: 1 }}>
                      <Chip
                        label={`AQI: ${popupInfo.airQuality.list[0].aqi}`}
                        color={
                          popupInfo.airQuality.list[0].aqi <= 2 ? 'success' :
                          popupInfo.airQuality.list[0].aqi === 3 ? 'warning' : 'error'
                        }
                        size="small"
                      />
                    </Box>

                    <Typography variant="caption" display="block">
                      PM2.5: {popupInfo.airQuality.list[0].components.pm2_5?.toFixed(1)} μg/m³
                    </Typography>
                    <Typography variant="caption" display="block">
                      PM10: {popupInfo.airQuality.list[0].components.pm10?.toFixed(1)} μg/m³
                    </Typography>
                    <Typography variant="caption" display="block">
                      NO₂: {popupInfo.airQuality.list[0].components.no2?.toFixed(1)} μg/m³
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Box>

          {/* Legend */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" fontWeight="bold">
              Color Legend:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <div style={{ width: 15, height: 15, borderRadius: '50%', backgroundColor: '#4CAF50' }} />
              <Typography variant="caption">Good</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <div style={{ width: 15, height: 15, borderRadius: '50%', backgroundColor: '#FF9800' }} />
              <Typography variant="caption">Moderate</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <div style={{ width: 15, height: 15, borderRadius: '50%', backgroundColor: '#F44336' }} />
              <Typography variant="caption">Poor</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </Box>
  );
};

export default InteractiveMap;
