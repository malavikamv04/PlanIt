import express from "express";
import UserAccount from "../models/UserAccount.js";
import HostAccount from "../models/HostAccount.js";
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import { protect, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, requireAdmin);

// ── Dashboard stats ───────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [users, hosts, events, bookings] = await Promise.all([
      UserAccount.countDocuments(),
      HostAccount.countDocuments(),
      Event.countDocuments(),
      Booking.countDocuments({ status: { $ne: "cancelled" } }),
    ]);
    const revenue = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    res.json({ users, hosts, events, bookings, revenue: revenue[0]?.total || 0 });
  } catch {
    res.status(500).json({ error: "Failed to load stats." });
  }
});

// ── All users ─────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const users = await UserAccount.find().select("-password").sort({ createdAt: -1 });
    res.json({ users });
  } catch {
    res.status(500).json({ error: "Failed to load users." });
  }
});

router.get("/hosts", async (req, res) => {
  try {
    const hosts = await HostAccount.find().select("-password").sort({ createdAt: -1 });
    res.json({ hosts });
  } catch {
    res.status(500).json({ error: "Failed to load hosts." });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await UserAccount.findByIdAndDelete(req.params.id);
    await Booking.deleteMany({ user: req.params.id });
    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "host", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    const user = await UserAccount.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    res.json({ user });
  } catch {
    res.status(500).json({ error: "Failed to update role." });
  }
});

// ── All events ────────────────────────────────────────────────────────────
router.get("/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json({ events });
  } catch {
    res.status(500).json({ error: "Failed to load events." });
  }
});

router.post("/events", async (req, res) => {
  try {
    const { title, description, category, date, time, location, city, price, priceAmount, spots, image } = req.body;
    const event = await Event.create({
      title, description, category, date, time, location, city,
      price: price || "Free", priceAmount: priceAmount || 0,
      spots: Number(spots) || 50, image: image || "",
      host: null, hostName: "PlanIt Admin", hostEmail: req.user.email || "",
    });
    res.status(201).json({ event, message: "Event created!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create event." });
  }
});

router.put("/events/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ event, message: "Event updated!" });
  } catch {
    res.status(500).json({ error: "Failed to update event." });
  }
});

router.delete("/events/:id", async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    await Booking.deleteMany({ event: req.params.id });
    res.json({ message: "Event deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete event." });
  }
});

// ── All bookings ──────────────────────────────────────────────────────────
router.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("event", "title date city")
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch {
    res.status(500).json({ error: "Failed to load bookings." });
  }
});

// ── Notifications ─────────────────────────────────────────────────────────
router.get("/notifications", async (req, res) => {
  try {
    const notifs = await Notification.find().populate("recipient", "name email").sort({ createdAt: -1 }).limit(50);
    res.json({ notifications: notifs });
  } catch {
    res.status(500).json({ error: "Failed to load notifications." });
  }
});

export default router;
