const supabase = require("../config/supabase");
const { sendTopUp } = require("./providers/topupProvider");

async function processTopUp(order) {
  try {
    console.log("🚀 REAL TOP-UP START:", order.order_id);

    // mark processing
    await supabase
      .from("orders")
      .update({ status: "processing" })
      .eq("order_id", order.order_id);

    // call real provider API
    const result = await sendTopUp({
      playerId: order.player_id,
      gameId: order.game_id,
      amount: order.amount,
    });

    if (result.success) {
      await supabase
        .from("orders")
        .update({
          status: "completed",
        })
        .eq("order_id", order.order_id);

      console.log("✅ TOP-UP SUCCESS");
    } else {
      await supabase
        .from("orders")
        .update({
          status: "failed",
        })
        .eq("order_id", order.order_id);

      console.log("❌ TOP-UP FAILED");
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