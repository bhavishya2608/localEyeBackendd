const CrowdDensity = require('../models/CrowdDensity');

class CrowdSimulator {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.simulationInterval = 5000; // Update every 5 seconds
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('👥 Crowd density simulation started');
        
        this.intervalId = setInterval(async () => {
            await this.simulateCrowdMovement();
        }, this.simulationInterval);
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('🛑 Crowd density simulation stopped');
    }

    async simulateCrowdMovement() {
        try {
            const zones = await CrowdDensity.find({});
            
            for (const zone of zones) {
                await this.updateZoneDensity(zone);
            }
        } catch (error) {
            console.error('Error in crowd simulation:', error);
        }
    }

    async updateZoneDensity(zone) {
        const currentTime = new Date();
        const hour = currentTime.getHours();
        
        // Simulate different patterns based on time of day
        let baseMultiplier = 1;
        let volatility = 0.1;
        
        if (hour >= 7 && hour <= 9) {
            // Morning rush
            baseMultiplier = 1.5;
            volatility = 0.2;
        } else if (hour >= 12 && hour <= 14) {
            // Lunch time
            baseMultiplier = 1.3;
            volatility = 0.15;
        } else if (hour >= 17 && hour <= 19) {
            // Evening rush
            baseMultiplier = 1.8;
            volatility = 0.25;
        } else if (hour >= 20 && hour <= 22) {
            // Evening activity
            baseMultiplier = 1.2;
            volatility = 0.1;
        } else if (hour >= 23 || hour <= 6) {
            // Night time
            baseMultiplier = 0.3;
            volatility = 0.05;
        }

        // Calculate new people count with very controlled variation
        const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
        const changeFactor = 1 + (randomFactor * 0.05); // Fixed low volatility to prevent growth
        
        let newPeopleCount = Math.floor(zone.peopleCount * changeFactor);
        
        // Add some people entering/leaving with very controlled variation
        const peopleChange = Math.floor((Math.random() - 0.5) * 10); // Very reduced variation
        newPeopleCount += peopleChange;
        
        // Add occasional high-density events (2% chance, very reduced impact)
        if (Math.random() < 0.02) {
            const highDensityBoost = Math.floor(zone.maxCapacity * (0.05 + Math.random() * 0.1)); // Very reduced boost
            newPeopleCount += highDensityBoost;
        }
        
        // Aggressively prevent zones from staying at maximum capacity
        if (newPeopleCount >= zone.maxCapacity * 0.8) {
            newPeopleCount = Math.floor(zone.maxCapacity * (0.3 + Math.random() * 0.4)); // 30-70%
        }
        
        // Prevent zones from staying completely empty
        if (newPeopleCount <= zone.maxCapacity * 0.05) {
            newPeopleCount = Math.floor(zone.maxCapacity * (0.05 + Math.random() * 0.15)); // 5-20%
        }
        
        // Ensure people count stays within bounds
        newPeopleCount = Math.max(0, Math.min(newPeopleCount, zone.maxCapacity));
        
        // Calculate new density
        const newDensity = (newPeopleCount / zone.maxCapacity) * 100;
        
        // Determine density level
        let densityLevel = 'low';
        if (newDensity >= 80) densityLevel = 'critical';
        else if (newDensity >= 60) densityLevel = 'high';
        else if (newDensity >= 30) densityLevel = 'medium';

        // Determine trend
        let trend = 'stable';
        if (newPeopleCount > zone.peopleCount) trend = 'increasing';
        else if (newPeopleCount < zone.peopleCount) trend = 'decreasing';

        // Update the zone
        await CrowdDensity.findOneAndUpdate(
            { zoneId: zone.zoneId },
            {
                peopleCount: newPeopleCount,
                currentDensity: newDensity,
                densityLevel,
                trend,
                lastUpdated: new Date()
            }
        );

    }

    // Manual crowd event simulation (for testing)
    async simulateEvent(zoneId, eventType) {
        try {
            const zone = await CrowdDensity.findOne({ zoneId });
            if (!zone) return;

            let peopleChange = 0;
            switch (eventType) {
                case 'concert':
                    peopleChange = Math.floor(zone.maxCapacity * 0.4);
                    break;
                case 'festival':
                    peopleChange = Math.floor(zone.maxCapacity * 0.6);
                    break;
                case 'emergency':
                    peopleChange = -Math.floor(zone.peopleCount * 0.8);
                    break;
                case 'sale':
                    peopleChange = Math.floor(zone.maxCapacity * 0.3);
                    break;
                default:
                    peopleChange = Math.floor((Math.random() - 0.5) * 50);
            }

            const newPeopleCount = Math.max(0, Math.min(zone.peopleCount + peopleChange, zone.maxCapacity));
            const newDensity = (newPeopleCount / zone.maxCapacity) * 100;
            
            let densityLevel = 'low';
            if (newDensity >= 80) densityLevel = 'critical';
            else if (newDensity >= 60) densityLevel = 'high';
            else if (newDensity >= 30) densityLevel = 'medium';

            await CrowdDensity.findOneAndUpdate(
                { zoneId },
                {
                    peopleCount: newPeopleCount,
                    currentDensity: newDensity,
                    densityLevel,
                    lastUpdated: new Date()
                }
            );

        } catch (error) {
            console.error('Error simulating event:', error);
        }
    }
}

module.exports = new CrowdSimulator();
