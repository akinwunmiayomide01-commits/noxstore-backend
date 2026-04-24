const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * =========================
 * INITIALIZE PAYMENT
 * =========================
 */
router.post("/initialize", async (req, res) => {
  try {
    const { email, amount } = req.body;

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
        message: "Paystack init failed",
      });
    }

    const reference = data.data.reference;

    // Save order
    await supabase.from("orders").insert([
      {
        email,
        amount,
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
      message: "Init failed",
    });
  }
});

/**
 * =========================
 * VERIFY PAYMENT (CRITICAL)
 * =========================
 */
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Reference required",
      });
    }

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
      // ✅ Update DB
      await supabase
        .from("orders")
        .update({ status: "success" })
        .eq("reference", reference);

      return res.json({
        success: true,
        message: "Payment verified",
        data: payment,
      });
    } else {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("reference", reference);

      return res.json({
        success: false,
        message: "Payment not successful",
      });
    }

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Verification error",
    });
  }
});

module.exports = router;