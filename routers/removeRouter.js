const removeController = require('../controllers/removeController');
const requireUser = require("../middlewares/requireUser")




const router=require('express').Router();
router.post('/',requireUser,removeController.removeobstacle)



module.exports=router;