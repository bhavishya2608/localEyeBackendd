const mongoose = require('mongoose');

const CrowdDensitySchema = mongoose.Schema({
    zoneId: {
        type: String,
        required: true,
        unique: true
    },
    zoneName: {
        type: String,
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    radius: {
        type: Number,
        default: 100 // meters
    },
    currentDensity: {
        type: Number,
        default: 0,
        min: 0,
        max: 100 // percentage
    },
    peopleCount: {
        type: Number,
        default: 0
    },
    maxCapacity: {
        type: Number,
        default: 100
    },
    densityLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    trend: {
        type: String,
        enum: ['increasing', 'decreasing', 'stable'],
        default: 'stable'
    }
});

module.exports = mongoose.model('CrowdDensity', CrowdDensitySchema);
