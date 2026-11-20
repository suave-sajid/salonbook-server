
import express from "express";
import cors from "cors";

import serviceRoutes from "./routes/service.routes.js";

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/services", serviceRoutes);

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
