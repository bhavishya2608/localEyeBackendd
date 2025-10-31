const express=require('express');
const dotenv=require('dotenv');
const authRouter=require('./routers/authRouter')
const obstaclesRouter=require('./routers/obstaclesRouter');
const profileDetailsRouter= require('./routers/profileDetailsRouter')
const crowdDensityRouter = require('./routers/crowdDensityRouter');
const navigationRouter = require('./routers/navigationRouter');
const geocodingRouter = require('./routers/geocodingRouter');
const dbConnect = require('./dbConnect');
const cookieParser=require('cookie-parser')
const cors=require('cors');
const removeRouter=require('./routers/removeRouter')
const path = require('path');
const crowdSimulator = require('./utils/crowdSimulator');
dotenv.config('./.env');
require("dotenv").config();


const app=express();

//middlewares
app.use(cors({
    credentials: true,
    origin:'https://local-eye-frontend.vercel.app',
    methods: ['GET','POST','PUT','DELETE'],
}))
app.use(express.json());
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/auth',authRouter)
app.use('/obstacles',obstaclesRouter)
app.use('/profiledetails',profileDetailsRouter)
app.use('/remove',removeRouter)
app.use('/crowd', crowdDensityRouter)
app.use('/navigation', navigationRouter)
app.use('/geocoding', geocodingRouter)

//


app.get('/',(req,res)=>{
    res.status(200).send("Hello")
})

const PORT=process.env.PORT || 4000 ;
dbConnect().then(() => {
    // Start crowd simulation after database connection
    setTimeout(() => {
        crowdSimulator.start();
    }, 2000); // Wait 2 seconds for DB to be ready
});

app.listen(PORT,()=>{
    console.log(`Listening at ${PORT}`)
})

