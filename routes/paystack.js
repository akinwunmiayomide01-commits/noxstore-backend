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

    console.log("📩 INIT REQUEST:", req.body);

    // Save order in DB (pending)
    const { data, error } = await supabase.from("orders").insert([
      {
        order_id: orderId,
        player_id: playerId,
        game_id: gameId,
        amount,
        status: "pending",
      },
    ]);

    if (error) {
      console.log("❌ DB INSERT ERROR:", error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ ORDER SAVED");

    // Initialize Paystack payment
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100,
        reference: orderId,
        callback_url: "http://localhost:5173/payment-success",
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
    console.log("❌ INIT ERROR:", err.message);
    return res.status(500).json({ error: "Payment init failed" });
  }
});

/**
 * =========================
 * AUTO TOP-UP FUNCTION
 * =========================
 */
async function processTopUp(order) {
  try {
    console.log("🚀 TOP-UP START:", order.order_id);

    // Step 1: mark processing
    await supabase
      .from("orders")
      .update({ status: "processing" })
      .eq("order_id", order.order_id);

    // Step 2: SIMULATED DELIVERY (replace later with real API)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 3: complete order
    await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("order_id", order.order_id);

    console.log("🎮 TOP-UP COMPLETED");
  } catch (err) {
    console.log("❌ TOP-UP ERROR:", err.message);

    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("order_id", order.order_id);
  }
}

/**
 * =========================
 * VERIFY PAYMENT + TRIGGER TOP-UP
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

    const payment = response.data.data;

    console.log("🔍 PAYMENT STATUS:", payment.status);

    // Update order status
    const { data: order, error } = await supabase
      .from("orders")
      .update({
        status: payment.status === "success" ? "success" : "failed",
      })
      .eq("order_id", reference)
      .select()
      .single();

    if (error) {
      console.log("❌ DB ERROR:", error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ ORDER UPDATED");

    // AUTO TOP-UP TRIGGER (non-blocking)
    if (payment.status === "success") {
      processTopUp(order);
    }

    return res.json({
      status: payment.status,
      reference,
    });
  } catch (err) {
    console.log("❌ VERIFY ERROR:", err.message);
    return res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * =========================
 * GET ALL ORDERS (ADMIN)
 * =========================
 */
router.get("/orders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.log("❌ ORDERS ERROR:", err.message);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

module.exports = router;