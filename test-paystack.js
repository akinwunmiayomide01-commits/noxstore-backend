const axios = require("axios");
require("dotenv").config();

async function test() {
  try {
    const res = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: "test@gmail.com",
        amount: 1000 * 100,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);
  }
}

test();