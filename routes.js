const express = require("express");
const axios = require("axios");

const router = express.Router();

/**
 * HEALTH CHECK
 */
router.get("/", (req, res) => {
  res.json({ message: "NOXSTORE API RUNNING 🚀" });
});

/**
 * CREATE ORDER
 */
router.post("/orders/create", (req, res) => {
  const { gameId, playerId, amount } = req.body;

  if (!gameId || !playerId || !amount) {
    return res.status(400).json({
      success: false,
      message: "Missing fields",
    });
  }

  const orderId = "NX-" + Date.now();

  res.json({
    success: true,
    orderId,
    gameId,
    playerId,
    amount: Number(amount),
  });
});

/**
 * PAYSTACK INITIALIZE
 */
router.post("/paystack/initialize", async (req, res) => {
  try {
    const { email, amount, orderId } = req.body;

    if (!email || !amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Missing payment fields",
      });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: email.trim(),
        amount: Math.round(Number(amount) * 100),
        metadata: { orderId },
        callback_url: "http://localhost:5173/success",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    res.json({
      success: true,
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference,
    });

  } catch (err) {
    console.log("INIT ERROR:", err.response?.data || err.message);

    res.status(500).json({
      success: false,
      message: err.response?.data?.message || "Initialization failed",
    });
  }
});

/**
 * 🔒 VERIFY PAYMENT
 */
router.post("/paystack/verify", async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Reference is required",
      });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data.data;

    console.log("VERIFY RESPONSE:", data);

    if (data.status === "success") {
      return res.json({
        success: true,
        message: "Payment verified successfully",
        amount: data.amount / 100,
        reference: data.reference,
        orderId: data.metadata?.orderId || null,
      });
    } else {
      return res.json({
        success: false,
        message: "Payment not successful",
      });
    }

  } catch (err) {
    console.log("VERIFY ERROR:", err.response?.data || err.message);

    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
});

module.exports = router;