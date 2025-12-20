require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/db/db");

const listener = require("./src/broker/listner");
const { Connect } = require("./src/broker/broker");

connectDB();
Connect().then(() => {
  listener();
});

app.listen(3007, () => {
  console.log("Saller Dashboard is running on port 3007");
});
