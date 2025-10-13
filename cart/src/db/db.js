const mongoose = require("mongoose");

async function ConnectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        .then(()=>{
            console.log("connected to db")
        })
    } catch (error) {
        console.log("error while connecting to db", error)
    }
}

module.exports = ConnectDB;