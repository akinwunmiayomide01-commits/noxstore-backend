const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ───────────────────────────────
   1. CORS
────────────────────────────── */
app.use(cors());

/* ───────────────────────────────
   2. PAYSTACK WEBHOOK RAW BODY HANDLING
   IMPORTANT: must come BEFORE express.json()
────────────────────────────── */
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

/* ───────────────────────────────
   3. NORMAL BODY PARSING
────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ───────────────────────────────
   4. ROUTES
────────────────────────────── */
app.use("/api/orders", require("./routes/orders"));
app.use("/api/admin", require("./routes/adminAuth"));
app.use("/api/payments", require("./routes/payments")); // includes initialize + webhook

/* ───────────────────────────────
   5. HEALTH CHECK
────────────────────────────── */
app.get("/", (req, res) => {
  res.send("Noxstore backend running 🚀");
});

/* ───────────────────────────────
   6. ERROR HANDLING (IMPORTANT FOR DEBUGGING)
────────────────────────────── */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({
    message: "Internal server error",
    error: err.message,
  });
});

/* ───────────────────────────────
   7. START SERVER
────────────────────────────── */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});