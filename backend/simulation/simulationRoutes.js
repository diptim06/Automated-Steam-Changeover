const express = require("express");
const engine = require("./engine");
const { insertLog } = require("../logs/logDb");
const auth = require("../auth/authRoutes");

const router = express.Router();

router.get("/flow", auth.requireAuth, (req, res) => {
  res.json(engine.getCurrentState());
});

router.post("/switch", auth.requireAuth, async (req, res) => {
  try {
    const change = await engine.switchStream("manual");
    if (!change) { res.status(400).json({ error: "No healthy stream available." }); return; }
    res.json(change);
  } catch {
    res.status(500).json({ error: "Manual switch failed." });
  }
});

router.post("/activate", auth.requireAuth, async (req, res) => {
  try {
    const target = req.body?.stream;
    if (!engine.streams.includes(target)) { res.status(400).json({ error: "Invalid stream." }); return; }
    if (engine.streamData[target].fault) { res.status(400).json({ error: "Cannot activate a faulted stream." }); return; }

    const change = await engine.switchStream("manual_activate", target);
    if (!change) { res.json({ message: "Stream already active." }); return; }
    res.json(change);
  } catch {
    res.status(500).json({ error: "Activation failed." });
  }
});

router.post("/fault", auth.requireAuth, async (req, res) => {
  try {
    const target = req.body?.stream;
    const fault = req.body?.fault !== false;
    if (!engine.streams.includes(target)) { res.status(400).json({ error: "Invalid stream." }); return; }

    engine.streamData[target].fault = fault;
    engine.streamData[target].faultReason = fault ? "manual_fault" : null;

    if (fault && target === engine.getActiveStream()) {
      await insertLog(target, target, "fault_inserted");
      const change = await engine.switchStream("auto_fault");
      if (!change) { res.status(400).json({ error: "No healthy stream available after fault." }); return; }
      res.json({ success: true, change });
      return;
    }

    await insertLog(target, target, fault ? "fault_inserted" : "fault_cleared");
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Fault update failed." });
  }
});

router.post("/pressure/increase", auth.requireAuth, (req, res) => {
  const activeStream = engine.getActiveStream();
  engine.pressureBoost[activeStream] = Math.min(30, engine.pressureBoost[activeStream] + 10);
  engine.updateStreamValues();
  res.json({ success: true });
});

router.post("/stream", auth.requireAuth, (req, res) => {
  const target = req.body?.stream;
  if (!engine.streams.includes(target)) { res.status(400).json({ error: "Invalid stream." }); return; }

  if (req.body?.flowThreshold !== undefined) {
    const t = Number(req.body.flowThreshold);
    if (!Number.isFinite(t)) { res.status(400).json({ error: "Flow threshold must be a number." }); return; }
    engine.flowThresholds[target] = engine.clamp(Math.round(t), 10, 90);
  }

  if (req.body?.pressureThreshold !== undefined) {
    const pt = Number(req.body.pressureThreshold);
    if (!Number.isFinite(pt)) { res.status(400).json({ error: "Pressure threshold must be a number." }); return; }
    engine.pressureThresholds[target] = Number(engine.clamp(pt, 2.0, 10.0).toFixed(2));
  }

  if (req.body?.useAutoFlow) {
    engine.manualFlowOverrides[target] = null;
  } else if (req.body?.flow !== undefined) {
    const f = Number(req.body.flow);
    if (!Number.isFinite(f)) { res.status(400).json({ error: "Flow value must be a number." }); return; }
    engine.manualFlowOverrides[target] = engine.clamp(Math.round(f), 0, 100);
  }

  engine.updateStreamValues();
  res.json({ success: true, state: engine.getCurrentState() });
});

router.get("/settings", auth.requireAuth, (req, res) => {
  res.json({ autoModeEnabled: engine.getAutoModeEnabled() });
});

router.post("/settings/auto-mode", auth.requireAuth, (req, res) => {
  engine.setAutoModeEnabled(Boolean(req.body?.enabled));
  res.json({ autoModeEnabled: engine.getAutoModeEnabled() });
});

module.exports = router;
