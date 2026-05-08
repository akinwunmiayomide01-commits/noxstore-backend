const express = require("express");
const axios = require("axios");
const router = express.Router();

router.post("/initialize", async (req, res) => {
  try {
    const { amount, game, email } = req.body;

    if (!amount || !game) {
      return res.status(400).json({ message: "Amount and game required" });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: "Paystack key missing" });
    }

    const reference = `NX-${Date.now()}`;

    const payload = {
      email: email || "test@noxstore.com",
      amount: Math.round(amount * 100),
      reference,
      metadata: { game }
    };

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000
      }
    );

    return res.json({
      authorization_url: response.data.data.authorization_url,
      reference,
    });

  } catch (err) {
    console.log("PAYSTACK ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      message: "Payment initialization failed",
      error: err.response?.data || err.message
    });
  }
});

module.exports = router;