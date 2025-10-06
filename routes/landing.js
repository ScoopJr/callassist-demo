const express = require("express");
const router = express.Router();
const path = require("path");

// Landing page
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/landing.html"));
});

// Signup page
router.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/signup.html"));
});

module.exports = router;
