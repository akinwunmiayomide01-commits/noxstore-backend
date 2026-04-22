const { Worker } = require("bullmq");
const IORedis = require("ioredis");

const supabase = require("../config/supabase");
const { processTopUp } = require("../topupService");

const connection = new IORedis(process.env.REDIS_URL);

/**
 * =========================
 * 🔄 BOOT RECOVERY SYSTEM
 * =========================
 * Runs when server starts to recover missed orders
 */
async function recoverOrders() {
  try {
    console.log("🔄 Checking for pending or stuck orders...");

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["paid", "processing"]);

    if (error) {
      console.log("❌ Recovery error:", error.message);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log("✅ No pending orders to recover");
      return;
    }

    console.log(`📦 Recovering ${orders.length} orders...`);

    for (const order of orders) {
      await processTopUp(order);
    }

    console.log("✅ Recovery complete");
  } catch (err) {
    console.log("❌ Recovery failed:", err.message);
  }
}

/**
 * =========================
 * 🚀 WORKER PROCESSOR
 * =========================
 */
const worker = new Worker(
  "topup-queue",
  async (job) => {
    try {
      console.log("📦 Processing job:", job.data.order_id || job.id);

      await processTopUp(job.data);

      console.log("✅ Job completed");
    } catch (err) {
      console.log("❌ Job failed:", err.message);

      // throw error so BullMQ can retry automatically
      throw err;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

/**
 * =========================
 * 🔥 WORKER EVENTS
 * =========================
 */
worker.on("completed", (job) => {
  console.log(`🎯 Completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.log(`❌ Failed job ${job?.id}:`, err.message);
});

/**
 * =========================
 * STARTUP INIT
 * =========================
 */
(async () => {
  console.log("🚀 Top-up worker starting...");

  // run recovery first
  await recoverOrders();

  console.log("🟢 Worker ready and listening for jobs");
})();

module.exports = worker;