import cors from "cors";
import { configDotenv } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import pinoHttp from "pino-http";
import logger from "./logger.js";
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import userRoutes from "./routes/userRoutes.js";

configDotenv();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// error handler
app.use((err, _req, res, _next) => {
  logger.error(err, "Unhandled error");
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Database & Server
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    logger.info("Connected to database");
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.fatal(err, "Database connection failed");
    process.exit(1);
  });
