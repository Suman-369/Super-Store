const express = require('express');
const {Connect , consumeFromQueue} = require('./broker/broker');

const setListeners = require('./broker/listners');
const app = express()

Connect().then(()=>{
    setListeners();
})

app.get("/",(req,res)=>{
    res.status(200).json({message:"Notification Service is up and running"})
})


module.exports = app