const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = "https://noxstore-frontend.vercel.app";

/**
 * ✅ INITIATE PAYMENT
 */
router.post("/initialize", async (req, res) => {
  try {
    const { email, amount } = req.body;

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

    // 🔥 SAVE TRANSACTION (PENDING)
    await supabase.from("transactions").insert([
      {
        email,
        amount,
        reference,
        status: "pending",
      },
    ]);

    return res.json({
      authorization_url: data.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("INIT ERROR:", error);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

/**
 * ✅ VERIFY PAYMENT
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

    if (!data.status || data.data.status !== "success") {
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("reference", reference);

      return res.json({ success: false });
    }

    // 🔥 UPDATE STATUS TO PAID
    await supabase
      .from("transactions")
      .update({ status: "paid" })
      .eq("reference", reference);
await supabase
  .from("transactions")
  .update({ status: "processing" })
  .eq("reference", reference);

// 🔥 trigger top-up logic (temporary placeholder)
console.log("TRIGGER TOPUP FOR:", reference);
    return res.json({
      success: true,
      data: data.data,
    });
  } catch (error) {
    console.error("VERIFY ERROR:", error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;