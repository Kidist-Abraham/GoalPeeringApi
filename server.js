require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { authenticateSocket } = require("./utils/middleware");
const db = require("./db"); 

const authRoutes = require("./routes/auth");
const goalRoutes = require("./routes/goal");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/goal", goalRoutes);

// --------------------------------------
// 1) Create an HTTP server from app
// 2) Attach Socket.IO to that server
// --------------------------------------
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3000;

  const server = http.createServer(app);

  const { Server } = require("socket.io");
  const io = new Server(server, {
    cors: {
      origin: "*",  
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} by user ${socket.user.id}`);

  // --------------------------------------
  // Socket.IO logic
  // --------------------------------------
  socket.on("joinGroup", async (msg) => {
    groupId = Number(msg.groupId)
    console.log('Joining ', groupId)
    try {
      const membershipCheck = `
        SELECT 1
        FROM goal_members
        WHERE user_id = $1
          AND goal_id = $2
      `;
      const result = await db.query(membershipCheck, [socket.user.id , groupId]);
      
      if (result.rowCount === 0) {
        return socket.emit("errorMessage", "User is not a member of this group");
      }
      
      // Join the group room
      socket.join(`group_${groupId}`);
    const messages = await db.query(`
      SELECT cm.id, cm.message_text, cm.user_id, cm.created_at, u.username AS user_name
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.goal_id = $1
      ORDER BY cm.created_at ASC
      LIMIT 50
    `, [groupId]);
    socket.emit("initialMessages", messages.rows);
      
    } catch (err) {
      console.error("Error joining group:", err);
      socket.emit("errorMessage", "Error joining group");
    }
  });
  
  //  Listen for new chat messages and broadcast them to the group room
  socket.on("sendMessage", async ({ groupId, text }) => {
    try {

      const membershipCheck = `
        SELECT 1
        FROM goal_members
        WHERE user_id = $1
          AND goal_id = $2
      `;
      const memResult = await db.query(membershipCheck, [socket.user.id, groupId]);
      if (memResult.rowCount === 0) {
        return socket.emit("errorMessage", "User is not a member of this group");
      }
      

      const insertQuery = `
        INSERT INTO chat_messages (goal_id, user_id, message_text)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const insertResult = await db.query(insertQuery, [groupId, socket.user.id, text]);
      const newMessage = insertResult.rows[0];

      const userResult = await db.query(`SELECT username FROM users WHERE id = $1`, [socket.user.id]);
    const userName = userResult.rows[0]?.username ?? "Anonymous";
      
    
      io.to(`group_${groupId}`).emit("newMessage", {
        id: newMessage.id,
        group_id: newMessage.group_id,
        user_id: newMessage.user_id,
        message_text: newMessage.message_text,
        created_at: newMessage.created_at,
        user_name: userName,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      socket.emit("errorMessage", "Failed to send message");
    }
  });
  
  //  Handle disconnects
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});


  // Start the server
  server.listen(PORT, () => {
    console.log(`Server (HTTP+Socket) running on http://localhost:${PORT}`);
  });
}

module.exports = app;
