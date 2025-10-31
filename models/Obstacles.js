const mongoose=require('mongoose');

const ObstacleSchema=mongoose.Schema({
    obstacleType:{
        type:String,
        required:true,
        lowercase:true
    },
    path:{
        type:String,
        required:true,
    },
    filename:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        lowercase:true
    },
    lat:{
        type:String,
        required:true,
    },
    lng:{
        type:String,
        required:true,
    },
    status:{
        type:String,
        required:true
    }
})

module.exports=mongoose.model('Obstacle',ObstacleSchema);