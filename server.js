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

// Orders routes (IMPORTANT)
app.use("/api/orders", require("./routes/orders"));

// Admin auth routes
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
 * START SERVER
 * =========================
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});