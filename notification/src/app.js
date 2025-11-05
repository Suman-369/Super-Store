const express = require('express');
const {Connect , consumeFromQueue} = require('./broker/broker');

const setListeners = require('./broker/listners');
const app = express()

Connect().then(()=>{
    setListeners();
})

app.get("/",(req,res)=>{
    res.send("Notification Service is running")
})


module.exports = app