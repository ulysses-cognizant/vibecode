const express = require('express');
const router = express.Router();
const geocodingService = require('../services/geocodingService');

// Search by postcode or location name
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const data = await geocodingService.searchLocation(query);
    res.json(data);
  } catch (error) {
    console.error('Error searching location:', error);
    res.status(500).json({ error: 'Failed to search location' });
  }
});

// Get coordinates from postcode
router.get('/postcode/:postcode', async (req, res) => {
  try {
    const { postcode } = req.params;
    const data = await geocodingService.getCoordinatesFromPostcode(postcode);
    res.json(data);
  } catch (error) {
    console.error('Error fetching postcode coordinates:', error);
    res.status(500).json({ error: 'Failed to fetch postcode coordinates' });
  }
});

// Reverse geocoding - get location from coordinates
router.get('/reverse/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const data = await geocodingService.reverseGeocode(lat, lon);
    res.json(data);
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    res.status(500).json({ error: 'Failed to reverse geocode coordinates' });
  }
});

module.exports = router;
