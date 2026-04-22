const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");
const { processTopUp } = require("../services/topupService");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = "https://noxstore-frontend.vercel.app";

/**
 * =========================
 * INITIATE PAYMENT
 * =========================
 */
router.post("/initialize", async (req, res) => {
  try {
    const { email, amount, player_id, game_id } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: "Missing email or amount" });
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amount * 100,
          callback_url: `${FRONTEND_URL}/payment-success`,
        }),
      }
    );

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: data.message });
    }

    const reference = data.data.reference;

    // Save order
    await supabase.from("orders").insert([
      {
        email,
        amount,
        reference,
        player_id,
        game_id,
        status: "pending",
      },
    ]);

    return res.json({
      authorization_url: data.data.authorization_url,
      reference,
    });

  } catch (error) {
    console.error("INIT ERROR:", error);
    return res.status(500).json({ error: "Payment initialization failed" });
  }
});

/**
 * =========================
 * VERIFY PAYMENT (FIXED)
 * =========================
 */
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    const data = await response.json();

    console.log("VERIFY RESPONSE:", data);

    // ❌ PAYMENT FAILED
    if (!data.status || data.data.status !== "success") {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("reference", reference);

      return res.json({ success: false });
    }

    // ✅ GET ORDER SAFELY
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();

    if (fetchError || !order) {
      console.error("ORDER NOT FOUND:", fetchError);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // ✅ MARK AS PAID
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("reference", reference);

    if (updateError) {
      console.error("UPDATE ERROR:", updateError);
      return res.status(500).json({ success: false });
    }

    // 🚀 AUTO TOP-UP
    await processTopUp(order);

    return res.json({
      success: true,
      message: "Payment verified and processed",
      data: data.data,
    });

  } catch (error) {
    console.error("VERIFY ERROR:", error);
    return res.status(500).json({ success: false });
  }
});

module.exports = router;