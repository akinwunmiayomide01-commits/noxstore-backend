const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");
const { processTopUp } = require("../services/topupService");

/**
 * GET ALL ORDERS
 */
router.get("/orders", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json(error);

  res.json(data);
});

/**
 * RETRY FAILED ORDER
 */
router.post("/retry/:id", async (req, res) => {
  const { id } = req.params;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) return res.status(404).json({ error: "Order not found" });

  await processTopUp(order);

  res.json({ success: true, message: "Retry triggered" });
});

module.exports = router;