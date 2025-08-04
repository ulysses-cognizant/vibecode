import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';
import airQualityAPI from '../services/api';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ranking-tabpanel-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

const PollutionRankings = () => {
  const [rankings, setRankings] = useState(null);
  const [selectedPollutant, setSelectedPollutant] = useState('aqi');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  const pollutantOptions = [
    { value: 'aqi', label: 'Air Quality Index (AQI)' },
    { value: 'pm2_5', label: 'PM2.5 Fine Particles' },
    { value: 'pm10', label: 'PM10 Coarse Particles' },
    { value: 'no2', label: 'Nitrogen Dioxide (NO₂)' },
    { value: 'o3', label: 'Ozone (O₃)' },
    { value: 'so2', label: 'Sulphur Dioxide (SO₂)' }
  ];

  useEffect(() => {
    fetchRankings();
  }, [selectedPollutant]);

  const fetchRankings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await airQualityAPI.getPollutionRankings(selectedPollutant);
      setRankings(data);
    } catch (err) {
      setError('Failed to fetch pollution rankings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePollutantChange = (event) => {
    setSelectedPollutant(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'low': return 'success';
      case 'moderate': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'low': return <CheckCircle />;
      case 'moderate': return <Warning />;
      case 'high': return <Error />;
      default: return null;
    }
  };

  const getPollutantValue = (region, pollutant) => {
    if (!region.airQuality || !region.airQuality.list || !region.airQuality.list[0]) {
      return 'N/A';
    }

    const data = region.airQuality.list[0];
    if (pollutant === 'aqi') {
      return data.aqi;
    }
    return data.components[pollutant]?.toFixed(1) || 'N/A';
  };

  const getPollutantCategory = (region, pollutant) => {
    if (!region.airQuality || !region.airQuality.list || !region.airQuality.list[0]) {
      return 'unknown';
    }

    const data = region.airQuality.list[0];
    if (pollutant === 'aqi') {
      if (data.aqi <= 2) return 'low';
      if (data.aqi === 3) return 'moderate';
      return 'high';
    }

    const pollutants = data.pollutants;
    const pollutantMap = {
      'pm2_5': 'PM2.5',
      'pm10': 'PM10',
      'no2': 'NO₂',
      'o3': 'O₃',
      'so2': 'SO₂'
    };

    const pollutantKey = pollutantMap[pollutant];
    return pollutants[pollutantKey]?.category || 'unknown';
  };

  const renderRegionList = (regions, title, icon) => (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
          <Badge badgeContent={regions.length} color="primary" sx={{ ml: 2 }} />
        </Box>
        
        {regions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No areas in this category
          </Typography>
        ) : (
          <List dense>
            {regions.map((region, index) => (
              <ListItem key={index} divider={index < regions.length - 1}>
                <ListItemText
                  primary={region.name}
                  secondary={`Value: ${getPollutantValue(region, selectedPollutant)}`}
                />
                <Chip
                  label={getPollutantCategory(region, selectedPollutant)}
                  color={getCategoryColor(getPollutantCategory(region, selectedPollutant))}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        UK Pollution Rankings
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel>Select Pollutant</InputLabel>
          <Select
            value={selectedPollutant}
            onChange={handlePollutantChange}
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

      {rankings && (
        <>
          {/* Navigation Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="By Pollution Level" />
              <Tab label="Best & Worst Areas" />
              <Tab label="All Regions" />
            </Tabs>
          </Box>

          {/* Tab 1: By Pollution Level */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                {renderRegionList(
                  rankings.low,
                  'Low Pollution Areas',
                  <CheckCircle color="success" />
                )}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderRegionList(
                  rankings.moderate,
                  'Moderate Pollution Areas',
                  <Warning color="warning" />
                )}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderRegionList(
                  rankings.high,
                  'High Pollution Areas',
                  <Error color="error" />
                )}
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 2: Best & Worst Areas */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                {renderRegionList(
                  rankings.bestAirQuality,
                  'Best Air Quality',
                  <TrendingUp color="success" />
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderRegionList(
                  rankings.areasNeedingAttention,
                  'Areas Needing Attention',
                  <TrendingDown color="error" />
                )}
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 3: All Regions */}
          <TabPanel value={tabValue} index={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  All UK Regions - {pollutantOptions.find(p => p.value === selectedPollutant)?.label}
                </Typography>
                <List>
                  {rankings.all.map((region, index) => (
                    <ListItem key={index} divider={index < rankings.all.length - 1}>
                      <ListItemText
                        primary={`${index + 1}. ${region.name}`}
                        secondary={`Value: ${getPollutantValue(region, selectedPollutant)} | Lat: ${region.lat}, Lon: ${region.lon}`}
                      />
                      <Chip
                        label={getPollutantCategory(region, selectedPollutant)}
                        color={getCategoryColor(getPollutantCategory(region, selectedPollutant))}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </TabPanel>
        </>
      )}
    </Box>
  );
};

export default PollutionRankings;
