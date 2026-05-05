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

/**
 * =========================
 * ROUTES
 * =========================
 */

// Paystack (payments)
app.use("/api/paystack", require("./routes/paystack"));

// Orders (you should already have this)
app.use("/api/orders", require("./routes/orders"));

// Admin authentication (NEW)
app.use("/api/admin", require("./routes/adminAuth"));

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.send("Noxstore backend running 🚀");
});

/**
 * =========================
 * SERVER
 * =========================
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});