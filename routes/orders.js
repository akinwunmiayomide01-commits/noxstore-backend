const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

/**
 * =========================
 * GET ALL ORDERS (ADMIN)
 * =========================
 */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return res.json(data);

  } catch (err) {
    console.error("FETCH ORDERS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
});

/**
 * =========================
 * GET SINGLE ORDER
 * =========================
 */
router.get("/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", reference)
      .single();

    if (error) {
      throw error;
    }

    return res.json(data);

  } catch (err) {
    console.error("GET ORDER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Order not found",
    });
  }
});

/**
 * =========================
 * MARK ORDER AS FULFILLED
 * =========================
 */
router.post("/fulfill/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", reference)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Prevent double fulfillment
    if (order.fulfillment_status === "completed") {
      return res.json({
        success: true,
        message: "Order already fulfilled",
      });
    }

    // Update order
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        fulfillment_status: "completed",
      })
      .eq("reference", reference);

    if (updateError) {
      throw updateError;
    }

    return res.json({
      success: true,
      message: "Order marked as fulfilled",
    });

  } catch (err) {
    console.error("FULFILL ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fulfill order",
    });
  }
});

module.exports = router;