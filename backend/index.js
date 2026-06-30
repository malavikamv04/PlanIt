import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import bookingRoutes from "./routes/bookings.js";
import adminRoutes from "./routes/admin.js";
import hostRoutes from "./routes/host.js";
import volunteerRoutes from "./routes/volunteer.js";

// ── Connect to MongoDB ────────────────────────────────────────────────────
await connectDB();

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowedLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
    ];
    if (allowedOrigins.includes(origin) || allowedLocalhost.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Simple request logger for debugging frontend network issues
app.use((req, res, next) => {
  try {
    console.log(`→ [${new Date().toISOString()}] ${req.method} ${req.path} from ${req.ip}`);
    if (req.method !== 'GET') console.log('   body:', JSON.stringify(req.body));
  } catch (e) {
    // ignore logging errors
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/host", hostRoutes);
app.use("/api/volunteer", volunteerRoutes);

// ── Health check ──────────────────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok", service: "PlanIt API" }));

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.path} not found` }));

// ── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again later." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 PlanIt API running on http://localhost:${PORT}`));
