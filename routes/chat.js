import { Router } from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";

const router = Router();

// Get Messages Between Two Users
router.get("/:userId/:friendId", async (req, res) => {
  const { userId, friendId } = req.params;

  try {
    console.log(`Fetching messages between ${userId} and ${friendId}`);

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId },
      ],
    }).sort({ createdAt: 1 }); // Sort messages by date ascending

    res.json(messages); // Send the messages directly
  } catch (err) {
    console.error("Error fetching messages:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Send Message Between Users
router.post("/", async (req, res) => {
  const { text, sender, receiver } = req.body;

  try {
    // Validate sender and receiver exist
    const senderUser = await User.findById(sender);
    const receiverUser = await User.findById(receiver);

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ message: "Sender or Receiver not found" });
    }

    // Create and save new message
    const newMessage = new Message({ text, sender, receiver });
    await newMessage.save();

    // Return the message for immediate display
    res.status(201).json(newMessage);

    console.log("Message sent:", newMessage);
  } catch (err) {
    console.error("Error sending message:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;