const { success, error } = require('../utils/responseWrapper');
const Obstacle = require('../models/Obstacles');

// Campus locations with coordinates (JEC Kukas, Jaipur)
const CAMPUS_LOCATIONS = {
    'library': { lat: 26.9968, lng: 75.8886, name: 'Admin & Library' },
    'cafeteria': { lat: 26.9960, lng: 75.8878, name: 'Cafeteria & Sports Complex' },
    'engineering': { lat: 26.9983, lng: 75.8906, name: 'Academic Block A' },
    'hostel': { lat: 26.9990, lng: 75.8912, name: 'Hostel Blocks' },
    'parking': { lat: 26.9980, lng: 75.8920, name: 'Main Gate & Parking' },
    'main campus': { lat: 26.9975, lng: 75.8895, name: 'JEC Main Campus' },
    'main': { lat: 26.9975, lng: 75.8895, name: 'JEC Main Campus' }
};

// Road network graph for the campus
const ROAD_NETWORK = {
    'main_campus': {
        'engineering': { distance: 150, blocked: false },
        'library': { distance: 120, blocked: false },
        'hostel': { distance: 200, blocked: false }
    },
    'engineering': {
        'main_campus': { distance: 150, blocked: false },
        'hostel': { distance: 100, blocked: false },
        'parking': { distance: 180, blocked: false }
    },
    'library': {
        'main_campus': { distance: 120, blocked: false },
        'cafeteria': { distance: 80, blocked: false }
    },
    'hostel': {
        'main_campus': { distance: 200, blocked: false },
        'engineering': { distance: 100, blocked: false },
        'parking': { distance: 90, blocked: false }
    },
    'cafeteria': {
        'library': { distance: 80, blocked: false },
        'parking': { distance: 160, blocked: false }
    },
    'parking': {
        'engineering': { distance: 180, blocked: false },
        'hostel': { distance: 90, blocked: false },
        'cafeteria': { distance: 160, blocked: false }
    }
};

// Dijkstra's algorithm for shortest path
function dijkstra(graph, start, end) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    
    // Initialize distances
    for (const node in graph) {
        distances[node] = node === start ? 0 : Infinity;
        unvisited.add(node);
    }
    
    while (unvisited.size > 0) {
        // Find the unvisited node with the smallest distance
        let current = null;
        let smallestDistance = Infinity;
        
        for (const node of unvisited) {
            if (distances[node] < smallestDistance) {
                smallestDistance = distances[node];
                current = node;
            }
        }
        
        if (current === null || current === end) break;
        
        unvisited.delete(current);
        
        // Check neighbors
        for (const neighbor in graph[current]) {
            if (!unvisited.has(neighbor)) continue;
            
            const edge = graph[current][neighbor];
            if (edge.blocked) continue; // Skip blocked roads
            
            const distance = distances[current] + edge.distance;
            
            if (distance < distances[neighbor]) {
                distances[neighbor] = distance;
                previous[neighbor] = current;
            }
        }
    }
    
    // Reconstruct path
    const path = [];
    let current = end;
    
    while (current !== undefined) {
        path.unshift(current);
        current = previous[current];
    }
    
    return path.length > 1 ? path : null;
}

// Calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Check if obstacle blocks a route
function isObstacleBlockingRoute(obstacle, start, end) {
    const obstacleLat = parseFloat(obstacle.lat);
    const obstacleLng = parseFloat(obstacle.lng);
    
    // Check if obstacle is between start and end points
    const startLat = parseFloat(start.lat);
    const startLng = parseFloat(start.lng);
    const endLat = parseFloat(end.lat);
    const endLng = parseFloat(end.lng);
    
    // Simple proximity check (within 50 meters of the route)
    const distanceToStart = calculateDistance(obstacleLat, obstacleLng, startLat, startLng);
    const distanceToEnd = calculateDistance(obstacleLat, obstacleLng, endLat, endLng);
    const routeDistance = calculateDistance(startLat, startLng, endLat, endLng);
    
    // If obstacle is close to the route line
    return (distanceToStart + distanceToEnd - routeDistance) < 100;
}

// Determine transportation mode based on obstacle type
function getTransportationMode(obstacleType) {
    switch (obstacleType.toLowerCase()) {
        case 'construction':
            return { type: 'walking', reason: 'Construction work blocks vehicle access' };
        case 'accident':
            return { type: 'walking', reason: 'Accident blocks vehicle traffic' };
        case 'traffic':
            return { type: 'two-wheeler', reason: 'Heavy traffic, two-wheeler recommended' };
        case 'roadblock':
            return { type: 'walking', reason: 'Road completely blocked' };
        default:
            return { type: 'walking', reason: 'Obstacle blocks vehicle access' };
    }
}

