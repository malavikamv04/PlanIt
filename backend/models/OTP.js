import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true, lowercase: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts:  { type: Number, default: 0 },
  purpose:   { type: String, default: "registration" },
  issuedAt:  { type: Date, default: Date.now, expires: 86400 }, // garbage collection after 24h
});

export default mongoose.model("OTP", otpSchema);
