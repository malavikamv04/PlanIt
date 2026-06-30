import express from "express";
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { protect, requireHost } from "../middleware/auth.js";
import { sendEventNotification } from "../utils/email.js";

const router = express.Router();
router.use(protect, requireHost);

// ── Host's own events ─────────────────────────────────────────────────────
router.get("/events", async (req, res) => {
  try {
    const filter = req.user.isLocalAdmin || req.user.role === "admin"
      ? {}
      : { host: req.user._id };
    const events = await Event.find(filter).sort({ createdAt: -1 });
    res.json({ events });
  } catch {
    res.status(500).json({ error: "Failed to load events." });
  }
});

// ── Participants for host's event ─────────────────────────────────────────
router.get("/events/:id/participants", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const isOwner = req.user.role === "admin" || req.user.isLocalAdmin ||
      event.host?.toString() === req.user._id?.toString();
    if (!isOwner) return res.status(403).json({ error: "Not authorized" });

    const bookings = await Booking.find({ event: req.params.id })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });
    res.json({ bookings, event });
  } catch {
    res.status(500).json({ error: "Failed to load participants." });
  }
});

// ── Notify all participants ───────────────────────────────────────────────
router.post("/events/:id/notify", async (req, res) => {
  try {
    const { type, message } = req.body;
    if (!type || !message) return res.status(400).json({ error: "Type and message required" });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const isOwner = req.user.role === "admin" || req.user.isLocalAdmin ||
      event.host?.toString() === req.user._id?.toString();
    if (!isOwner) return res.status(403).json({ error: "Not authorized" });

    const bookings = await Booking.find({ event: req.params.id, status: "upcoming" }).populate("user", "name email");

    let sent = 0;
    for (const booking of bookings) {
      try {
        const toEmail = booking.user?.email || booking.attendeeEmail;
        const toName = booking.user?.name || booking.attendeeName || "Attendee";
        // Skip if we don't have any email to send to
        if (!toEmail) {
          console.warn(`Skipping notification for booking ${booking._id}: no email available`);
          continue;
        }

        await sendEventNotification(toEmail, toName, event, type, message);
        if (booking.user) {
          await Notification.create({
            recipient: booking.user._id ?? booking.user,
            type: type === "cancelled" ? "cancellation" : "update",
            title: `Event ${type}: ${event.title}`,
            message,
            event: event._id,
          });
        }
        sent++;
      } catch (e) {
        console.error("Notification error:", e?.message || e);
      }
    }

    if (type === "cancelled") {
      await Event.findByIdAndUpdate(req.params.id, { status: "cancelled" });
    }

    res.json({ message: `Notified ${sent} participant${sent !== 1 ? "s" : ""}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Notification failed." });
  }
});

// ── Host dashboard stats ──────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const filter = req.user.isLocalAdmin ? {} : { host: req.user._id };
    const events = await Event.find(filter);
    const eventIds = events.map((e) => e._id);
    const bookings = await Booking.find({ event: { $in: eventIds }, status: { $ne: "cancelled" } });
    res.json({
      totalEvents: events.length,
      activeEvents: events.filter((e) => e.status === "active").length,
      totalBookings: bookings.length,
      totalAttendees: bookings.reduce((a, b) => a + b.qty, 0),
    });
  } catch {
    res.status(500).json({ error: "Failed to load stats." });
  }
});

export default router;
