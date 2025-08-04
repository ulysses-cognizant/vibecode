import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box, AppBar, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import { Air, TrendingUp, Map, CompareArrows, Navigation } from '@mui/icons-material';

import PostcodeSearch from './components/PostcodeSearch';
import PollutionRankings from './components/PollutionRankings';
import TrendChart from './components/TrendChart';
import RegionalComparison from './components/RegionalComparison';
import InteractiveMap from './components/InteractiveMap';
import AirQualityDashboard from './components/AirQualityDashboard';
import CleanRouteNavigation from './components/CleanRouteNavigation';
import MetaMaskErrorBoundary from './components/MetaMaskErrorBoundary';

import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32',
    },
    secondary: {
      main: '#FF6F00',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentAirQuality, setCurrentAirQuality] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleLocationSelect = (location, airQuality) => {
    setSelectedLocation(location);
    setCurrentAirQuality(airQuality);
  };

  return (
    <MetaMaskErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" color="primary">
              <Toolbar>
                <Air sx={{ mr: 2 }} />
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  UK Air Quality Tracker
                </Typography>
              </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ mt: 2 }}>
              {/* Search Component - Always visible */}
              <Box sx={{ mb: 3 }}>
                <PostcodeSearch onLocationSelect={handleLocationSelect} />
              </Box>

              {/* Current Air Quality Display */}
              {selectedLocation && currentAirQuality && (
                <Box sx={{ mb: 3 }}>
                  <AirQualityDashboard 
                    location={selectedLocation} 
                    airQuality={currentAirQuality} 
                  />
                </Box>
              )}

              {/* Navigation Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="air quality tabs">
                  <Tab icon={<TrendingUp />} label="Rankings" />
                  <Tab icon={<TrendingUp />} label="Trends" />
                  <Tab icon={<CompareArrows />} label="Regional Comparison" />
                  <Tab icon={<Map />} label="Interactive Map" />
                  <Tab icon={<Navigation />} label="Clean Routes" />
                </Tabs>
              </Box>

              {/* Tab Panels */}
              <TabPanel value={tabValue} index={0}>
                <PollutionRankings />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <TrendChart selectedLocation={selectedLocation} />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <RegionalComparison />
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <InteractiveMap 
                  selectedLocation={selectedLocation} 
                  onLocationSelect={handleLocationSelect}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={4}>
                <CleanRouteNavigation />
              </TabPanel>
            </Container>
          </Box>
        </Router>
      </ThemeProvider>
    </MetaMaskErrorBoundary>
  );
}

export default App;
