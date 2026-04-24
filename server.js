const express = require("express");
const cors = require("cors");
require("dotenv").config();

const supabase = require("./config/supabase");

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
 * ADMIN - GET ALL ORDERS
 * =========================
 */
app.get("/api/admin/orders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ADMIN FETCH ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error,
      });
    }

    return res.json({
      success: true,
      orders: data,
    });
  } catch (err) {
    console.error("ADMIN ROUTE CRASH:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.send("🚀 NOXSTORE API RUNNING");
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