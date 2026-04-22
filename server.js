const express = require("express");
const cors = require("cors");
require("dotenv").config();

/**
 * =========================
 * IMPORT ROUTES
 * =========================
 */
const paystackRoutes = require("./routes/paystack");
const adminRoutes = require("./routes/admin");

/**
 * =========================
 * INIT APP
 * =========================
 */
const app = express();

/**
 * =========================
 * MIDDLEWARE
 * =========================
 */
app.use(cors({
  origin: "https://noxstore-frontend.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json());

/**
 * =========================
 * ROUTES
 * =========================
 */
app.use("/api/paystack", paystackRoutes);
app.use("/api/admin", adminRoutes);

/**
 * =========================
 * START WORKER (IMPORTANT)
 * =========================
 */
require("./services/queue/topupWorker");

/**
 * =========================
 * HEALTH CHECK (RENDER)
 * =========================
 */
app.get("/", (req, res) => {
  res.send("🚀 NOXSTORE API RUNNING");
});

/**
 * =========================
 * 404 HANDLER
 * =========================
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

/**
 * =========================
 * GLOBAL ERROR HANDLER
 * =========================
 */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    error: "Internal server error",
  });
});

/**
 * =========================
 * SERVER START
 * =========================
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});