import express from "express";
import jwt from "jsonwebtoken";
import { getModelByRole } from "../models/getModel.js";
import AdminAccount from "../models/AdminAccount.js";
import OTP from "../models/OTP.js";
import { sendOtpEmail } from "../utils/email.js";
import { protect } from "../middleware/auth.js";
import Notification from "../models/Notification.js";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "planit_super_secret_key_2026";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "PlanIt@Admin2026";

const makeToken = (id, role, extra = {}) =>
  jwt.sign({ id, role, ...extra }, SECRET, { expiresIn: "7d" });

// ── Admin login (fixed password) ──────────────────────────────────────────
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (password !== ADMIN_PASS) return res.status(401).json({ error: "Invalid admin credentials" });

    let admin = await AdminAccount.findOne({ email: email.toLowerCase() });
    if (!admin) {
      admin = await AdminAccount.create({ name: "Admin", email: email.toLowerCase(), password: ADMIN_PASS + Date.now(), role: "admin", isVerified: true });
    }

    const token = makeToken(admin._id, "admin");
    res.json({ token, user: { id: admin._id, name: admin.name, email: admin.email, role: "admin" } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── Send OTP ──────────────────────────────────────────────────────────────
router.post("/send-otp", async (req, res) => {
  try {
    const { email, role: signupRole } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    // Check across all role collections
    const safeRole = ["user", "host", "volunteer"].includes(signupRole) ? signupRole : "user";
    const Model = getModelByRole(safeRole);
    const exists = await Model.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "An account with this email already exists" });

    const recent = await OTP.findOne({ email: email.toLowerCase(), issuedAt: { $gt: new Date(Date.now() - 60000) } });
    if (recent) {
      const wait = Math.ceil((60000 - (Date.now() - recent.issuedAt.getTime())) / 1000);
      return res.status(429).json({ error: `Please wait ${wait}s before requesting a new code` });
    }

    const otp = String(100000 + Math.floor(Math.random() * 900000));
    await OTP.deleteMany({ email: email.toLowerCase() });
    await OTP.create({ email: email.toLowerCase(), otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    const result = await sendOtpEmail(email, otp);
    res.json({ success: true, message: "Verification code sent!", ...result, role: safeRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send verification code. Try again later." });
  }
});

// ── Verify OTP ────────────────────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

    const record = await OTP.findOne({ email: email.toLowerCase() });
    if (!record) return res.status(400).json({ error: "No code found. Request a new one." });
    if (record.expiresAt < new Date()) {
      await OTP.deleteMany({ email: email.toLowerCase() });
      return res.status(400).json({ error: "Code expired. Request a new one." });
    }
    if (record.attempts >= 5) {
      await OTP.deleteMany({ email: email.toLowerCase() });
      return res.status(400).json({ error: "Too many attempts. Request a new code." });
    }

    await OTP.updateOne({ email: email.toLowerCase() }, { $inc: { attempts: 1 } });

    if (record.otp !== otp) {
      const left = 4 - record.attempts;
      return res.status(400).json({ error: `Invalid code. ${left} attempt${left !== 1 ? "s" : ""} remaining.` });
    }

    await OTP.deleteMany({ email: email.toLowerCase() });
    res.json({ success: true, message: "Email verified successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// ── Register ──────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "user" } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });

    const safeRole = ["user", "host", "volunteer"].includes(role) ? role : "user";
    const Model = getModelByRole(safeRole);

    const exists = await Model.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "An account with this email already exists" });

    const user = await Model.create({ name, email: email.toLowerCase(), password, role: safeRole, isVerified: true });
    const token = makeToken(user._id, user.role);

    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    // Query only the correct role's collection
    const safeRole = ["user", "host", "volunteer"].includes(expectedRole) ? expectedRole : "user";
    const Model = getModelByRole(safeRole);
    const user = await Model.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: "Invalid email or password" });

    const token = makeToken(user._id, user.role);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── Get current user ──────────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  if (req.user.isLocalAdmin) return res.json({ user: req.user });
  const Model = getModelByRole(req.user.role);
  const user = await Model.findById(req.user._id).select("-password").populate("savedEvents");
  res.json({ user });
});

// ── Update profile ────────────────────────────────────────────────────────
router.put("/profile", protect, async (req, res) => {
  try {
    if (req.user.isLocalAdmin) return res.json({ success: true });
    const { name, phone, bio, avatar, socials } = req.body;
    const Model = getModelByRole(req.user.role);
    const user = await Model.findByIdAndUpdate(
      req.user._id,
      { name, phone, bio, avatar, socials },
      { new: true }
    ).select("-password").populate("savedEvents");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Profile update failed." });
  }
});
// ── Notifications ─────────────────────────────────────────────────────────
router.get("/notifications", protect, async (req, res) => {
  try {
    if (req.user.isLocalAdmin) return res.json({ notifications: [] });
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .populate("event", "title date time");
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
});

router.put("/notifications/:id/read", protect, async (req, res) => {
  try {
    if (req.user.isLocalAdmin) return res.json({ success: true });
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark read." });
  }
});

// ── Saved Events Toggle ───────────────────────────────────────────────────
router.post("/saved-events/:eventId", protect, async (req, res) => {
  try {
    if (req.user.isLocalAdmin) return res.status(403).json({ error: "Admins cannot save events." });
    const Model = getModelByRole(req.user.role);
    const user = await Model.findById(req.user._id);
    const eventId = req.params.eventId;
    const isSaved = user.savedEvents?.includes(eventId);
    if (isSaved) {
      user.savedEvents = user.savedEvents.filter(id => id.toString() !== eventId);
    } else {
      if (!user.savedEvents) user.savedEvents = [];
      user.savedEvents.push(eventId);
    }
    await user.save();
    const updatedUser = await Model.findById(req.user._id).select("-password").populate("savedEvents");
    res.json({ saved: !isSaved, user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle saved event." });
  }
});

export default router;
