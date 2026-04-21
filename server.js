const express = require("express");
const cors = require("cors");
require("dotenv").config();

const paystackRoutes = require("./routes/paystack");

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
app.use("/api/paystack", paystackRoutes);

/**
 * =========================
 * HEALTH CHECK (IMPORTANT FOR RENDER)
 * =========================
 */
app.get("/", (req, res) => {
  res.send("NOXSTORE API RUNNING");
});

/**
 * =========================
 * SERVER START (FIXED FOR RENDER)
 * =========================
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});