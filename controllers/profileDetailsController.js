
const Obstacle = require("../models/Obstacles");
const User = require("../models/User");
const { success, error } = require("../utils/responseWrapper")
const path=require("path");




const getProfileDetails=async (req,res)=>{
    try {
        const email=req.headers.email;
        const user =await User.findOne({email:email});
        
        const submitted=await Obstacle.find({email});
        res.send(success(200,{
            submitted:submitted,
            name:user.name
        }))
        
        //database se is email ke obstacless nikalne hain saare or send karne hain as a response

    } catch (e) {
        res.send(error(401,e.message))
    }
    
}



module.exports={
    getProfileDetails
}