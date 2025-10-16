const mongoose = require("mongoose");

async function connectDB(){
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log("DB connected")
    } catch (error) {
        console.log("DB connection Error");
        
    }
}


module.exports = connectDB