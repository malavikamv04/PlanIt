import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/planit";
    // If a cached env var still has the dummy placeholder, force it to local
    if (uri.includes("cluster.mongodb.net") && uri.includes("username:password")) {
      uri = "mongodb://127.0.0.1:27017/planit";
    }
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    // process.exit(1);
  }
};
