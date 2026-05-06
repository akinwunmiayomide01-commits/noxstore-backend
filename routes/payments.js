const express = require("express");
const axios = require("axios");

const router = express.Router();

/**
 * =========================
 * INIT PAYMENT
 * =========================
 */
router.post("/initialize", async (req, res) => {
  try {
    const { amount, game, playerId } = req.body;

    // Basic validation
    if (!amount || !game) {
      return res.status(400).json({
        message: "Amount and game are required"
      });
    }

    // Check Paystack key
    if (!process.env.PAYSTACK_SECRET) {
      console.error("PAYSTACK_SECRET is missing in environment variables");
      return res.status(500).json({
        message: "Server configuration error (missing Paystack key)"
      });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: "customer@noxstore.app",
        amount: Number(amount) * 100,
        metadata: {
          game,
          playerId: playerId || "N/A"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json(response.data.data);

  } catch (error) {
    console.error("PAYMENT INIT ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      message: "Payment initialization failed",
      error: error.response?.data || error.message
    });
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

    if (!process.env.PAYSTACK_SECRET) {
      return res.status(500).json({
        message: "Server configuration error"
      });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`
        }
      }
    );

    const data = response.data.data;

    if (data.status === "success") {
      return res.json({
        status: "success",
        data
      });
    }

    return res.json({
      status: "failed",
      data
    });

  } catch (error) {
    console.error("PAYMENT VERIFY ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      message: "Verification failed",
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;