
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";

import serviceRoutes from "./routes/service.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { stripeWebhook } from "./controllers/payment.controller.js";

await connectDB();

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "10mb" }));

app.use("/api/services", serviceRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/", (req, res) => {
  res.send("SalonBook API is running!");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SalonBook server is healthy",
  });
});

export default app;
