const { success, error } = require('../utils/responseWrapper');
const axios = require('axios');

// Using Nominatim (OpenStreetMap) for free geocoding - no API key required
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Geocoding service to convert addresses to coordinates
const geocodeAddress = async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address || address.trim().length < 3) {
            return res.status(400).json(error(400, 'Address must be at least 3 characters long'));
        }

        // Use Nominatim (OpenStreetMap) for free geocoding
        const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
            params: {
                q: address,
                format: 'json',
                limit: 10,
                countrycodes: 'in', // Focus on India
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'SmartNavigationApp/1.0'
            }
        });

        if (response.data && response.data.length > 0) {
            const locations = response.data.map(result => ({
                name: result.display_name,
                coordinates: [parseFloat(result.lon), parseFloat(result.lat)], // [lng, lat]
                address: result.display_name,
                type: result.type || 'location',
                confidence: result.importance || 0.5
            }));

            return res.status(200).json(success(200, { locations }));
        }

        return res.status(404).json(error(404, 'No locations found'));
    } catch (err) {
        console.error('Geocoding error:', err.message);
        return res.status(500).json(error(500, 'Geocoding service unavailable'));
    }
};

// Reverse geocoding to convert coordinates to address
const reverseGeocode = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        
        if (!lat || !lng) {
            return res.status(400).json(error(400, 'Latitude and longitude are required'));
        }

        const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
            params: {
                lat: lat,
                lon: lng,
                format: 'json',
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'SmartNavigationApp/1.0'
            }
        });

        if (response.data && response.data.display_name) {
            const location = {
                name: response.data.display_name,
                address: response.data.display_name,
                coordinates: [lng, lat],
                type: response.data.type || 'location'
            };

            return res.status(200).json(success(200, { location }));
        }

        return res.status(404).json(error(404, 'No address found for coordinates'));
    } catch (err) {
        console.error('Reverse geocoding error:', err.message);
        return res.status(500).json(error(500, 'Reverse geocoding service unavailable'));
    }
};

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Get route between two points using simple direct route
const getRealRoute = async (req, res) => {
    try {
        const { start, end, profile = 'driving-car' } = req.body;
        
        if (!start || !end || !start.coordinates || !end.coordinates) {
            return res.status(400).json(error(400, 'Start and end coordinates are required'));
        }

        const [startLng, startLat] = start.coordinates;
        const [endLng, endLat] = end.coordinates;
        
        // Calculate distance
        const distance = calculateDistance(startLat, startLng, endLat, endLng);
        
        // Estimate time based on transport mode
        let speed = 30; // km/h default
        switch (profile) {
            case 'driving-car':
                speed = 40; // km/h
                break;
            case 'cycling-regular':
                speed = 15; // km/h
                break;
            case 'foot-walking':
                speed = 5; // km/h
                break;
        }
        
        const estimatedTime = Math.ceil((distance / speed) * 60); // minutes
        
        // Create a simple direct route with a few waypoints
        const waypoints = 5;
        const routeCoordinates = [];
        
        for (let i = 0; i <= waypoints; i++) {
            const ratio = i / waypoints;
            const lat = startLat + (endLat - startLat) * ratio;
            const lng = startLng + (endLng - startLng) * ratio;
            routeCoordinates.push([lat, lng]);
        }
        
        const routeData = {
            coordinates: routeCoordinates,
            distance: `${distance.toFixed(1)} km`,
            estimatedTime: `${estimatedTime} min`,
            profile: profile,
            waypoints: routeCoordinates.length,
            instructions: [
                { instruction: `Start from ${start.address || 'your location'}`, distance: 0, duration: 0 },
                { instruction: `Head towards ${end.address || 'destination'}`, distance: distance * 1000, duration: estimatedTime * 60 },
                { instruction: `Arrive at ${end.address || 'destination'}`, distance: 0, duration: 0 }
            ]
        };

        return res.status(200).json(success(200, { route: routeData }));
    } catch (err) {
        console.error('Routing error:', err.message);
        return res.status(500).json(error(500, 'Routing service unavailable'));
    }
};

// Check if obstacle blocks a route
function isObstacleOnRoute(obstacle, routeCoordinates, threshold = 0.001) {
    const obstacleLat = parseFloat(obstacle.lat);
    const obstacleLng = parseFloat(obstacle.lng);
    
    // Check if obstacle is near any point on the route
    for (const [routeLat, routeLng] of routeCoordinates) {
        const distance = calculateDistance(obstacleLat, obstacleLng, routeLat, routeLng);
        if (distance < threshold) { // Within ~100m
            return true;
        }
    }
    
    // Check if obstacle is between route points
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
        const [lat1, lng1] = routeCoordinates[i];
        const [lat2, lng2] = routeCoordinates[i + 1];
        
        // Check if obstacle is on the line segment
        const distanceToLine = distancePointToLine(obstacleLat, obstacleLng, lat1, lng1, lat2, lng2);
        if (distanceToLine < threshold) {
            return true;
        }
    }
    
    return false;
}

