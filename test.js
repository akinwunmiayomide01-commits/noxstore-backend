const { createPayment } = require("./paystack");
const supabase = require("./supabase");

async function run() {
  const email = "test@gmail.com";
  const amount = 5000;

  // 1. create payment
  const res = await createPayment(email, amount);

  const reference = res.data.reference;

  console.log("Payment link:", res.data.authorization_url);

  // 2. find user
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  // 3. if user doesn't exist → create one
  let userId;

  if (!user) {
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        email: email,
        wallet_balance: 0,
      })
      .select()
      .single();

    userId = newUser.id;
  } else {
    userId = user.id;
  }

  // 4. save transaction
  await supabase.from("transactions").insert({
    user_id: userId,
    amount: amount,
    reference: reference,
    status: "pending",
  });

  console.log("Transaction saved to database");
}

run();