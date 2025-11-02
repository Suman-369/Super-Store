require("dotenv").config();
const app = require("./src/app");
const http = require("http");
const { initializeSocketServer } = require("./src/sockets/socket.server");

const httpServer = http.createServer(app);
initializeSocketServer(httpServer);



httpServer.listen(3005, () => {
  console.log(`Server is running on port 3005`);
});
