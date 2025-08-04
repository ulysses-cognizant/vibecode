import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  ButtonGroup,
  Alert,
  CircularProgress,
  Chip,
  Switch,
  FormControlLabel,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Navigation,
  Route,
  DirectionsCar,
  DirectionsBike,
  DirectionsWalk,
  Warning,
  CheckCircle,
  ErrorOutline,
  ExpandMore,
  MyLocation,
  SwapVert,
  CleaningServices,
  Info,
  School,
  LocalHospital,
  Accessible
} from '@mui/icons-material';
import 'leaflet/dist/leaflet.css';
import './CleanRouteNavigation.css';
import L from 'leaflet';
import routingService from '../services/routingService';
import SimpleMap from './SimpleMap';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Fix default markers for react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const CleanRouteNavigation = () => {
  // State management
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routingProvider, setRoutingProvider] = useState('');
  
  // Navigation options
  const [vehicle, setVehicle] = useState('car');
  const [avoidPollution, setAvoidPollution] = useState(true);
  const [pollutionThreshold, setPollutionThreshold] = useState(80);
  const [showHealthZones, setShowHealthZones] = useState(true);
  const [realTimeMode, setRealTimeMode] = useState(false);
  
  // Map state
  const [mapCenter, setMapCenter] = useState([51.5074, -0.1278]); // London default
  const [mapZoom, setMapZoom] = useState(10);
  const [userLocation, setUserLocation] = useState(null);

  // Health zones data (schools, hospitals, elderly care)
  const [healthZones, setHealthZones] = useState([]);

  const mapRef = useRef();

  useEffect(() => {
    // Get user's current location
    getUserLocation();
    // Load health zones data
    loadHealthZones();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          setUserLocation(location);
          setMapCenter([location.lat, location.lon]);
        },
        (error) => {
          console.warn('Could not get user location:', error);
        }
      );
    }
  };

  const loadHealthZones = async () => {
    // Mock health zones data - in production, this would come from an API
    const mockHealthZones = [
      {
        id: 1,
        type: 'school',
        name: 'Central London School',
        coords: [51.5074, -0.1278],
        priority: 'high'
      },
      {
        id: 2,
        type: 'hospital',
        name: 'London General Hospital',
        coords: [51.5074, -0.1500],
        priority: 'high'
      },
      {
        id: 3,
        type: 'elderly_care',
        name: 'Sunset Care Home',
        coords: [51.5100, -0.1300],
        priority: 'medium'
      }
    ];
    setHealthZones(mockHealthZones);
  };

  const handleLocationSearch = async (input, isOrigin = true) => {
    if (!input.trim()) {
      console.log('❌ Empty input, skipping search');
      return;
    }

    console.log('🔍 Starting location search for:', input, 'isOrigin:', isOrigin);
    console.log('🔍 Current window location:', window.location.href);

    try {
      setError(null); // Clear any previous errors
      let response, data;
      
      // Check if input looks like a UK postcode (letters and numbers with optional space)
      const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
      
      if (postcodeRegex.test(input.trim())) {
        console.log('📮 Detected postcode format, using postcode endpoint');
        // Try postcode-specific endpoint first
        const cleanPostcode = input.trim().replace(/\s+/g, '');
        const postcodeUrl = `http://localhost:5000/api/geocoding/postcode/${encodeURIComponent(cleanPostcode)}`;
        console.log('📮 Full postcode URL:', postcodeUrl);
        
        try {
          response = await fetch(postcodeUrl);
          console.log('📮 Response status:', response.status, 'Content-Type:', response.headers.get('content-type'));
          
          if (response.ok) {
            data = await response.json();
            console.log('📮 Postcode response data:', data);
            
            if (data && data.lat !== undefined && data.lon !== undefined) {
              const coords = { lat: data.lat, lon: data.lon };
              console.log('✅ Postcode success, coordinates:', coords);
              
              if (isOrigin) {
                setOriginCoords(coords);
              } else {
                setDestinationCoords(coords);
              }
              
              // Update map view
              setMapCenter([coords.lat, coords.lon]);
              setMapZoom(13);
              return; // Success, exit early
            }
          }
        } catch (postcodeError) {
          console.log('❌ Postcode request failed:', postcodeError);
        }
      }
      
      // Fall back to general search
      console.log('🌍 Using general search endpoint');
      const searchUrl = `http://localhost:5000/api/geocoding/search?query=${encodeURIComponent(input)}`;
      console.log('🌍 Full search URL:', searchUrl);
      
      response = await fetch(searchUrl);
      console.log('🌍 Response status:', response.status, 'Content-Type:', response.headers.get('content-type'));
      
      if (!response.ok) {
        console.log('❌ Search response not ok:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      data = await response.json();
      console.log('🌍 Search response data:', data);
      
      if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
        const result = data.results[0];
        console.log('🌍 First result:', result);
        
        if (result.lat !== undefined && result.lon !== undefined) {
          const coords = { lat: result.lat, lon: result.lon };
          console.log('✅ Search success, coordinates:', coords);
          
          if (isOrigin) {
            setOriginCoords(coords);
          } else {
            setDestinationCoords(coords);
          }
          
          // Update map view
          setMapCenter([coords.lat, coords.lon]);
          setMapZoom(13);
          return; // Success
        } else {
          console.log('❌ First result missing lat/lon:', result);
        }
      } else {
        console.log('❌ No results found in response');
      }
      
      // If we get here, nothing worked
      throw new Error('No results found');
      
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      setError(`Could not find location "${input}". Please try a different search term.`);
    }
  };

  const calculateRoutes = async () => {
    if (!originCoords || !destinationCoords) {
      setError('Please select both origin and destination locations');
      return;
    }

    console.log('🚗 Starting route calculation');
    console.log('🚗 Origin:', originCoords);
    console.log('🚗 Destination:', destinationCoords);

    setIsLoading(true);
    setError(null);

    try {
      const routeOptions = {
        vehicle,
        avoidPollution: avoidPollution,
        alternatives: true,
        pollutionThreshold
      };

      console.log('🚗 Route options:', routeOptions);

      // Use backend API instead of client-side routing service
      const response = await fetch('http://localhost:5000/api/routing/calculate-routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: originCoords,
          destination: destinationCoords,
          options: routeOptions
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('🚗 Response received, parsing JSON...');
      const data = await response.json();
      console.log('🚗 Raw backend response:', data);
      console.log('🚗 Response success:', data.success);
      console.log('🚗 Response routes:', data.routes);
      console.log('🚗 Routes length:', data.routes ? data.routes.length : 'undefined');
      
      const routes = data.routes || [];

      console.log('🚗 Calculated routes from backend:', routes);

      if (routes && routes.length > 0) {
        console.log('🚗 Routes found:', routes.length);
        console.log('🚗 Route provider:', data.provider);
        console.log('🚗 First route coordinates:', routes[0].coordinates);
        
        setRoutes(routes);
        setSelectedRoute(routes[0]); // First route is the cleanest when sorted
        setRoutingProvider(data.provider || 'Unknown');
        
        // Show provider information to user
        if (data.provider === 'Mock' || data.provider === 'Enhanced Mock') {
          console.warn('⚠️ Using simulated routes. Add real API keys for actual road navigation.');
        }
        
        // Fit map to show all routes
        if (mapRef.current) {
          const bounds = calculateRouteBounds(routes);
          console.log('🗺️ Fitting map to bounds:', bounds);
          mapRef.current.fitBounds(bounds);
        }
      } else {
        console.log('❌ No routes found in response');
        console.log('❌ Data.success:', data.success);
        console.log('❌ Data.error:', data.error);
        if (data.success === false) {
          setError(data.error || 'Backend returned error');
        } else {
          setError('No routes found for the selected locations');
        }
      }
    } catch (error) {
      console.error('❌ Route calculation error:', error);
      setError('Failed to calculate routes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRouteBounds = (routes) => {
    const allCoords = [];
    routes.forEach(route => {
      if (route.coordinates && Array.isArray(route.coordinates)) {
        route.coordinates.forEach(coord => {
          // Handle different coordinate formats
          if (Array.isArray(coord) && coord.length >= 2) {
            // For [lon, lat] format, swap to [lat, lon]
            allCoords.push([coord[1], coord[0]]);
          } else if (coord.lat !== undefined && coord.lon !== undefined) {
            // For {lat, lon} format
            allCoords.push([coord.lat, coord.lon]);
          }
        });
      }
    });

    console.log('🗺️ All coordinates for bounds calculation:', allCoords);

    if (allCoords.length === 0) return [[51.5074, -0.1278], [51.5074, -0.1278]];

    const lats = allCoords.map(coord => coord[0]);
    const lons = allCoords.map(coord => coord[1]);

    const bounds = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    ];

    console.log('🗺️ Calculated bounds:', bounds);
    return bounds;
  };

  const swapLocations = () => {
    const tempOrigin = origin;
    const tempOriginCoords = originCoords;
    
    setOrigin(destination);
    setOriginCoords(destinationCoords);
    setDestination(tempOrigin);
    setDestinationCoords(tempOriginCoords);
  };

  const setCurrentLocation = (isOrigin = true) => {
    if (userLocation) {
      if (isOrigin) {
        setOriginCoords(userLocation);
        setOrigin('Current Location');
      } else {
        setDestinationCoords(userLocation);
        setDestination('Current Location');
      }
    }
  };

  const getVehicleIcon = (vehicleType) => {
    switch (vehicleType) {
      case 'bike': return <DirectionsBike />;
      case 'foot': return <DirectionsWalk />;
      default: return <DirectionsCar />;
    }
  };

  const getHealthRiskColor = (risk) => {
    switch (risk) {
      case 'low': return '#4caf50';
      case 'moderate': return '#ff9800';
      case 'high': return '#f44336';
      case 'very_high': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getHealthRiskIcon = (risk) => {
    switch (risk) {
      case 'low': return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'moderate': return <Warning sx={{ color: '#ff9800' }} />;
      case 'high': return <ErrorOutline sx={{ color: '#f44336' }} />;
      case 'very_high': return <ErrorOutline sx={{ color: '#9c27b0' }} />;
      default: return <Info sx={{ color: '#757575' }} />;
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const getHealthZoneIcon = (type) => {
    switch (type) {
      case 'school': return <School />;
      case 'hospital': return <LocalHospital />;
      case 'elderly_care': return <Accessible />;
      default: return <Info />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <Navigation sx={{ mr: 1, verticalAlign: 'middle' }} />
        Clean Route Navigation
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Left Panel - Controls */}
        <Card sx={{ minWidth: 400, maxWidth: 500 }}>
          <CardContent>
            {/* Location Inputs */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Route Planning
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  label="From"
                  value={origin}
                  onChange={(e) => {
                    setOrigin(e.target.value);
                    if (originCoords) setOriginCoords(null); // Clear coords when text changes
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch(origin, true)}
                  onBlur={() => {
                    console.log('🎯 From field blur triggered, origin:', origin, 'originCoords:', originCoords);
                    if (origin.trim() && !originCoords) {
                      console.log('🎯 Triggering search for origin on blur');
                      handleLocationSearch(origin, true);
                    }
                  }}
                  size="small"
                  helperText={origin.trim() && !originCoords ? "Press Enter or click away to search" : ""}
                  InputProps={{
                    endAdornment: originCoords && <CheckCircle color="success" fontSize="small" />
                  }}
                />
                <Tooltip title="Use current location">
                  <IconButton 
                    onClick={() => setCurrentLocation(true)}
                    size="small"
                  >
                    <MyLocation />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <IconButton onClick={swapLocations}>
                  <SwapVert />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  label="To"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    if (destinationCoords) setDestinationCoords(null); // Clear coords when text changes
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch(destination, false)}
                  onBlur={() => {
                    console.log('🎯 To field blur triggered, destination:', destination, 'destinationCoords:', destinationCoords);
                    if (destination.trim() && !destinationCoords) {
                      console.log('🎯 Triggering search for destination on blur');
                      handleLocationSearch(destination, false);
                    }
                  }}
                  size="small"
                  helperText={destination.trim() && !destinationCoords ? "Press Enter or click away to search" : ""}
                  InputProps={{
                    endAdornment: destinationCoords && <CheckCircle color="success" fontSize="small" />
                  }}
                />
                <Tooltip title="Use current location">
                  <IconButton 
                    onClick={() => setCurrentLocation(false)}
                    size="small"
                  >
                    <MyLocation />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => handleLocationSearch(origin, true)}
                  size="small"
                  disabled={!origin.trim()}
                >
                  Search From
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleLocationSearch(destination, false)}
                  size="small"
                  disabled={!destination.trim()}
                >
                  Search To
                </Button>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Vehicle Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Transportation
              </Typography>
              <ButtonGroup fullWidth variant="outlined">
                <Button
                  onClick={() => setVehicle('car')}
                  variant={vehicle === 'car' ? 'contained' : 'outlined'}
                  startIcon={<DirectionsCar />}
                >
                  Car
                </Button>
                <Button
                  onClick={() => setVehicle('bike')}
                  variant={vehicle === 'bike' ? 'contained' : 'outlined'}
                  startIcon={<DirectionsBike />}
                >
                  Bike
                </Button>
                <Button
                  onClick={() => setVehicle('foot')}
                  variant={vehicle === 'foot' ? 'contained' : 'outlined'}
                  startIcon={<DirectionsWalk />}
                >
                  Walk
                </Button>
              </ButtonGroup>
            </Box>

            {/* Clean Route Options */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle1">
                  <CleaningServices sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Clean Route Options
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ space: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={avoidPollution}
                        onChange={(e) => setAvoidPollution(e.target.checked)}
                      />
                    }
                    label="Avoid high pollution areas"
                  />

                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Pollution Sensitivity (AQI Threshold: {pollutionThreshold})
                    </Typography>
                    <Slider
                      value={pollutionThreshold}
                      onChange={(e, value) => setPollutionThreshold(value)}
                      min={50}
                      max={150}
                      marks={[
                        { value: 50, label: '50' },
                        { value: 100, label: '100' },
                        { value: 150, label: '150' }
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={showHealthZones}
                        onChange={(e) => setShowHealthZones(e.target.checked)}
                      />
                    }
                    label="Show health-sensitive zones"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={realTimeMode}
                        onChange={(e) => setRealTimeMode(e.target.checked)}
                      />
                    }
                    label="Real-time traffic & pollution"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <Button
              fullWidth
              variant="contained"
              onClick={calculateRoutes}
              disabled={!originCoords || !destinationCoords || isLoading}
              sx={{ mt: 3 }}
              startIcon={isLoading ? <CircularProgress size={20} /> : <Route />}
            >
              {isLoading ? 'Calculating...' : 'Find Clean Routes'}
            </Button>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {/* Route Results */}
            {routes.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Route Options
                </Typography>
                <List>
                  {routes.map((route, index) => (
                    <React.Fragment key={route.id}>
                      <ListItem
                        button
                        selected={selectedRoute?.id === route.id}
                        onClick={() => setSelectedRoute(route)}
                      >
                        <ListItemIcon>
                          {getHealthRiskIcon(route.healthRisk)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1">
                                Route {index + 1}
                              </Typography>
                              {index === 0 && (
                                <Chip 
                                  label="Cleanest" 
                                  color="success" 
                                  size="small"
                                  icon={<CleaningServices />}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {formatDistance(route.distance)} • {formatDuration(route.duration)}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                Avg AQI: {route.pollutionScore?.toFixed(1) || 'N/A'} • 
                                Risk: {route.healthRisk || 'unknown'}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < routes.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Map */}
        <Card sx={{ flexGrow: 1, minHeight: 600 }}>
          <CardContent sx={{ p: 1, height: 600 }}>
            {/* Route Legend */}
            <Box sx={{ mb: 1, p: 1, bgcolor: 'rgba(255,255,255,0.95)', borderRadius: 1, fontSize: '0.75rem', border: '1px solid #ddd' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                Route Legend: {routes.length > 0 ? `${routes.length} route${routes.length > 1 ? 's' : ''}` : 'No routes'}
                {routingProvider && (
                  <span style={{ 
                    marginLeft: '8px', 
                    padding: '2px 6px', 
                    backgroundColor: routingProvider.includes('Mock') ? '#ffeb3b' : '#4caf50',
                    color: routingProvider.includes('Mock') ? '#d32f2f' : 'white',
                    borderRadius: '4px',
                    fontSize: '0.65rem'
                  }}>
                    {routingProvider === 'OSRM (OpenStreetMap)' ? '🗺️ Real Roads' : 
                     routingProvider.includes('Mock') ? '⚠️ Simulated' : 
                     `✅ ${routingProvider}`}
                  </span>
                )}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 16, height: 3, bgcolor: '#ff0000', borderRadius: 0.5 }} />
                  <Typography variant="caption">Selected</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 16, height: 3, bgcolor: '#00ff00', borderRadius: 0.5 }} />
                  <Typography variant="caption">Clean Route</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 16, height: 3, bgcolor: '#ff8000', borderRadius: 0.5 }} />
                  <Typography variant="caption">Medium Pollution</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 16, height: 3, bgcolor: '#0080ff', borderRadius: 0.5 }} />
                  <Typography variant="caption">Primary Route</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 16, height: 3, bgcolor: '#8000ff', borderRadius: 0.5 }} />
                  <Typography variant="caption">Alternative Route</Typography>
                </Box>
              </Box>
              {routingProvider?.includes('Mock') && (
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  mt: 0.5, 
                  color: '#d32f2f',
                  fontStyle: 'italic'
                }}>
                  💡 For real road navigation, add API keys to .env:
                  <br />• GRAPHHOPPER_API_KEY (graphhopper.com)
                  <br />• OPENROUTESERVICE_API_KEY (openrouteservice.org)
                </Typography>
              )}
            </Box>
            
            <SimpleMap
              originCoords={originCoords}
              destinationCoords={destinationCoords}
              routes={routes}
              selectedRoute={selectedRoute}
              onRouteSelect={setSelectedRoute}
              height={540}
              origin={origin}
              destination={destination}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Selected Route Details */}
      {selectedRoute && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Route Details
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="textSecondary">Distance</Typography>
                <Typography variant="h6">{formatDistance(selectedRoute.distance)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Duration</Typography>
                <Typography variant="h6">{formatDuration(selectedRoute.duration)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Average AQI</Typography>
                <Typography variant="h6" sx={{ color: getHealthRiskColor(selectedRoute.healthRisk) }}>
                  {selectedRoute.pollutionScore?.toFixed(1) || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Health Risk</Typography>
                <Chip 
                  label={selectedRoute.healthRisk || 'unknown'} 
                  color={selectedRoute.healthRisk === 'low' ? 'success' : 
                         selectedRoute.healthRisk === 'moderate' ? 'warning' : 'error'}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Provider</Typography>
                <Typography variant="h6">{selectedRoute.provider || 'Mixed'}</Typography>
              </Box>
            </Box>

            {selectedRoute.highPollutionSegments > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This route passes through {selectedRoute.highPollutionSegments} high-pollution area(s). 
                Consider choosing an alternative route for better air quality.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CleanRouteNavigation;
