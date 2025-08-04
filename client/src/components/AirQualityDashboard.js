import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Air,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';

const AirQualityDashboard = ({ location, airQuality }) => {
  if (!airQuality || !airQuality.list || airQuality.list.length === 0) {
    return (
      <Alert severity="warning">
        No air quality data available for this location.
      </Alert>
    );
  }

  const currentData = airQuality.list[0];
  const pollutants = currentData.pollutants;

  const getAQIColor = (aqi) => {
    switch (aqi) {
      case 1: return 'success';
      case 2: return 'info';
      case 3: return 'warning';
      case 4: return 'error';
      case 5: return 'error';
      default: return 'default';
    }
  };

  const getAQIIcon = (aqi) => {
    switch (aqi) {
      case 1: return <CheckCircle />;
      case 2: return <CheckCircle />;
      case 3: return <Warning />;
      case 4: return <Error />;
      case 5: return <Error />;
      default: return <Air />;
    }
  };

  const getPollutantProgress = (pollutant, value) => {
    const maxValues = {
      'PM2.5': 100,
      'PM10': 150,
      'NO₂': 200,
      'O₃': 300,
      'SO₂': 200
    };
    
    const max = maxValues[pollutant] || 100;
    return Math.min((value / max) * 100, 100);
  };

  const getPollutantColor = (category) => {
    switch (category) {
      case 'low': return 'success';
      case 'moderate': return 'warning';
      case 'high': return 'error';
      default: return 'info';
    }
  };

  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Air sx={{ mr: 1, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" component="h2">
              Air Quality for {location.displayName || location.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updated: {new Date(currentData.timestamp).toLocaleString()}
            </Typography>
          </Box>
        </Box>

        {/* Overall AQI */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {getAQIIcon(currentData.aqi)}
            <Typography variant="h4" sx={{ ml: 1, mr: 2 }}>
              AQI: {currentData.aqi}
            </Typography>
            <Chip
              label={currentData.aqiDescription}
              color={getAQIColor(currentData.aqi)}
              size="large"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Air Quality Index (1=Good, 5=Very Poor)
          </Typography>
        </Box>

        {/* Pollutants Grid */}
        <Typography variant="h6" gutterBottom>
          Pollutant Levels
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(pollutants).map(([name, data]) => (
            <Grid item xs={12} sm={6} md={4} key={name}>
              <Card variant="outlined">
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {name}
                    </Typography>
                    <Chip
                      label={data.category}
                      color={getPollutantColor(data.category)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="h6" color="primary">
                    {data.value.toFixed(1)} {data.unit}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {data.description}
                  </Typography>
                  
                  <LinearProgress
                    variant="determinate"
                    value={getPollutantProgress(name, data.value)}
                    color={getPollutantColor(data.category)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Health Advisory */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Health Advisory
          </Typography>
          {currentData.aqi <= 2 && (
            <Alert severity="success" icon={<CheckCircle />}>
              Air quality is good. Great day to be outdoors!
            </Alert>
          )}
          {currentData.aqi === 3 && (
            <Alert severity="warning" icon={<Warning />}>
              Air quality is moderate. Sensitive individuals should consider limiting prolonged outdoor activities.
            </Alert>
          )}
          {currentData.aqi >= 4 && (
            <Alert severity="error" icon={<Error />}>
              Air quality is poor. Everyone should limit outdoor activities, especially sensitive individuals.
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AirQualityDashboard;
