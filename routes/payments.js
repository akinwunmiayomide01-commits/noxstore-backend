const express = require("express");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

/* =========================
   INIT PAYMENT
========================= */
router.post("/initialize", auth, async (req, res) => {
  try {
    const { amount, game, gameId, serverId } = req.body;

    const email = req.user.email;

    const reference = `NXT_${Date.now()}`;

    // Save pending transaction FIRST
    await prisma.transaction.create({
      data: {
        reference,
        email,
        amount,
        game,
        gameId,
        serverId,
        status: "pending",
        userId: req.user.id,
      },
    });

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100,
        reference,
        callback_url: "http://127.0.0.1:5500/?payment=success",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Payment init failed" });
  }
});

/* =========================
   VERIFY PAYMENT
========================= */
router.post("/verify", auth, async (req, res) => {
  try {
    const { reference } = req.body;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data.data;

    if (data.status !== "success") {
      return res.status(400).json({ message: "Payment not successful" });
    }

    const updated = await prisma.transaction.update({
      where: { reference },
      data: { status: "success" },
    });

    res.json({
      success: true,
      transaction: updated,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Verify failed" });
  }
});

module.exports = router;