const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

/**
 * =========================
 * MIDDLEWARE
 * =========================
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * =========================
 * ROUTES
 * =========================
 */

// AUTH ROUTES
app.use("/api/auth", require("./routes/auth"));

// PAYMENT ROUTES
app.use("/api/payments", require("./routes/payments"));

// ORDER ROUTES (optional history)
app.use("/api/orders", require("./routes/orders"));

// WEBHOOK ROUTE (PAYSTACK)
app.use("/api/webhook", require("./routes/webhook"));

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.json({
    status: "Noxstore backend running 🚀",
    version: "2.0-webhook-enabled"
  });
});

/**
 * =========================
 * ERROR HANDLER (IMPORTANT)
 * =========================
 */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({
    message: "Internal server error"
  });
});

/**
 * =========================
 * START SERVER
 * =========================
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});