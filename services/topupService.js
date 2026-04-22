const supabase = require("../config/supabase");

/**
 * 🚀 PROCESS TOP-UP (SIMULATION / SAFE VERSION)
 */
async function processTopUp(order) {
  try {
    console.log("🚀 TOP-UP START:", order.reference);

    // mark processing
    await supabase
      .from("orders")
      .update({ status: "processing" })
      .eq("reference", order.reference);

    // 🔥 SIMULATE SUCCESS (for now)
    // Later you will connect real provider API (Codashop etc.)

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("reference", order.reference);

    console.log("✅ TOP-UP COMPLETED");
  } catch (err) {
    console.log("❌ TOP-UP ERROR:", err.message);

    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("reference", order.reference);
  }
}

module.exports = { processTopUp };