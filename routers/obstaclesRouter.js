const obstaclesController = require('../controllers/obstaclesController');
const requireUser = require("../middlewares/requireUser")
const multer = require('multer');
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'uploads/') // Make sure this directory exists
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname)
//     }
// });
const { storage } = require('../config/cloudinary'); // Cloudinary storage

const upload = multer({ storage });


const router=require('express').Router();
router.get('/all',requireUser,obstaclesController.getObstaclesController)
router.get('/public',obstaclesController.getObstaclesController) // Public endpoint for navigation
router.get('/user',requireUser,obstaclesController.userObstaclesController)
router.post('/report',requireUser,upload.single('reportimage'),obstaclesController.submitObstaclesController)
router.put('/:id/status', requireUser, obstaclesController.updateObstacleStatusController)


module.exports=router;