const express = require("express");
const router = express.Router();
const axios = require("axios");

const supabase = require("../config/supabase");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://noxstore-frontend.vercel.app";

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
router.get("/", (req, res) => {
  res.json({ message: "Paystack route working ✅" });
});

/**
 * =========================
 * INITIALIZE PAYMENT
 * =========================
 */
router.post("/initialize", async (req, res) => {
  try {
    const { email, amount, player_id, game_id } = req.body;

    console.log("🔥 INIT REQUEST:", req.body);

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email and amount required",
      });
    }

    if (!PAYSTACK_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Missing Paystack secret key",
      });
    }

    // 🔥 PAYSTACK INIT
    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: Number(amount) * 100,
        callback_url: `${FRONTEND_URL}/payment-success`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = paystackRes.data;

    console.log("📦 PAYSTACK RESPONSE:", data);

    if (!data.status) {
      return res.status(400).json({
        success: false,
        message: "Paystack initialization failed",
      });
    }

    const reference = data.data.reference;

    // 🔥 SAVE ORDER
    const { error } = await supabase.from("orders").insert([
      {
        email,
        amount,
        reference,
        player_id: player_id || null,
        game_id: game_id || null,
        status: "pending",
      },
    ]);

    if (error) {
      console.log("❌ SUPABASE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Database insert failed",
        error: error.message,
      });
    }

    return res.json({
      success: true,
      authorization_url: data.data.authorization_url,
      reference,
    });
  } catch (err) {
    console.error("🔥 INIT ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: "Initialize error",
      error: err.message,
    });
  }
});

/**
 * =========================
 * VERIFY PAYMENT
 * =========================
 */
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    console.log("🔍 VERIFYING:", reference);

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    const data = response.data;

    console.log("📦 VERIFY RESPONSE:", data);

    if (!data.status) {
      return res.status(400).json({
        success: false,
        message: "Verification failed",
      });
    }

    return res.json({
      success: true,
      data: data.data,
    });
  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: "Verification error",
      error: err.message,
    });
  }
});

module.exports = router;