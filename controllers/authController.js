const User=require('../models/User');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const { error, success } = require('../utils/responseWrapper');



const signupController= async (req,res)=>{
    try {
        const {email,password,name}=req.body;
        if(!email || !password){
            // return res.status(400).send("Enter both fields correctly")
            return res.send(error(400,'Enter both fields correctly'))
        }
        const oldUser=await User.findOne({email})
        if(oldUser){
            // return res.status(409).send("User already exists")
            return res.send(error(409,"User already exists"));
        }
        const hashedPass=await bcrypt.hash(password,10)
        const user= await User.create({
            name:name,
            email:email,
            password: hashedPass
        })

        return res.send(success(200,{user}));

    } catch (e) {
        console.log(e);
    }
}

const loginController= async (req,res)=>{
    try {
        const {email,password}=req.body;
        if(!email || !password){
            // return res.status(400).send("Enter both fields correctly")
            return res.send(error(400,'Enter both fields correctly'))
        }
        const user=await User.findOne({email})
        if(!user){
            // return res.status(409).send("No User exists")
            return res.send(error(409,"No User exists"));
        }    
        const matched= await bcrypt.compare(password,user.password)  
        if(!matched){
            // return res.status(404).send("Incorrect passsword")
            return res.send(error(404,"Incorrect password"));
        }
        //JWT
        const accesstoken=generateAccessToken({_id: user.id});
        const refreshtoken=generateRefreshToken({_id: user.id});

        //cookie
        res.cookie('jwt',refreshtoken,{
            httpOnly:true,
            sameSite : 'none' ,
            secure:true
        })

        // return res.status(200).json({accesstoken})
        return res.send(success(200,{accesstoken}));
    } catch (e) {
        console.log(e)
    }
}


//this checks refresh token validity and generates new access token
const refreshAccessTokenController= async(req,res)=>{
    const cookies=req.cookies;
    if(!cookies.jwt){
        // return res.status(401).send("Authentication token required")
            return res.send(error(404,"Authentication token required"));
    }
    const refreshtoken=cookies.jwt;
    if(!refreshtoken){
        res.send("No refresh Token");
    }
    try {
            const decode= jwt.verify(refreshtoken, process.env.REFRESH_TOKEN_PRIVATE_KEY)
            const _id=decode._id;
            const accesstoken=generateAccessToken({_id})
            // return res.status(201).json({
            //     accesstoken
            // })
            return res.send(success(200,{accesstoken}));
        } catch (e) {
            console.log(e)
            // return res.status(401).send("Invalid Refresh Token")
            return res.send(error(401,"Invalid Refresh Token"));
        }

}


//internal functions
//JWT token Start
const generateAccessToken= (data)=>{
  const token=  jwt.sign(data, process.env.ACCESS_TOKEN_PRIVATE_KEY,{
    expiresIn:"1y"
  })
  return token; 
}
const generateRefreshToken= (data)=>{
  const token=  jwt.sign(data, process.env.REFRESH_TOKEN_PRIVATE_KEY,{
    expiresIn:"4y"
  })
  return token; 
}



module.exports={
    signupController,
    loginController,
    refreshAccessTokenController
}