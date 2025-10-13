require("dotenv").config()
const app = require("./src/app")
const ConnectDB = require("./src/db/db")



ConnectDB()

app.listen(3002,()=>{
    console.log("listening on port 3002")
})