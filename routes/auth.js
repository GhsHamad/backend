import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Message from "../models/Message.js";
import nodemailer from "nodemailer";

const router = Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(403).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Error verifying JWT token:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// User Registration
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    console.log("Registering new user:", email);
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user but set isVerified to false
    const friendCode = Math.random().toString(36).substring(2, 10);
    const newUser = new User({
      name,
      email,
      password,
      friendCode,
      isVerified: false,
      verificationCode,
    });

    await newUser.save();

    // Send the verification code to the user's email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email",
      text: `Your verification code is: ${verificationCode}`,
    });

    res.status(200).json({ message: "Verification code sent to your email" });
  } catch (err) {
    console.error("Error during user registration:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Email Verification
router.post("/verify", async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationCode = undefined; // Remove verification code
    await user.save();

    res.status(200).json({ message: "Account verified successfully" });
  } catch (err) {
    console.error("Error during verification:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// User Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("Attempting to login:", email);
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ token, user });
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add Friend Route
router.post("/add_friend", authenticateToken, async (req, res) => {
  const { friendCode } = req.body;
  try {
    console.log("Adding friend with code:", friendCode);
    const user = await User.findById(req.user.id);
    const friend = await User.findOne({ friendCode });

    if (!friend) {
      console.log("Friend not found with code:", friendCode);
      return res.status(404).json({ message: "Friend not found" });
    }

    user.friends.push(friend._id);
    await user.save();
    res.status(200).json({ newFriend: friend });
  } catch (err) {
    console.error("Error adding friend:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Remove Friend Route
router.delete("/remove_friend", authenticateToken, async (req, res) => {
  const { friendId } = req.body;
  try {
    const user = await User.findById(req.user.id);
    user.friends = user.friends.filter((friend) => friend.toString() !== friendId);
    await user.save();

    await Message.deleteMany({
      $or: [
        { sender: req.user.id, receiver: friendId },
        { sender: friendId, receiver: req.user.id },
      ],
    });

    res.status(200).json({ message: "Friend and associated messages removed successfully" });
  } catch (err) {
    console.error("Error removing friend:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get User Information Route
router.get("/user", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user info:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
