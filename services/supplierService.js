const supabase = require("../config/supabase");

/**
 * =========================
 * SUPPLIER ENGINE (NOXSTORE CORE)
 * =========================
 * Supports:
 * - Manual fulfillment
 * - SEAGM (future API)
 * - Codashop-style reseller flow (manual/partner-based)
 */

class SupplierService {
  /**
   * MAIN ENTRY
   */
  async fulfillOrder(order) {
    try {
      console.log("🚀 Fulfillment started:", order.reference);

      const provider = this.selectProvider(order);

      let result;

      switch (provider) {
        case "seagm":
          result = await this.seagmProvider(order);
          break;

        case "codashop":
          result = await this.codashopStyleProvider(order);
          break;

        default:
          result = await this.manualProvider(order);
      }

      await supabase
        .from("orders")
        .update({
          fulfillment_provider: provider,
          fulfillment_status: result.success ? "completed" : "failed",
        })
        .eq("reference", order.reference);

      return result;

    } catch (err) {
      console.error("SUPPLIER ERROR:", err);

      await supabase
        .from("orders")
        .update({
          fulfillment_status: "failed",
        })
        .eq("reference", order.reference);

      return { success: false };
    }
  }

  /**
   * SMART ROUTING LOGIC
   */
  selectProvider(order) {
    const product = (order.product || "").toLowerCase();

    // Example routing logic
    if (product.includes("uc")) return "seagm"; // PUBG
    if (product.includes("cp")) return "seagm"; // CODM
    if (product.includes("diamond")) return "codashop";

    return "manual";
  }

  /**
   * =========================
   * MANUAL FULFILLMENT (DEFAULT)
   * =========================
   */
  async manualProvider(order) {
    console.log("🟡 MANUAL ORDER:", order.reference);

    return {
      success: true,
      provider: "manual",
    };
  }

  /**
   * =========================
   * CODASHOP-STYLE PROVIDER
   * =========================
   * NOTE:
   * Codashop itself is NOT an open API provider.
   * This represents reseller / external top-up channel logic.
   */
  async codashopStyleProvider(order) {
    console.log("🟠 CODASHOP-STYLE FULFILLMENT:", order.reference);

    // This is where you:
    // - send to reseller dashboard
    // - or internal top-up operator
    // - or future partner API

    return {
      success: true,
      provider: "codashop-style",
    };
  }

  /**
   * =========================
   * SEAGM (FUTURE AUTOMATION)
   * =========================
   */
  async seagmProvider(order) {
    console.log("🟢 SEAGM FULFILLMENT:", order.reference);

    // Placeholder for real API integration later

    return {
      success: true,
      provider: "seagm",
    };
  }
}

module.exports = new SupplierService();