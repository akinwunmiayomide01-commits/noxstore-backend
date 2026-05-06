const express = require("express");
const crypto = require("crypto");

const router = express.Router();

/**
 * =========================
 * PAYSTACK WEBHOOK
 * =========================
 */
router.post("/paystack", (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET;

    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];

    // VERIFY REQUEST COMES FROM PAYSTACK
    if (hash !== signature) {
      return res.status(401).send("Unauthorized webhook");
    }

    const event = req.body;

    console.log("PAYSTACK WEBHOOK EVENT:", event.event);

    /**
     * =========================
     * PAYMENT SUCCESS
     * =========================
     */
    if (event.event === "charge.success") {
      const data = event.data;

      const paymentInfo = {
        reference: data.reference,
        amount: data.amount / 100,
        email: data.customer.email,
        game: data.metadata?.game || "unknown",
        playerId: data.metadata?.playerId || "unknown",
        status: "success",
        paidAt: data.paid_at
      };

      console.log("SUCCESS PAYMENT:", paymentInfo);

      /**
       * TODO (IMPORTANT NEXT STEP):
       * Save to DB here (Mongo/Postgres)
       */
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("WEBHOOK ERROR:", error.message);
    res.sendStatus(500);
  }
});

module.exports = router;