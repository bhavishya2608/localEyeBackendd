const Obstacles = require("../models/Obstacles");
const { success, error } = require("../utils/responseWrapper");
const fs = require('fs');
const path = require('path');

const removeobstacle=async(req,res)=>{
    try {
    const {obstacleId}=req.body;
    if(!obstacleId){
        res.send(error(404,"no obstacle found"))
    }
    const obstacle = await Obstacles.findById(obstacleId);
    if(obstacle){
        await Obstacles.findByIdAndDelete(obstacleId);
    }
    if (obstacle.path) {
        const filePath = path.join(__dirname, '..', obstacle.path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    res.send(success(200,"obstacle deleted"))
    } catch (e) {
        console.log(e);
        
    }
}

module.exports={
    removeobstacle
}