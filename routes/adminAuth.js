const express = require("express");
const router = express.Router();

/**
 * =========================
 * ADMIN LOGIN (MVP AUTH)
 * =========================
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;

  if (!ADMIN_USER || !ADMIN_PASS) {
    return res.status(500).json({
      success: false,
      message: "Admin credentials not set on server",
    });
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Simple token (MVP)
  const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");

  return res.json({
    success: true,
    token,
  });
});

module.exports = router;