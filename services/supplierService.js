class SupplierService {
  async fulfillOrder(order) {
    console.log("Sending order to supplier:", order);

    // RIGHT NOW (manual mode)
    // Later: SEAGM API / Reloadly / etc

    return {
      success: true,
      provider: "manual",
    };
  }
}

module.exports = new SupplierService();