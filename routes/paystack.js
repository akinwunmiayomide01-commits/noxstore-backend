const express = require("express");
const axios = require("axios");
const supabase = require("../config/supabase");

const router = express.Router();

/**
 * =========================
 * INIT PAYMENT + SAVE ORDER
 * =========================
 */
router.post("/initialize", async (req, res) => {
  try {
    const { email, amount, orderId, playerId, gameId } = req.body;

    if (!email || !amount || !orderId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Save order to DB
    const { error: dbError } = await supabase.from("orders").insert([
      {
        order_id: orderId,
        player_id: playerId,
        game_id: gameId,
        amount,
        status: "pending",
      },
    ]);

    if (dbError) {
      console.log("DB ERROR:", dbError.message);
      return res.status(500).json({ error: "Database insert failed" });
    }

    // 2. Initialize Paystack
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100,
        reference: orderId,
        callback_url:
          "https://your-vercel-app.vercel.app/payment-success", // ⚠️ CHANGE THIS
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json(response.data.data);
  } catch (err) {
    console.log("INIT ERROR:", err.response?.data || err.message);
    return res.status(500).json({ error: "Payment init failed" });
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

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data.data;

    if (data.status === "success") {
      // 1. Update DB to paid
      await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("order_id", reference);

      // 2. (NEXT STEP) Trigger top-up API here
      console.log("Payment successful for:", reference);

      return res.json({
        success: true,
        message: "Payment verified",
        data,
      });
    } else {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("order_id", reference);

      return res.json({
        success: false,
        message: "Payment failed",
      });
    }
  } catch (err) {
    console.log("VERIFY ERROR:", err.response?.data || err.message);
    return res.status(500).json({ error: "Verification failed" });
  }
});

module.exports = router;