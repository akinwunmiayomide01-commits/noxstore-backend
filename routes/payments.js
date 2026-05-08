const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const router = express.Router();

/**
 * IMPORTANT:
 * Prisma client should be imported once in server OR here
 * Adjust path if yours differs
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* ─────────────────────────────────────────────
   1. INITIALIZE PAYMENT (FRONTEND CALLS THIS)
──────────────────────────────────────────── */
router.post("/initialize", async (req, res) => {
  try {
    const { amount, game, email } = req.body;

    if (!amount || !game) {
      return res.status(400).json({ message: "Amount and game are required" });
    }

    const reference = `NX_${Date.now()}`;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: email || "user@noxstore.com",
        amount: Math.round(amount * 100),
        reference,
        metadata: {
          game,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({
      authorization_url: response.data.data.authorization_url,
      reference,
    });
  } catch (err) {
    console.log("INIT ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      message: "Payment initialization failed",
    });
  }
});

/* ─────────────────────────────────────────────
   2. PAYSTACK WEBHOOK (REAL PAYMENT CONFIRMATION)
──────────────────────────────────────────── */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const secret = process.env.PAYSTACK_SECRET_KEY;

      const hash = crypto
        .createHmac("sha512", secret)
        .update(req.body)
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        return res.status(401).send("Invalid signature");
      }

      const event = JSON.parse(req.body);

      /* ── PAYMENT SUCCESS ── */
      if (event.event === "charge.success") {
        const data = event.data;

        await prisma.transaction.create({
          data: {
            reference: data.reference,
            amount: data.amount / 100,
            email: data.customer.email,
            game: data.metadata?.game || "Unknown",
            status: "success",
          },
        });

        console.log("Transaction saved:", data.reference);
      }

      res.sendStatus(200);
    } catch (err) {
      console.log("WEBHOOK ERROR:", err.message);
      res.sendStatus(500);
    }
  }
);

module.exports = router;