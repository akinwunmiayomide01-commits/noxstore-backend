const supabase = require("../config/supabase");
const { sendTopUp } = require("./providers/topupProvider");

async function processTopUp(order) {
  try {
    if (!order?.order_id) {
      console.log("❌ Invalid order payload");
      return;
    }

    console.log("🚀 TOP-UP START:", order.order_id);

    // 🔒 prevent duplicate processing
    const { data: existing } = await supabase
      .from("orders")
      .select("status")
      .eq("order_id", order.order_id)
      .single();

    if (!existing) {
      console.log("❌ Order not found");
      return;
    }

    if (existing.status === "completed") {
      console.log("⚠️ Already completed");
      return;
    }

    // mark processing
    await supabase
      .from("orders")
      .update({ status: "processing" })
      .eq("order_id", order.order_id);

    // call provider
    const result = await sendTopUp({
      playerId: order.player_id,
      gameId: order.game_id,
      amount: order.amount,
    });

    if (result?.success) {
      await supabase
        .from("orders")
        .update({
          status: "completed",
          provider_ref: result.reference || null,
        })
        .eq("order_id", order.order_id);

      console.log("✅ TOP-UP SUCCESS:", order.order_id);
    } else {
      await supabase
        .from("orders")
        .update({
          status: "failed",
        })
        .eq("order_id", order.order_id);

      console.log("❌ TOP-UP FAILED:", order.order_id);
    }
  } catch (err) {
    console.log("❌ TOP-UP SYSTEM ERROR:", err.message);

    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("order_id", order.order_id);
  }
}

module.exports = { processTopUp };