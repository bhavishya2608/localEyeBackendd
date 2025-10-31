const express = require('express');
const router = express.Router();
const {
    getAllCrowdDensity,
    getZoneDensity,
    updateCrowdDensity,
    initializeZones,
    divertCrowd,
    createHighDensityScenario
} = require('../controllers/crowdDensityController');
const { initializeZonesAtLocation } = require('../controllers/crowdDensityController');

// Get all crowd density data
router.get('/all', getAllCrowdDensity);

// Get specific zone density
router.get('/zone/:zoneId', getZoneDensity);

// Update crowd density
router.put('/update', updateCrowdDensity);

// Initialize zones (for setup)
router.post('/initialize', initializeZones);
// Initialize zones at provided location
router.post('/initialize-at', initializeZonesAtLocation);

// Divert crowd from high density to low density zones
router.post('/divert', divertCrowd);

// Create high density test scenario
router.post('/create-scenario', createHighDensityScenario);

module.exports = router;
