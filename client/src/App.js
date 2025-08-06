import React, { useState, useEffect } from 'react';
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Mark initial load as complete after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 1000); // Give enough time for initial page render
    return () => clearTimeout(timer);
  }, []);

  // Removed the useEffect that was triggering scroll on tab changes
  // Now scroll only happens through direct user interaction in handleTabChange

  const scrollToHideHeaderComponents = () => {
    // Don't scroll if this is still the initial load
    if (isInitialLoad) {
      console.log('Skipping scroll - still initial load');
      return;
    }
    
    try {
      // For Rankings and Regional Comparison tabs, try multiple times to ensure content is loaded
      if (tabValue === 0 || tabValue === 2) {
        const tabName = tabValue === 0 ? 'Rankings' : 'Regional Comparison';
        console.log(`Handling ${tabName} tab scroll`);
        let attempts = 0;
        const maxAttempts = 3;
        
        const attemptScroll = () => {
          // Double-check initial load state before each attempt
          if (isInitialLoad) {
            console.log(`Skipping ${tabName} scroll attempt - still initial load`);
            return;
          }
          
          attempts++;
          console.log(`${tabName} scroll attempt ${attempts}`);
          
          const tabsSection = document.getElementById('tabs-section');
          if (tabsSection) {
            const rect = tabsSection.getBoundingClientRect();
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetScrollTop = rect.top + currentScrollTop;
            
            console.log(`${tabName} - Current scroll:`, currentScrollTop, 'Target:', targetScrollTop);
            
            window.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
            
            // Verify scroll happened and retry if needed
            setTimeout(() => {
              if (isInitialLoad) return; // Check again before verification
              
              const newScrollTop = window.pageYOffset || document.documentElement.scrollTop;
              console.log(`${tabName} - After scroll:`, newScrollTop);
              
              if (Math.abs(newScrollTop - targetScrollTop) > 50 && attempts < maxAttempts) {
                console.log(`${tabName} scroll failed, retrying...`);
                setTimeout(attemptScroll, 200);
              }
            }, 300);
          } else if (attempts < maxAttempts && !isInitialLoad) {
            setTimeout(attemptScroll, 200);
          }
        };
        
        attemptScroll();
        return;
      }
      
      // For other tabs, use the standard approach
      const tabsSection = document.getElementById('tabs-section');
      if (tabsSection) {
        const rect = tabsSection.getBoundingClientRect();
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetScrollTop = rect.top + currentScrollTop;
        
        console.log(`Tab ${tabValue} - Scrolling to tabs section. Current scroll:`, currentScrollTop, 'Target:', targetScrollTop);
        
        window.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
        return;
      }
      
      // Method 2: Calculate header section height and scroll past it
      const headerSection = document.getElementById('header-components-section');
      if (headerSection) {
        const headerHeight = headerSection.offsetHeight;
        const headerRect = headerSection.getBoundingClientRect();
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetScrollTop = headerRect.top + currentScrollTop + headerHeight;
        
        console.log(`Tab ${tabValue} - Scrolling past header section. Header height:`, headerHeight, 'Target scroll:', targetScrollTop);
        
        window.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
        return;
      }
      
      // Method 3: Fallback - scroll a fixed amount
      console.log(`Tab ${tabValue} - Using fallback scroll - scrolling 400px down`);
      window.scrollTo({
        top: 400,
        behavior: 'smooth'
      });
      
    } catch (error) {
      console.error('Error in scroll function:', error);
      // Emergency fallback
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  };

  const handleTabChange = (event, newValue) => {
    console.log('Tab changed from', tabValue, 'to:', newValue, 'Event type:', event?.type);
    setTabValue(newValue);
    
    // Only scroll if this is a real user click (not initial render or programmatic change)
    if (event && (event.type === 'click' || event.type === 'keydown')) {
      console.log('User-initiated tab change - triggering scroll');
      
      // Mark initial load as complete when user actually interacts
      if (isInitialLoad) {
        console.log('Setting initial load to false due to user interaction');
        setIsInitialLoad(false);
      }
      
      // For Rankings and Regional Comparison tabs, use multiple scroll attempts due to data loading
      if (newValue === 0) {
        console.log('Rankings tab - scheduling multiple scroll attempts');
        setTimeout(() => scrollToHideHeaderComponents(), 100);
        setTimeout(() => scrollToHideHeaderComponents(), 300);
        setTimeout(() => scrollToHideHeaderComponents(), 600);
      } else if (newValue === 2) {
        console.log('Regional Comparison tab - scheduling multiple scroll attempts');
        setTimeout(() => scrollToHideHeaderComponents(), 100);
        setTimeout(() => scrollToHideHeaderComponents(), 300);
        setTimeout(() => scrollToHideHeaderComponents(), 600);
      } else {
        console.log(`Tab ${newValue} - scheduling single scroll attempt`);
        setTimeout(() => scrollToHideHeaderComponents(), 50);
      }
    } else {
      console.log('Programmatic tab change - no scroll triggered');
    }
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
              {/* Header Components Section - will be scrolled out of view */}
              <div id="header-components-section">
                {/* Search Component - Always visible */}
                <Box id="search-section" sx={{ mb: 3 }}>
                  <PostcodeSearch onLocationSelect={handleLocationSelect} />
                </Box>

                {/* Current Air Quality Display - Always visible when location selected */}
                {selectedLocation && currentAirQuality && (
                  <Box id="health-advisory-section" sx={{ mb: 3 }}>
                    <AirQualityDashboard 
                      location={selectedLocation} 
                      airQuality={currentAirQuality} 
                    />
                  </Box>
                )}
              </div>

              {/* Navigation Tabs */}
              <Box id="tabs-section" sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="air quality tabs">
                  <Tab icon={<TrendingUp />} label="Rankings" />
                  <Tab icon={<TrendingUp />} label="Trends" />
                  <Tab icon={<CompareArrows />} label="Regional Comparison" />
                  <Tab icon={<Map />} label="Interactive Map" />
                  <Tab icon={<Navigation />} label="Clean Routes" />
                </Tabs>
              </Box>

              {/* Tab Panels */}
              <div id="tab-content-area">
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
              </div>
            </Container>
          </Box>
        </Router>
      </ThemeProvider>
    </MetaMaskErrorBoundary>
  );
}

export default App;
