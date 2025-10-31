const profileDetailsController = require('../controllers/profileDetailsController');
const requireUser = require("../middlewares/requireUser")


const router=require('express').Router();
router.get('/',requireUser,profileDetailsController.getProfileDetails)



module.exports=router;