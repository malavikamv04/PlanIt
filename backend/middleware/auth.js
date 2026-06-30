import jwt from "jsonwebtoken";
import { getModelByRole } from "../models/getModel.js";

const SECRET = process.env.JWT_SECRET || "planit_super_secret_key_2026";

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Authentication required" });

    const decoded = jwt.verify(token, SECRET);

    if (decoded.isLocalAdmin) {
      req.user = { _id: "admin", id: "admin", role: "admin", name: "Admin", email: decoded.email, isLocalAdmin: true };
      return next();
    }

    // Pick the correct collection based on role stored in token
    const Model = getModelByRole(decoded.role);
    const user = await Model.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ error: "Account not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin" && !req.user?.isLocalAdmin)
    return res.status(403).json({ error: "Admin access required" });
  next();
};

export const requireHost = (req, res, next) => {
  const r = req.user?.role;
  if (r !== "host" && r !== "admin" && !req.user?.isLocalAdmin)
    return res.status(403).json({ error: "Host access required" });
  next();
};
