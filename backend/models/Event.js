import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  description:  { type: String, required: true },
  category:     { type: String, required: true },
  date:         { type: String, required: true },
  time:         { type: String, required: true },
  location:     { type: String, required: true },
  city:         { type: String, required: true },
  price:        { type: String, default: "Free" },
  priceAmount:  { type: Number, default: 0 },
  spots:        { type: Number, required: true, default: 50 },
  spotsBooked:  { type: Number, default: 0 },
  image:        { type: String, default: "" },
  host:         { type: mongoose.Schema.Types.ObjectId, ref: "UserAccount", required: true },
  hostName:     { type: String, default: "" },
  hostEmail:    { type: String, default: "" },
  assignedVolunteers: [{ name: String, email: String }],
  status:       { type: String, enum: ["active", "cancelled", "completed"], default: "active" },
  tags:         [String],
  volunteerPassword: { type: String, default: "" },
}, { timestamps: true });

eventSchema.virtual("spotsLeft").get(function () {
  return Math.max(0, this.spots - this.spotsBooked);
});

export default mongoose.model("Event", eventSchema);
