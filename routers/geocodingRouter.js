const express = require('express');
const router = express.Router();
const {
    geocodeAddress,
    reverseGeocode,
    getRealRoute,
    getMultipleRoutes
} = require('../controllers/geocodingController');

// Geocode address to coordinates
router.post('/geocode', geocodeAddress);

// Reverse geocode coordinates to address
router.post('/reverse-geocode', reverseGeocode);

// Get real route between two points
router.post('/route', getRealRoute);

// Get multiple route options
router.post('/multiple-routes', getMultipleRoutes);

module.exports = router;
