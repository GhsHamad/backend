import { Schema, model } from "mongoose";
import { genSalt, hash } from "bcrypt";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friendCode: { type: String, unique: true, required: true },
  friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
  isVerified: { type: Boolean, default: false }, // New field to track verification
  verificationCode: { type: String, required: false }, // Field to store email verification code
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await genSalt(10);
    this.password = await hash(this.password, salt);
    next();
  } catch (err) {
    console.error("Error hashing password:", err.message);
    next(err);
  }
});

export default model("User", UserSchema);
