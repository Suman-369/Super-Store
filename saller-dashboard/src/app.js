const express = require("express")
const sallerRoutes = require("./src/routes/saller.routes")
const cookieParser = require("cookie-parser")

app.use(cookieParser())
const app = express()
app.use(express.json())


app.get("/",(req,res)=>{
    res.status(200).json({message:"Welcome to the seller dashboard API"})
})


app.use("/api/saller/dashboard", sallerRoutes)

module.exports = app 