const express = require('express');
const router = express.Router();
const routingService = require('../services/routingService');

// Calculate clean routes between two points
router.post('/calculate-routes', async (req, res) => {
  try {
    const { origin, destination, options = {} } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination coordinates are required'
      });
    }

    if (!origin.lat || !origin.lon || !destination.lat || !destination.lon) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinate format. Expected: { lat: number, lon: number }'
      });
    }

    const result = await routingService.calculateCleanRoutes(origin, destination, options);
    res.json(result);

  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate routes'
    });
  }
});

// Get air quality data for a specific route
router.post('/route-air-quality', async (req, res) => {
  try {
    const { coordinates } = req.body;

    if (!coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({
        success: false,
        error: 'Route coordinates array is required'
      });
    }

    const result = await routingService.getRouteAirQuality(coordinates);
    res.json(result);

  } catch (error) {
    console.error('Route air quality error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get route air quality data'
    });
  }
});

// Get health zones (schools, hospitals, elderly care) for a given area
router.get('/health-zones', async (req, res) => {
  try {
    const { lat, lon, radius = 5000 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const center = { lat: parseFloat(lat), lon: parseFloat(lon) };
    const result = await routingService.getHealthZones(center, parseInt(radius));
    res.json(result);

  } catch (error) {
    console.error('Health zones error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health zones data'
    });
  }
});

// Get real-time traffic and pollution data for route optimization
router.post('/real-time-conditions', async (req, res) => {
  try {
    const { bounds } = req.body;

    if (!bounds) {
      return res.status(400).json({
        success: false,
        error: 'Bounding box coordinates are required'
      });
    }

    const result = await routingService.getRealTimeConditions(bounds);
    res.json(result);

  } catch (error) {
    console.error('Real-time conditions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get real-time conditions'
    });
  }
});

// Test endpoint to verify routing service
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Routing API is working',
    timestamp: new Date().toISOString(),
    services: {
      graphhopper: process.env.GRAPHHOPPER_API_KEY ? 'configured' : 'not configured',
      openrouteservice: process.env.OPENROUTESERVICE_API_KEY ? 'configured' : 'not configured'
    }
  });
});

module.exports = router;
