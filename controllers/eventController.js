const crowdSimulator = require('../utils/crowdSimulator');
const { success, error } = require('../utils/responseWrapper');

const triggerEvent = async (req, res) => {
    try {
        const { zoneId, eventType } = req.body;
        
        if (!zoneId || !eventType) {
            return res.status(400).json(error(400, "Zone ID and event type are required"));
        }

        await crowdSimulator.simulateEvent(zoneId, eventType);
        
        return res.status(200).json(success(200, `Event "${eventType}" triggered in zone ${zoneId}`));
    } catch (err) {
        return res.status(500).json(error(500, err.message));
    }
};

module.exports = { triggerEvent };
