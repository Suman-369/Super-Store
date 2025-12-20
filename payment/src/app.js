const express = require("express");
const app = express();
const cookiesParser = require("cookie-parser");
const cors = require("cors");
const paymentRoutes = require("./routes/payment.routes");

app.use(cors());
app.use(express.json());
app.use(cookiesParser());

app.get("/",(req,res)=>{
    res.status(200).json({message:"Payment Service is up and running"})
})

app.use("/api/payments", paymentRoutes);

module.exports = app;
