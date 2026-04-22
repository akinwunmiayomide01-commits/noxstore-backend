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

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email and amount are required",
      });
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

    console.log("INIT RESPONSE:", data);

    if (!data.status) {
      return res.status(400).json({
        success: false,
        message: data.message,
      });
    }

    const reference = data.data.reference;

    // Save order
    const { error } = await supabase.from("orders").insert([
      {
        email,
        amount,
        reference,
        player_id,
        game_id,
        status: "pending",
      },
    ]);

    if (error) {
      console.log("DB INSERT ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save order",
      });
    }

    return res.json({
      success: true,
      authorization_url: data.data.authorization_url,
      reference,
    });

  } catch (error) {
    console.error("INIT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Payment initialization failed",
    });
  }
});

/**
 * =========================
 * VERIFY PAYMENT (STABLE)
 * =========================
 */
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    console.log("VERIFY START:", reference);

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

    console.log("PAYSTACK VERIFY RESPONSE:", data);

    if (!data.status || data.data.status !== "success") {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("reference", reference);

      return res.json({
        success: false,
        message: "Payment not successful",
      });
    }

    // Find order safely
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();

    if (error || !order) {
      console.log("ORDER NOT FOUND");
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update status
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("reference", reference);

    if (updateError) {
      console.log("UPDATE ERROR:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to update order",
      });
    }

    // Trigger top-up safely
    if (processTopUp) {
      try {
        await processTopUp(order);
      } catch (err) {
        console.log("TOPUP ERROR:", err.message);
      }
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
      reference,
    });

  } catch (error) {
    console.error("VERIFY CRASH:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during verification",
    });
  }
});

module.exports = router;