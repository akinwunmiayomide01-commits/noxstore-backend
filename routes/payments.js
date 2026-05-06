const express = require("express");
const axios = require("axios");
const router = express.Router();

/**
 * INIT PAYMENT
 */
router.post("/initialize", async (req, res) => {
  try {
    const { amount, game, playerId } = req.body;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: "customer@noxstore.app",
        amount: amount * 100,
        metadata: {
          game,
          playerId
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data.data);
  } catch (err) {
    res.status(500).json({ message: "Payment init failed" });
  }
});

/**
 * VERIFY PAYMENT
 */
router.get("/verify/:ref", async (req, res) => {
  try {
    const { ref } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${ref}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`
        }
      }
    );

    const data = response.data.data;

    if (data.status === "success") {
      return res.json({ status: "success", data });
    }

    res.json({ status: "failed" });

  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
});

module.exports = router;