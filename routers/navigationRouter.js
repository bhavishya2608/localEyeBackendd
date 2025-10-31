const express = require('express');
const router = express.Router();
const {
    planRoute,
    getCampusLocations
} = require('../controllers/navigationController');

// Plan route with obstacle awareness
router.post('/plan-route', planRoute);

// Get available campus locations
router.get('/locations', getCampusLocations);

module.exports = router;
