import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type:      { type: String, enum: ["booking", "cancellation", "update", "reminder", "system"], required: true },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  event:     { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  read:      { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);
