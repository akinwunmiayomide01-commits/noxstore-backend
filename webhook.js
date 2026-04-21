const crypto = require("crypto");
const supabase = require("./supabase");

module.exports = async (req, res) => {
  try {
    // 1. Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(req.rawBody)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    // 2. Only handle successful payments
    if (event.event === "charge.success") {
      const data = event.data;

      const email = data.customer.email;
      const amount = data.amount / 100;
      const reference = data.reference;

      // ✅ 3. DUPLICATE PROTECTION
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("*")
        .eq("reference", reference)
        .single();

      if (existingTx && existingTx.status === "success") {
        console.log("Duplicate webhook ignored:", reference);
        return res.sendStatus(200);
      }

      // 4. Find user
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !user) {
        console.log("User not found:", email);
        return res.status(404).send("User not found");
      }

      // 5. Update wallet
      await supabase
        .from("users")
        .update({
          wallet_balance: user.wallet_balance + amount,
        })
        .eq("id", user.id);

      // 6. Insert OR update transaction
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .upsert(
          {
            user_id: user.id,
            amount: amount,
            reference: reference,
            status: "success",
          },
          { onConflict: ["reference"] }
        )
        .select();

      if (txError) {
        console.log("❌ TRANSACTION ERROR:", txError);
      } else {
        console.log("✅ TRANSACTION SAVED:", txData);
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.log("❌ WEBHOOK ERROR:", err);
    return res.sendStatus(500);
  }
};