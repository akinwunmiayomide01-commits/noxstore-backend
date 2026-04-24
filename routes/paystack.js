const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");
const fetch = require("node-fetch");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://noxstore-frontend.vercel.app";

/**
 * =========================
 * TEST ROUTE
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
    console.log("🔥 INIT REQUEST:", req.body);

    const { email, amount, player_id, game_id } = req.body;

    // VALIDATION
    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email and amount required",
      });
    }

    if (!PAYSTACK_SECRET) {
      console.log("❌ Missing Paystack key");
      return res.status(500).json({
        success: false,
        message: "Server misconfiguration",
      });
    }

    /**
     * =========================
     * PAYSTACK REQUEST
     * =========================
     */
    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: Number(amount) * 100,
          callback_url: `${FRONTEND_URL}/payment-success`,
        }),
      }
    );

    const data = await paystackRes.json();
    console.log("📦 PAYSTACK RESPONSE:", data);

    if (!data.status) {
      return res.status(400).json({
        success: false,
        message: data.message || "Paystack error",
      });
    }

    const reference = data.data.reference;

    /**
     * =========================
     * SUPABASE INSERT
     * =========================
     */
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

    // 🔴 FULL DEBUG ERROR (THIS IS WHAT YOU NEEDED)
    if (error) {
      console.log("❌ SUPABASE FULL ERROR:", JSON.stringify(error, null, 2));

      return res.status(500).json({
        success: false,
        message: "Database insert failed",
        error: error.message || error,
      });
    }

    /**
     * =========================
     * SUCCESS RESPONSE
     * =========================
     */
    return res.status(200).json({
      success: true,
      authorization_url: data.data.authorization_url,
      reference,
    });
  } catch (err) {
    console.error("🔥 INIT CRASH:", err);

    return res.status(500).json({
      success: false,
      message: "Unexpected server error",
      error: err.message,
    });
  }
});

module.exports = router;