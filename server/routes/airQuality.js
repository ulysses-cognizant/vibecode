const express = require('express');
const router = express.Router();
const airQualityService = require('../services/airQualityService');

// Get current air quality by coordinates
router.get('/current/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const data = await airQualityService.getCurrentAirQuality(lat, lon);
    res.json(data);
  } catch (error) {
    console.error('Error fetching current air quality:', error);
    res.status(500).json({ error: 'Failed to fetch air quality data' });
  }
});

// Get air quality forecast by coordinates
router.get('/forecast/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const data = await airQualityService.getAirQualityForecast(lat, lon);
    res.json(data);
  } catch (error) {
    console.error('Error fetching air quality forecast:', error);
    res.status(500).json({ error: 'Failed to fetch air quality forecast' });
  }
});

// Get historical air quality data
router.get('/history/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const { start, end } = req.query;
    const data = await airQualityService.getHistoricalAirQuality(lat, lon, start, end);
    res.json(data);
  } catch (error) {
    console.error('Error fetching historical air quality:', error);
    res.status(500).json({ error: 'Failed to fetch historical air quality data' });
  }
});

// Get UK regions air quality summary
router.get('/regions', async (req, res) => {
  try {
    const data = await airQualityService.getUKRegionsAirQuality();
    res.json(data);
  } catch (error) {
    console.error('Error fetching regions air quality:', error);
    res.status(500).json({ error: 'Failed to fetch regions air quality data' });
  }
});

// Get pollution rankings
router.get('/rankings', async (req, res) => {
  try {
    const { pollutant } = req.query;
    const data = await airQualityService.getPollutionRankings(pollutant);
    res.json(data);
  } catch (error) {
    console.error('Error fetching pollution rankings:', error);
    res.status(500).json({ error: 'Failed to fetch pollution rankings' });
  }
});

module.exports = router;
