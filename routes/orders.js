const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

/**
 * =========================
 * GET ALL ORDERS
 * =========================
 */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("FETCH ERROR:", error);
      return res.status(500).json({ success: false, error });
    }

    return res.json(data);
  } catch (err) {
    console.error("GET ORDERS CRASH:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
});

/**
 * =========================
 * FULFILL ORDER (FIXED)
 * =========================
 */
router.post("/fulfill/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Reference is required",
      });
    }

    // check if order exists
    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("*")
      .eq("reference", reference)
      .single();

    if (findError || !order) {
      console.error("ORDER NOT FOUND:", findError);

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // update fulfillment status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        fulfillment_status: "completed",
      })
      .eq("reference", reference);

    if (updateError) {
      console.error("UPDATE ERROR:", updateError);

      return res.status(500).json({
        success: false,
        message: "Failed to update order",
        error: updateError,
      });
    }

    return res.json({
      success: true,
      message: "Order fulfilled successfully",
    });

  } catch (err) {
    console.error("FULFILL CRASH:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;