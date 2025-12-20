require("dotenv").config()

const app = require("./src/app")
const connectDB = require("./src/db/db")
const {Connect} = require ("./src/broker/broker")

connectDB()
Connect()

app.listen(3003,()=>{
    console.log("server is running on port 3003")
})