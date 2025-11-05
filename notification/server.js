require('dotenv').config();

const app = require("./src/app")


app.listen(3006,()=>{
    console.log("Notification is running on port 3006");
})