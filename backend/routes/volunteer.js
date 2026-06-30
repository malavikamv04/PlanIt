import express from "express";
import jwt from "jsonwebtoken";
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "planit_super_secret_key_2026";

const makeToken = (eventId, role) =>
  jwt.sign({ eventId, role }, SECRET, { expiresIn: "1d" });

// Middleware to verify volunteer token
const protectVolunteer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== "volunteer") {
      return res.status(403).json({ error: "Access denied" });
    }
    req.volunteer = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ── Volunteer login ───────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { eventId, email, password } = req.body;
    if (!eventId || !email || !password) return res.status(400).json({ error: "Event ID, email, and password required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    if (!event.assignedVolunteers || !event.assignedVolunteers.some(v => v.email?.toLowerCase() === email.toLowerCase())) {
      return res.status(403).json({ error: "You are not assigned as a volunteer for this event" });
    }

    if (!event.volunteerPassword || event.volunteerPassword !== password) {
      return res.status(401).json({ error: "Invalid volunteer password" });
    }

    const token = makeToken(event._id, "volunteer");
    res.json({ token, event: { id: event._id, title: event.title, date: event.date } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── Get event stats for volunteer ─────────────────────────────────────────
router.get("/event", protectVolunteer, async (req, res) => {
  try {
    const event = await Event.findById(req.volunteer.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const totalBookings = await Booking.countDocuments({ event: event._id, status: { $ne: "cancelled" } });
    const scannedBookings = await Booking.countDocuments({ event: event._id, isScanned: true, status: { $ne: "cancelled" } });

    res.json({ 
      event: { title: event.title, date: event.date },
      stats: { total: totalBookings, scanned: scannedBookings }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load event details" });
  }
});

// ── Scan QR Code ──────────────────────────────────────────────────────────
router.post("/scan", protectVolunteer, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: "Booking ID is required" });

    const booking = await Booking.findOne({ bookingId }).populate("event");
    
    if (!booking) {
      return res.status(404).json({ error: "Invalid ticket: Booking not found" });
    }

    if (booking.event._id.toString() !== req.volunteer.eventId) {
      return res.status(403).json({ error: "Invalid ticket: Belongs to a different event" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Invalid ticket: Booking was cancelled" });
    }

    if (booking.isScanned) {
      return res.status(400).json({ error: "Ticket has already been scanned/used" });
    }

    booking.isScanned = true;
    await booking.save();

    res.json({ success: true, message: "Ticket verified successfully!", attendee: booking.attendeeName, qty: booking.qty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scanning failed. Please try again." });
  }
});

export default router;
