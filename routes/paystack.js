const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const supabase = require("../config/supabase");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * =========================
 * INITIALIZE PAYMENT
 * =========================
 */
router.post("/initialize", async (req, res) => {
  try {
    const { email, amount, game, uid, product } = req.body;

    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email and amount required",
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
        }),
      }
    );

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({
        success: false,
        message: "Paystack initialization failed",
      });
    }

    const reference = data.data.reference;

    // Create order in Supabase
    await supabase.from("orders").insert([
      {
        email,
        amount,
        game,
        uid,
        product,
        reference,
        status: "pending",
      },
    ]);

    return res.json({
      success: true,
      authorization_url: data.data.authorization_url,
      reference,
    });

  } catch (err) {
    console.error("INIT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Initialization failed",
    });
  }
});

/**
 * =========================
 * VERIFY PAYMENT (FALLBACK ONLY)
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

    if (!data.status) {
      return res.status(400).json({
        success: false,
        message: "Verification failed",
      });
    }

    const payment = data.data;

    if (payment.status === "success") {
      await supabase
        .from("orders")
        .update({ status: "success" })
        .eq("reference", reference);

      return res.json({
        success: true,
        message: "Payment verified",
        data: payment,
      });
    }

    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("reference", reference);

    return res.json({
      success: false,
      message: "Payment not successful",
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Verification error",
    });
  }
});

/**
 * =========================
 * SUPPLIER LAYER (MANUAL NOW)
 * =========================
 */
async function fulfillOrder(order) {
  try {
    console.log("🚀 Fulfilling order:", order.reference);

    // 🔴 CURRENT MODE: MANUAL
    // Later: SEAGM / Reloadly / API integration

    return {
      success: true,
      provider: "manual",
    };

  } catch (err) {
    console.error("SUPPLIER ERROR:", err);
    return { success: false };
  }
}

/**
 * =========================
 * PAYSTACK WEBHOOK (PRODUCTION CORE)
 * =========================
 */
router.post("/webhook", async (req, res) => {
  try {
    // 1. Verify signature
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];

    if (hash !== signature) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    // 2. Handle successful payment
    if (event.event === "charge.success") {
      const reference = event.data.reference;

      // 3. Fetch order
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("reference", reference)
        .single();

      if (!order) {
        return res.sendStatus(200);
      }

      // 4. Prevent duplicate processing (idempotency)
      if (order.status === "success") {
        return res.sendStatus(200);
      }

      // 5. Update order status
      await supabase
        .from("orders")
        .update({ status: "success" })
        .eq("reference", reference);

      console.log("✅ Order marked SUCCESS:", reference);

      // 6. Trigger supplier fulfillment layer
      await fulfillOrder(order);
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    res.sendStatus(500);
  }
});

module.exports = router;