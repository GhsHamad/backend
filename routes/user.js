import { Router } from "express";
import User from "../models/User.js";  // Correct import

const router = Router();

// Get All Users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");  // Correct method call
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User By ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");  // Correct method call
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if name exists
    if (!user.name) {
      console.log(`User with ID ${req.params.id} does not have a name.`);
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
