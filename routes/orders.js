const express = require("express");
const router = express.Router();

let orders = [];

/**
 * SAVE ORDER (called after success)
 */
router.post("/", (req, res) => {
  orders.push(req.body);
  res.json({ message: "Order saved" });
});

/**
 * GET ORDERS
 */
router.get("/", (req, res) => {
  res.json(orders);
});

module.exports = router;