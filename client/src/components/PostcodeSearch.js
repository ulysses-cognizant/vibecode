import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip
} from '@mui/material';
import { Search, LocationOn, Clear } from '@mui/icons-material';
import airQualityAPI from '../services/api';

const PostcodeSearch = ({ onLocationSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentAirQualitySearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveToRecent = (location) => {
    const updated = [location, ...recentSearches.filter(r => 
      r.lat !== location.lat || r.lon !== location.lon
    )].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentAirQualitySearches', JSON.stringify(updated));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      // Check if it looks like a postcode
      const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
      
      let results;
      if (postcodeRegex.test(searchQuery.trim())) {
        // It's a postcode
        const result = await airQualityAPI.getCoordinatesFromPostcode(searchQuery.trim());
        results = { results: [result], source: 'postcode' };
      } else {
        // It's a location name
        results = await airQualityAPI.searchLocation(searchQuery.trim());
      }

      setSearchResults(results.results || []);
      
      if (results.results && results.results.length === 0) {
        setError('No locations found. Please try a different search term or postcode.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationClick = async (location) => {
    setIsLoading(true);
    setError(null);

    try {
      const airQuality = await airQualityAPI.getCurrentAirQuality(location.lat, location.lon);
      setSelectedLocation(location);
      saveToRecent(location);
      
      if (onLocationSelect) {
        onLocationSelect(location, airQuality);
      }
      
      // Clear search results after selection
      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      setError('Failed to get air quality data for this location.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentAirQualitySearches');
  };

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Search UK Location or Postcode
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter postcode (e.g., SW1A 1AA) or location name (e.g., London)"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOn color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <Button onClick={clearSearch} size="small">
                    <Clear />
                  </Button>
                </InputAdornment>
              )
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            startIcon={isLoading ? <CircularProgress size={20} /> : <Search />}
            sx={{ minWidth: 120 }}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {searchResults.length > 0 && (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Search Results:
              </Typography>
              <List dense>
                {searchResults.map((location, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton onClick={() => handleLocationClick(location)}>
                      <ListItemText
                        primary={location.displayName || location.name}
                        secondary={`${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {selectedLocation && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Current location: {selectedLocation.displayName || selectedLocation.name}
          </Alert>
        )}

        {recentSearches.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                Recent Searches:
              </Typography>
              <Button size="small" onClick={clearRecent}>
                Clear
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {recentSearches.map((location, index) => (
                <Chip
                  key={index}
                  label={location.displayName || location.name}
                  onClick={() => handleLocationClick(location)}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PostcodeSearch;
