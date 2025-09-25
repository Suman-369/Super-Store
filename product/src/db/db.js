const mongoose = require("mongoose");

async function connectDB(){
    try {
        await mongoose.connect(process.env.MONGO_URL)
        .then(()=>{
            console.log("Database connected");
        })
    } catch (error) {
        console.log("Database connection failed",error);
        
    }
}

module.exports = connectDB