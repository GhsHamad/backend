import "dotenv/config";
import express, { json } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import messageRoutes from "./routes/chat.js"; // Ensure this is the correct file for messages

// Set up environment variable
const PORT = process.env.PORT || 5000;

// Connect to MongoDB with error handling
connectDB().catch((err) => {
  console.error("Error connecting to MongoDB:", err);
  process.exit(1); // Exit the process if DB connection fails
});

// App setup
const app = express();
app.use(cors({
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(json());

// Routes setup
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);  // Message route

// WebSocket setup with error handling
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Listen for incoming messages and emit them to all users
  socket.on("send_message", (data) => {
    console.log("Message received:", data);
    io.emit("receive_message", data); // Broadcast to all connected users
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server and handle potential errors
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Error starting the server:', err);
  process.exit(1);
});