// Plan route with obstacle awareness
const planRoute = async (req, res) => {
    try {
        const { start, destination, obstacles } = req.body;
        
        // Find destination coordinates
        const destKey = Object.keys(CAMPUS_LOCATIONS).find(key => 
            destination.toLowerCase().includes(key)
        );
        
        if (!destKey) {
            return res.status(400).json(error(400, 'Destination not found in campus locations'));
        }
        
        const destCoords = CAMPUS_LOCATIONS[destKey];
        const startCoords = { lat: start[0], lng: start[1] };
        
        // Update road network based on obstacles
        const updatedNetwork = JSON.parse(JSON.stringify(ROAD_NETWORK));
        
        // Check which roads are blocked by obstacles
        for (const obstacle of obstacles) {
            if (obstacle.status !== 'resolved') {
                // Check each road segment
                for (const from in updatedNetwork) {
                    for (const to in updatedNetwork[from]) {
                        const fromCoords = CAMPUS_LOCATIONS[from.replace('_', ' ')];
                        const toCoords = CAMPUS_LOCATIONS[to.replace('_', ' ')];
                        
                        if (fromCoords && toCoords && isObstacleBlockingRoute(obstacle, fromCoords, toCoords)) {
                            updatedNetwork[from][to].blocked = true;
                        }
                    }
                }
            }
        }
        
        // Find shortest path
        const path = dijkstra(updatedNetwork, 'main_campus', destKey.replace(' ', '_'));
        
        const routes = [];
        let alternativeTransport = null;
        
        if (path) {
            // Calculate route details
            let totalDistance = 0;
            const coordinates = [start];
            
            for (let i = 0; i < path.length - 1; i++) {
                const from = path[i];
                const to = path[i + 1];
                const edge = updatedNetwork[from][to];
                
                totalDistance += edge.distance;
                
                const fromCoords = CAMPUS_LOCATIONS[from.replace('_', ' ')];
                const toCoords = CAMPUS_LOCATIONS[to.replace('_', ' ')];
                
                if (fromCoords) coordinates.push([fromCoords.lat, fromCoords.lng]);
                if (toCoords) coordinates.push([toCoords.lat, toCoords.lng]);
            }
            
            coordinates.push([destCoords.lat, destCoords.lng]);
            
            routes.push({
                coordinates,
                distance: `${(totalDistance / 1000).toFixed(1)} km`,
                estimatedTime: `${Math.ceil(totalDistance / 1000 * 3)} min`, // Assuming 3 min per km
                status: 'available',
                path: path
            });
        } else {
            // No route available - suggest alternative transportation
            const blockingObstacles = obstacles.filter(obs => 
                obs.status !== 'resolved' && 
                isObstacleBlockingRoute(obs, startCoords, destCoords)
            );
            
            if (blockingObstacles.length > 0) {
                alternativeTransport = blockingObstacles.map(obs => 
                    getTransportationMode(obs.obstacleType)
                );
            }
            
            // Add a direct route marked as blocked
            routes.push({
                coordinates: [start, [destCoords.lat, destCoords.lng]],
                distance: `${(calculateDistance(start[0], start[1], destCoords.lat, destCoords.lng) / 1000).toFixed(1)} km`,
                estimatedTime: `${Math.ceil(calculateDistance(start[0], start[1], destCoords.lat, destCoords.lng) / 1000 * 3)} min`,
                status: 'blocked',
                path: ['direct']
            });
        }
        
        // Generate alternative routes
        const alternativeRoutes = [];
        for (const [from, connections] of Object.entries(updatedNetwork)) {
            for (const [to, edge] of Object.entries(connections)) {
                if (!edge.blocked && from !== 'main_campus' && to !== destKey.replace(' ', '_')) {
                    const altPath = dijkstra(updatedNetwork, 'main_campus', to);
                    if (altPath) {
                        let altDistance = 0;
                        const altCoordinates = [start];
                        
                        for (let i = 0; i < altPath.length - 1; i++) {
                            const fromNode = altPath[i];
                            const toNode = altPath[i + 1];
                            altDistance += updatedNetwork[fromNode][toNode].distance;
                            
                            const fromCoords = CAMPUS_LOCATIONS[fromNode.replace('_', ' ')];
                            const toCoords = CAMPUS_LOCATIONS[toNode.replace('_', ' ')];
                            
                            if (fromCoords) altCoordinates.push([fromCoords.lat, fromCoords.lng]);
                            if (toCoords) altCoordinates.push([toCoords.lat, toCoords.lng]);
                        }
                        
                        altCoordinates.push([destCoords.lat, destCoords.lng]);
                        
                        alternativeRoutes.push({
                            coordinates: altCoordinates,
                            distance: `${(altDistance / 1000).toFixed(1)} km`,
                            estimatedTime: `${Math.ceil(altDistance / 1000 * 3)} min`,
                            status: 'available',
                            path: altPath
                        });
                    }
                }
            }
        }
        
        // Add alternative routes (limit to 3)
        routes.push(...alternativeRoutes.slice(0, 2));
        
        const routeDetails = {
            distance: routes[0]?.distance || 'N/A',
            estimatedTime: routes[0]?.estimatedTime || 'N/A',
            obstacleCount: obstacles.filter(obs => obs.status !== 'resolved').length
        };
        
        return res.status(200).json(success(200, {
            routes,
            routeDetails,
            alternativeTransport,
            destination: destCoords.name
        }));
        
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
};

// Get campus locations
const getCampusLocations = async (req, res) => {
    try {
        return res.status(200).json(success(200, CAMPUS_LOCATIONS));
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
};

module.exports = {
    planRoute,
    getCampusLocations
};
