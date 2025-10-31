const mongoose=require('mongoose');

module.exports=async ()=>{
    try {
       await mongoose.connect(process.env.MONGO_URI)
       console.log("DB Connected")
    } catch (error) {
        console.log(error)
        process.exit(1); //server turns off - rare use of this line
    }
}