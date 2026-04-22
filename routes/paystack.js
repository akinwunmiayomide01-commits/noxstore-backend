const express = require("express");

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

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // convert to kobo
        callback_url: `${FRONTEND_URL}/payment-success`,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: data.message });
    }

    return res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
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
      return res.json({ success: false });
    }

    // 🔥 OPTIONAL: UPDATE DATABASE HERE
    // Example:
    // await supabase.from("transactions").update({ status: "paid" }).eq("reference", reference);

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