// Calculate distance from point to line segment
function distancePointToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// Generate alternate route by adding waypoints
function generateAlternateRoute(startLat, startLng, endLat, endLng, obstacles, transportMode) {
    const waypoints = transportMode === 'walking' ? 3 : 5;
    const routeCoordinates = [];
    
    // Create waypoints that avoid obstacles
    const avoidLat = obstacles.length > 0 ? parseFloat(obstacles[0].lat) : null;
    const avoidLng = obstacles.length > 0 ? parseFloat(obstacles[0].lng) : null;
    
    // Add slight offset to avoid obstacles
    const offset = 0.002; // ~200m offset
    
    for (let i = 0; i <= waypoints; i++) {
        const ratio = i / waypoints;
        let lat = startLat + (endLat - startLat) * ratio;
        let lng = startLng + (endLng - startLng) * ratio;
        
        // Add offset to avoid obstacles
        if (avoidLat && avoidLng) {
            const distanceToObstacle = calculateDistance(lat, lng, avoidLat, avoidLng);
            if (distanceToObstacle < 0.001) { // Within 100m
                // Add offset perpendicular to the route
                const perpendicularOffset = i % 2 === 0 ? offset : -offset;
                lat += perpendicularOffset;
                lng += perpendicularOffset;
            }
        }
        
        routeCoordinates.push([lat, lng]);
    }
    
    return routeCoordinates;
}

// Get multiple route options with obstacle avoidance
const getMultipleRoutes = async (req, res) => {
    try {
        const { start, end, obstacles = [] } = req.body;
        
        if (!start || !end || !start.coordinates || !end.coordinates) {
            return res.status(400).json(error(400, 'Start and end coordinates are required'));
        }

        const [startLng, startLat] = start.coordinates;
        const [endLng, endLat] = end.coordinates;
        
        const profiles = [
            { profile: 'driving-car', transportMode: 'car', speed: 40 },
            { profile: 'cycling-regular', transportMode: 'bicycle', speed: 15 },
            { profile: 'foot-walking', transportMode: 'walking', speed: 5 }
        ];
        
        const routes = [];
        const activeObstacles = obstacles.filter(obs => obs.status !== 'resolved');

        for (const { profile, transportMode, speed } of profiles) {
            // Calculate distance
            const distance = calculateDistance(startLat, startLng, endLat, endLng);
            const estimatedTime = Math.ceil((distance / speed) * 60); // minutes
            
            // Create primary route coordinates
            const waypoints = transportMode === 'walking' ? 3 : 5;
            const primaryRouteCoordinates = [];
            
            for (let i = 0; i <= waypoints; i++) {
                const ratio = i / waypoints;
                const lat = startLat + (endLat - startLat) * ratio;
                const lng = startLng + (endLng - startLng) * ratio;
                primaryRouteCoordinates.push([lat, lng]);
            }
            
            // Check if primary route is blocked
            const blockedObstacles = activeObstacles.filter(obs => 
                isObstacleOnRoute(obs, primaryRouteCoordinates)
            );
            
            if (blockedObstacles.length === 0) {
                // Primary route is clear
                routes.push({
                    coordinates: primaryRouteCoordinates,
                    distance: `${distance.toFixed(1)} km`,
                    estimatedTime: `${estimatedTime} min`,
                    profile: profile,
                    waypoints: primaryRouteCoordinates.length,
                    transportMode: transportMode,
                    status: 'available',
                    routeType: 'primary'
                });
            } else {
                // Primary route is blocked, create alternate route
                const alternateCoordinates = generateAlternateRoute(
                    startLat, startLng, endLat, endLng, blockedObstacles, transportMode
                );
                
                // Calculate alternate route distance (slightly longer)
                const alternateDistance = distance * 1.2; // 20% longer
                const alternateTime = Math.ceil((alternateDistance / speed) * 60);
                
                routes.push({
                    coordinates: alternateCoordinates,
                    distance: `${alternateDistance.toFixed(1)} km`,
                    estimatedTime: `${alternateTime} min`,
                    profile: profile,
                    waypoints: alternateCoordinates.length,
                    transportMode: transportMode,
                    status: 'alternate',
                    routeType: 'alternate',
                    blockedBy: blockedObstacles.map(obs => ({
                        type: obs.obstacleType,
                        location: `${obs.lat}, ${obs.lng}`
                    }))
                });
                
                // Add a second alternate route with different path
                const secondAlternateCoordinates = generateAlternateRoute(
                    startLat, startLng, endLat, endLng, blockedObstacles, transportMode
                );
                
                routes.push({
                    coordinates: secondAlternateCoordinates,
                    distance: `${(distance * 1.3).toFixed(1)} km`,
                    estimatedTime: `${Math.ceil((distance * 1.3 / speed) * 60)} min`,
                    profile: profile,
                    waypoints: secondAlternateCoordinates.length,
                    transportMode: transportMode,
                    status: 'alternate',
                    routeType: 'alternate-2',
                    blockedBy: blockedObstacles.map(obs => ({
                        type: obs.obstacleType,
                        location: `${obs.lat}, ${obs.lng}`
                    }))
                });
            }
        }

        return res.status(200).json(success(200, { routes }));
    } catch (err) {
        console.error('Multiple routing error:', err.message);
        return res.status(500).json(error(500, 'Routing service unavailable'));
    }
};

module.exports = {
    geocodeAddress,
    reverseGeocode,
    getRealRoute,
    getMultipleRoutes
};
