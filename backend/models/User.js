import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true, minlength: 6 },
  role:       { type: String, enum: ["user", "host", "admin"], default: "user" },
  phone:      { type: String, default: "" },
  avatar:     { type: String, default: "" }, // Base64 string or URL
  bio:        { type: String, default: "" },
  socials:    { type: Object, default: { twitter: "", linkedin: "", website: "" } },
  savedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
