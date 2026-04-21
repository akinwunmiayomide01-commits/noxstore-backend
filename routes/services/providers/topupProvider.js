const axios = require("axios");

/**
 * This is a GENERIC TOP-UP PROVIDER
 * Later you plug Coda / any API here
 */

async function sendTopUp({ playerId, gameId, amount }) {
  try {
    console.log("🎮 Sending top-up to provider...");

    /**
     * 🔴 PLACEHOLDER API CALL
     * Replace this with real provider endpoint (Coda / aggregator)
     */

    const response = await axios.post(
      process.env.TOPUP_API_URL || "https://example-provider.com/topup",
      {
        playerId,
        gameId,
        amount,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TOPUP_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      providerRef: response.data.reference || "mock_ref",
    };
  } catch (err) {
    console.log("❌ TOPUP PROVIDER ERROR:", err.message);

    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = { sendTopUp };