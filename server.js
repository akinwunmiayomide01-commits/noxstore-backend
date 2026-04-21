const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// IMPORT ROUTES
const paystackRoutes = require("./routes/paystack");
app.use("/api/paystack", paystackRoutes);

/**
 * TEST DB ROUTE (ADD HERE)
 */
app.get("/test-db", async (req, res) => {
  const supabase = require("./config/supabase");

  const { data, error } = await supabase.from("orders").select("*");

  if (error) return res.json({ error: error.message });

  res.json(data);
});

app.get("/", (req, res) => {
  res.send("NOXSTORE API RUNNING");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});