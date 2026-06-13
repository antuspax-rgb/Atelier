const express = require("express");
const router = express.Router();

router.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    app: "Atelier Mentor Core"
  });
});

module.exports = router;