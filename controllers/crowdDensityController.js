const CrowdDensity = require('../models/CrowdDensity');
const { success, error } = require('../utils/responseWrapper');

// Get all crowd density data
const getAllCrowdDensity = async (req, res) => {
    try {
        const crowdData = await CrowdDensity.find({});
        return res.status(200).json(success(200, crowdData));
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
};

// Get crowd density for a specific zone
const getZoneDensity = async (req, res) => {
    try {
        const { zoneId } = req.params;
        const zoneData = await CrowdDensity.findOne({ zoneId });
        
        if (!zoneData) {
            return res.status(404).json(error(404, "Zone not found"));
        }
        
        return res.status(200).json(success(200, zoneData));
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
};

// Update crowd density (for simulation)
const updateCrowdDensity = async (req, res) => {
    try {
        const { zoneId, peopleCount, density } = req.body;
        
        const zone = await CrowdDensity.findOne({ zoneId });
        if (!zone) {
            return res.status(404).json(error(404, "Zone not found"));
        }

        // Calculate density level based on percentage
        let densityLevel = 'low';
        if (density >= 80) densityLevel = 'critical';
        else if (density >= 60) densityLevel = 'high';
        else if (density >= 30) densityLevel = 'medium';

        // Determine trend
        let trend = 'stable';
        if (peopleCount > zone.peopleCount) trend = 'increasing';
        else if (peopleCount < zone.peopleCount) trend = 'decreasing';

        const updatedZone = await CrowdDensity.findOneAndUpdate(
            { zoneId },
            {
                peopleCount,
                currentDensity: density,
                densityLevel,
                trend,
                lastUpdated: new Date()
            },
            { new: true }
        );

        return res.status(200).json(success(200, updatedZone));
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
};

// Initialize zones with simulated data
const initializeZones = async (req, res) => {
    try {
        // Define zones around Jaipur Engineering College (JEC), Kukas Jaipur (approx coordinates)
        const zones = [
            {
                zoneId: 'zone_1',
                zoneName: 'JEC Main Campus',
                lat: 26.9975,
                lng: 75.8895,
                radius: 150,
                maxCapacity: 500
            },
            {
                zoneId: 'zone_2',
                zoneName: 'Academic Block A',
                lat: 26.9983,
                lng: 75.8906,
                radius: 120,
                maxCapacity: 300
            },
            {
                zoneId: 'zone_3',
                zoneName: 'Admin & Library',
                lat: 26.9968,
                lng: 75.8886,
                radius: 100,
                maxCapacity: 200
            },
            {
                zoneId: 'zone_4',
                zoneName: 'Hostel Blocks',
                lat: 26.9990,
                lng: 75.8912,
                radius: 140,
                maxCapacity: 400
            },
            {
                zoneId: 'zone_5',
                zoneName: 'Cafeteria & Sports Complex',
                lat: 26.9960,
                lng: 75.8878,
                radius: 110,
                maxCapacity: 250
            },
            {
                zoneId: 'zone_6',
                zoneName: 'Main Gate & Parking',
                lat: 26.9980,
                lng: 75.8920,
                radius: 90,
                maxCapacity: 150
            }
        ];

        // Clear existing zones and create new ones
        await CrowdDensity.deleteMany({});
        
        // Initialize all zones with <30% density (green zones)
        const densityPatterns = [
            { min: 5, max: 25, level: 'low' },      // Green zone 1
            { min: 8, max: 20, level: 'low' },      // Green zone 2
            { min: 10, max: 28, level: 'low' },     // Green zone 3
            { min: 12, max: 25, level: 'low' },     // Green zone 4
            { min: 15, max: 30, level: 'low' },     // Green zone 5
            { min: 18, max: 30, level: 'low' }      // Green zone 6
        ];
        
        for (let i = 0; i < zones.length; i++) {
            const zone = zones[i];
            const pattern = densityPatterns[i];
            
            const initialDensity = pattern.min + Math.random() * (pattern.max - pattern.min);
            const initialPeopleCount = Math.floor((initialDensity / 100) * zone.maxCapacity);
            
            let densityLevel = 'low';
            if (initialDensity >= 80) densityLevel = 'critical';
            else if (initialDensity >= 60) densityLevel = 'high';
            else if (initialDensity >= 30) densityLevel = 'medium';

            await CrowdDensity.create({
                ...zone,
                peopleCount: initialPeopleCount,
                currentDensity: initialDensity,
                densityLevel,
                lastUpdated: new Date()
            });
        }

        const allZones = await CrowdDensity.find({});
        return res.status(200).json(success(200, allZones));
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
};

// Divert crowd from high density zones to low density zones
const divertCrowd = async (req, res) => {
    try {
        const zones = await CrowdDensity.find({}).sort({ currentDensity: -1 });
        
        // Find zones with high density (>60%) and relatively low density (<50%)
        const highDensityZones = zones.filter(zone => zone.currentDensity > 60);
        const lowDensityZones = zones.filter(zone => zone.currentDensity < 50);
        
        if (highDensityZones.length === 0) {
            return res.status(200).json(success(200, { message: "No high-density zones found - all zones are balanced" }));
        }
        
        if (lowDensityZones.length === 0) {
            return res.status(200).json(success(200, { message: "No low-density zones available for diversion - all zones are crowded" }));
        }

        const diversionResults = [];
        
        // Divert crowd from high density to low density zones
        for (const highZone of highDensityZones.slice(0, 2)) { // Limit to 2 high density zones
            for (const lowZone of lowDensityZones.slice(0, 2)) { // Limit to 2 low density zones
                // Calculate diversion amount (10-20% of high density zone's population)
                const diversionAmount = Math.floor(highZone.peopleCount * (0.1 + Math.random() * 0.1));
                
                if (diversionAmount > 0) {
                    // Update high density zone (decrease)
                    const newHighCount = Math.max(0, highZone.peopleCount - diversionAmount);
                    const newHighDensity = (newHighCount / highZone.maxCapacity) * 100;
                    
                    let highDensityLevel = 'low';
                    if (newHighDensity >= 80) highDensityLevel = 'critical';
                    else if (newHighDensity >= 60) highDensityLevel = 'high';
                    else if (newHighDensity >= 30) highDensityLevel = 'medium';

                    await CrowdDensity.findOneAndUpdate(
                        { zoneId: highZone.zoneId },
                        {
                            peopleCount: newHighCount,
                            currentDensity: newHighDensity,
                            densityLevel: highDensityLevel,
                            trend: 'decreasing',
                            lastUpdated: new Date()
                        }
                    );

                    // Update low density zone (increase)
                    const newLowCount = Math.min(lowZone.maxCapacity, lowZone.peopleCount + diversionAmount);
                    const newLowDensity = (newLowCount / lowZone.maxCapacity) * 100;
                    
                    let lowDensityLevel = 'low';
                    if (newLowDensity >= 80) lowDensityLevel = 'critical';
                    else if (newLowDensity >= 60) lowDensityLevel = 'high';
                    else if (newLowDensity >= 30) lowDensityLevel = 'medium';

                    await CrowdDensity.findOneAndUpdate(
                        { zoneId: lowZone.zoneId },
                        {
                            peopleCount: newLowCount,
                            currentDensity: newLowDensity,
                            densityLevel: lowDensityLevel,
                            trend: 'increasing',
                            lastUpdated: new Date()
                        }
                    );

                    diversionResults.push({
                        from: {
                            zoneId: highZone.zoneId,
                            zoneName: highZone.zoneName,
                            peopleMoved: -diversionAmount,
                            newDensity: newHighDensity
                        },
                        to: {
                            zoneId: lowZone.zoneId,
                            zoneName: lowZone.zoneName,
                            peopleMoved: diversionAmount,
                            newDensity: newLowDensity
                        }
                    });
                }
            }
        }

        return res.status(200).json(success(200, {
            message: "Crowd diversion completed successfully",
            diversions: diversionResults
        }));
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
};

// Create high density test scenario
const createHighDensityScenario = async (req, res) => {
    try {
        const zones = await CrowdDensity.find({});
        
        // Create high density in 2-3 random zones
        const highDensityZones = zones.sort(() => 0.5 - Math.random()).slice(0, 3);
        
        for (const zone of highDensityZones) {
            const highDensity = 65 + Math.random() * 25; // 65-90% density
            const peopleCount = Math.floor((highDensity / 100) * zone.maxCapacity);
            
            let densityLevel = 'high';
            if (highDensity >= 80) densityLevel = 'critical';
            
            await CrowdDensity.findOneAndUpdate(
                { zoneId: zone.zoneId },
                {
                    peopleCount,
                    currentDensity: highDensity,
                    densityLevel,
                    trend: 'increasing',
                    lastUpdated: new Date()
                }
            );
        }
        
        // Create low density in 2-3 other zones
        const remainingZones = zones.filter(zone => !highDensityZones.some(hz => hz.zoneId === zone.zoneId));
        const lowDensityZones = remainingZones.sort(() => 0.5 - Math.random()).slice(0, 2);
        
        for (const zone of lowDensityZones) {
            const lowDensity = 10 + Math.random() * 20; // 10-30% density
            const peopleCount = Math.floor((lowDensity / 100) * zone.maxCapacity);
            
            await CrowdDensity.findOneAndUpdate(
                { zoneId: zone.zoneId },
                {
                    peopleCount,
                    currentDensity: lowDensity,
                    densityLevel: 'low',
                    trend: 'stable',
                    lastUpdated: new Date()
                }
            );
        }
        
        const updatedZones = await CrowdDensity.find({});
        return res.status(200).json(success(200, {
            message: "Test scenario created successfully - some zones are high density, others are low density",
            zones: updatedZones
        }));
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
};

// Initialize zones around a provided lat/lng (approximate offsets)
const initializeZonesAtLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const centerLat = parseFloat(lat);
        const centerLng = parseFloat(lng);
        if (Number.isNaN(centerLat) || Number.isNaN(centerLng)) {
            return res.status(400).json(error(400, 'Invalid coordinates'));
        }

        // Approx offsets in degrees (~1 deg lat ~111km, lng scales with cos(lat))
        const dLat = (m) => m / 111000;
        const dLng = (m) => m / (111000 * Math.cos(centerLat * Math.PI / 180));

        const zones = [
            { zoneId: 'zone_1', zoneName: 'JEC Main Campus',        lat: centerLat + dLat(0),    lng: centerLng + dLng(0),     radius: 150, maxCapacity: 500 },
            { zoneId: 'zone_2', zoneName: 'Academic Block A',       lat: centerLat + dLat(120),  lng: centerLng + dLng(120),   radius: 120, maxCapacity: 300 },
            { zoneId: 'zone_3', zoneName: 'Admin & Library',        lat: centerLat + dLat(-120), lng: centerLng + dLng(-100),  radius: 100, maxCapacity: 200 },
            { zoneId: 'zone_4', zoneName: 'Hostel Blocks',          lat: centerLat + dLat(200),  lng: centerLng + dLng(-80),   radius: 140, maxCapacity: 400 },
            { zoneId: 'zone_5', zoneName: 'Cafeteria & Sports',     lat: centerLat + dLat(-160), lng: centerLng + dLng(140),   radius: 110, maxCapacity: 250 },
            { zoneId: 'zone_6', zoneName: 'Main Gate & Parking',    lat: centerLat + dLat(80),   lng: centerLng + dLng(200),   radius: 90,  maxCapacity: 150 },
        ];

        await CrowdDensity.deleteMany({});

        for (const zone of zones) {
            const initialDensity = 10 + Math.random() * 20;
            const peopleCount = Math.floor((initialDensity / 100) * zone.maxCapacity);
            let densityLevel = 'low';
            if (initialDensity >= 80) densityLevel = 'critical';
            else if (initialDensity >= 60) densityLevel = 'high';
            else if (initialDensity >= 30) densityLevel = 'medium';

            await CrowdDensity.create({
                ...zone,
                peopleCount,
                currentDensity: initialDensity,
                densityLevel,
                trend: 'stable',
                lastUpdated: new Date()
            });
        }

        const allZones = await CrowdDensity.find({});
        return res.status(200).json(success(200, allZones));
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
}

module.exports = {
    getAllCrowdDensity,
    getZoneDensity,
    updateCrowdDensity,
    initializeZones,
    divertCrowd,
    createHighDensityScenario,
    initializeZonesAtLocation
};
