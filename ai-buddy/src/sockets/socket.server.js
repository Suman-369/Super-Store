const { Server, Socket } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const agent = require("../agents/agent");

async function initializeSocketServer(httpServer) {
  const io = new Server(httpServer, {});
 

  //middleware to authenticate socket connection
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("No cookies found"));
      }

      // Parse cookies properly
      const cookies = cookieHeader.split("; ").reduce((acc, curr) => {
        const [key, value] = curr.split("=");
        acc[key] = value;
        return acc;
      }, {});

      const token = cookies["token"];

      if (!token) {
        return next(new Error("Token not provided"));
      }

      if (!process.env.JWT_SECRET) {
        return next(new Error("JWT_SECRET not configured"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.token = token;
      next();
    } catch (error) {
      console.log("Socket authentication error:", error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(socket.user, socket.token);

    socket.on("message", async (data) => {
      const agentResponse = await agent.invoke({
        messages: [
          {
            role: "user",
            content: data
          }
        ]
      }, {
        metadata: {
          token: socket.token
        }
      });
      


      const lastMessage = agentResponse.messages[agentResponse.messages.length - 1];

      socket.emit("message", lastMessage.content);

  });
})

}
module.exports = {
  initializeSocketServer,
};
