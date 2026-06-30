import express from "express";
import Booking from "../models/Booking.js";
import Event from "../models/Event.js";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/auth.js";
import { sendBookingConfirmation } from "../utils/email.js";

const router = express.Router();

// ── Book an event ─────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { eventId, attendeeName, attendeeEmail, qty = 1 } = req.body;
    if (!eventId || !attendeeName || !attendeeEmail) return res.status(400).json({ error: "All fields required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status !== "active") return res.status(400).json({ error: "This event is not available for booking" });

    const spotsLeft = event.spots - event.spotsBooked;
    if (spotsLeft < qty) return res.status(400).json({ error: `Only ${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} available` });

    // Check duplicate booking
    const existing = await Booking.findOne({ user: req.user._id, event: eventId, status: { $ne: "cancelled" } });
    if (existing) return res.status(400).json({ error: "You already have a booking for this event" });

    const booking = await Booking.create({
      user: req.user._id,
      event: eventId,
      host: event.host,
      attendeeName,
      attendeeEmail,
      qty: Number(qty),
      totalAmount: event.priceAmount * qty,
    });

    // Reduce available spots
    await Event.findByIdAndUpdate(eventId, { $inc: { spotsBooked: qty } });

    // Notification
    await Notification.create({
      recipient: req.user._id,
      type: "booking",
      title: "Booking Confirmed",
      message: `Your booking for "${event.title}" is confirmed! Booking ID: ${booking.bookingId}`,
      event: eventId,
    });

    // Send confirmation email
    try {
      await sendBookingConfirmation(attendeeEmail, attendeeName, booking, event);
    } catch (emailErr) {
      console.error("Email send error:", emailErr.message);
    }

    const populated = await Booking.findById(booking._id).populate("event", "title date time location city price hostName");
    res.status(201).json({ booking: populated, message: `Booking confirmed! ID: ${booking.bookingId}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Booking failed. Please try again." });
  }
});

// ── My bookings ───────────────────────────────────────────────────────────
router.get("/my", protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("event", "title date time location city price category hostName hostEmail status")
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch {
    res.status(500).json({ error: "Failed to load bookings." });
  }
});

// ── Cancel booking ────────────────────────────────────────────────────────
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status === "cancelled") return res.status(400).json({ error: "Already cancelled" });

    booking.status = "cancelled";
    await booking.save();

    // Restore spots
    await Event.findByIdAndUpdate(booking.event, { $inc: { spotsBooked: -booking.qty } });

    res.json({ message: "Booking cancelled successfully" });
  } catch {
    res.status(500).json({ error: "Cancellation failed. Please try again." });
  }
});

export default router;
