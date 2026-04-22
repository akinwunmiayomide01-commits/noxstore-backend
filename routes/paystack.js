const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

// OPTIONAL: safe import (won’t crash if missing)
let processTopUp = null;
try {
  processTopUp = require("../services/topupService").processTopUp;
} catch (err) {
  console.log("⚠️ TopUp service not found - skipping auto topup");
}

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://noxstore-frontend.vercel.app";

/**
 * =========================
 * INITIATE PAYMENT
 * =========================
 */
router.post("/initialize", async (req, res) => {
  try {
    const { email, amount, player_id, game_id } = req.body;

    console.log("INIT REQUEST:", req.body);

    // ✅ VALIDATION
    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email and amount are required",
      });
    }

    if (!PAYSTACK_SECRET) {
      console.log("❌ PAYSTACK KEY MISSING");
      return res.status(500).json({
        success: false,
        message: "Server config error (missing Paystack key)",
      });
    }

    // ✅ PAYSTACK REQUEST
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

    // 🔥 IMPORTANT: HANDLE BAD RESPONSE
    if (!paystackRes.ok) {
      const text = await paystackRes.text();
      console.log("❌ PAYSTACK HTTP ERROR:", text);

      return res.status(500).json({
        success: false,
        message: "Failed to reach Paystack",
      });
    }

    const data = await paystackRes.json();

    console.log("PAYSTACK INIT RESPONSE:", data);

    if (!data.status) {
      return res.status(400).json({
        success: false,
        message: data.message || "Paystack init failed",
      });
    }

    const reference = data.data.reference;

    // ✅ INSERT ORDER SAFELY
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
      console.log("❌ SUPABASE INSERT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    // ✅ SUCCESS RESPONSE
    return res.json({
      success: true,
      authorization_url: data.data.authorization_url,
      reference,
    });

  } catch (error) {
    console.error("🔥 INIT CRASH:", error);

    return res.status(500).json({
      success: false,
      message: "Initialize failed",
      error: error.message,
    });
  }
});