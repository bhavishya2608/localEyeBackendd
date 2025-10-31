const jwt = require('jsonwebtoken');
const { error } = require("../utils/responseWrapper")

module.exports= async(req,res,next)=>{
    if(!req.headers || !req.headers.authorization || !req.headers.authorization.startsWith("Bearer")){
        // res.send("No token or Invalid Token")
        return res.send(error(404,'No token/Invalid Token'))
    }
    const accesstoken=req.headers.authorization.split(" ")[1];
    try {
        const decode= jwt.verify(accesstoken, process.env.ACCESS_TOKEN_PRIVATE_KEY)
        req._id=decode.id
        next();
    } catch (e) {
        console.log(e)
        // return res.status(401).send("Invalid access key")
        return res.send(error(401,'Invalid access key'))
    }
}