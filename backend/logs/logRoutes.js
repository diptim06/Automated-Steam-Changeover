const express = require("express");
const { getAllLogs, clearAllLogs } = require("./logDb");
const auth = require("../auth/authRoutes");

const router = express.Router();

router.get("/", auth.requireAuth, async (req, res) => {
  try {
    res.json(await getAllLogs());
  } catch {
    res.status(500).json({ error: "Failed to fetch logs." });
  }
});

router.delete("/", auth.requireAuth, async (req, res) => {
  try {
    await clearAllLogs();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to clear logs." });
  }
});

module.exports = router;
