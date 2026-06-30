import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true },
  event:         { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  host:          { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount" },
  attendeeName:  { type: String, required: true },
  attendeeEmail: { type: String, required: true },
  qty:           { type: Number, required: true, default: 1, min: 1, max: 10 },
  status:        { type: String, enum: ["upcoming", "past", "cancelled"], default: "upcoming" },
  bookingId:     { type: String, unique: true },
  totalAmount:   { type: Number, default: 0 },
  isScanned:     { type: Boolean, default: false },
}, { timestamps: true });

bookingSchema.pre("save", function (next) {
  if (!this.bookingId) {
    this.bookingId = "PLT-" + Date.now().toString(36).toUpperCase() + "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  next();
});

export default mongoose.model("Booking", bookingSchema);
