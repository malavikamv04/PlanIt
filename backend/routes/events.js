import express from "express";
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";
import { protect, requireHost } from "../middleware/auth.js";

const router = express.Router();

// ── Get all events (public) ───────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { category, city, search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    else filter.status = "active";
    if (category && category !== "All") filter.category = category;
    if (city) filter.city = { $regex: city, $options: "i" };
    if (search) filter.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];

    const events = await Event.find(filter).sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load events." });
  }
});

// ── Get single event ──────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json({ event });
  } catch {
    res.status(404).json({ error: "Event not found" });
  }
});

// ── Create event (host/admin) ─────────────────────────────────────────────
router.post("/", protect, requireHost, async (req, res) => {
  try {
    const { title, description, category, date, time, location, city, price, priceAmount, spots, image, tags, volunteerPassword, assignedVolunteers } = req.body;
    if (!title || !description || !category || !date || !time || !location || !city)
      return res.status(400).json({ error: "All required fields must be filled" });

    const hostId = req.user.isLocalAdmin ? null : req.user._id;
    const event = await Event.create({
      title, description, category, date, time, location, city,
      price: price || "Free",
      priceAmount: priceAmount || 0,
      spots: Number(spots) || 50,
      image: image || "",
      tags: tags || [],
      volunteerPassword: volunteerPassword || "",
      assignedVolunteers: Array.isArray(assignedVolunteers) ? assignedVolunteers.filter(v => v.name && v.email) : [],
      host: hostId,
      hostName: req.user.name || "PlanIt Host",
      hostEmail: req.user.email || "",
    });

    res.status(201).json({ event, message: "Event created successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create event." });
  }
});

// ── Update event ──────────────────────────────────────────────────────────
router.put("/:id", protect, requireHost, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const isOwner = req.user.isLocalAdmin || req.user.role === "admin" ||
      event.host?.toString() === req.user._id?.toString();
    if (!isOwner) return res.status(403).json({ error: "Not authorized to edit this event" });

    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ event: updated, message: "Event updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update event." });
  }
});

// ── Delete event ──────────────────────────────────────────────────────────
router.delete("/:id", protect, requireHost, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const isOwner = req.user.isLocalAdmin || req.user.role === "admin" ||
      event.host?.toString() === req.user._id?.toString();
    if (!isOwner) return res.status(403).json({ error: "Not authorized to delete this event" });

    await Event.findByIdAndDelete(req.params.id);
    await Booking.deleteMany({ event: req.params.id });
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event." });
  }
});

// ── Get bookings for an event (host/admin) ────────────────────────────────
router.get("/:id/bookings", protect, requireHost, async (req, res) => {
  try {
    const bookings = await Booking.find({ event: req.params.id })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch {
    res.status(500).json({ error: "Failed to load bookings." });
  }
});

export default router;
