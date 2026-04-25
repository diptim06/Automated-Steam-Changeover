const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { initDb, insertLog, getAllLogs, clearAllLogs, getUserByOperatorId, createUser, updateUserPassword } = require("./db");

const app = express();
app.use(express.json());

const auth = require("./auth");

const streams = ["A", "B", "C", "D"];

const flowThresholds = { A: 30, B: 35, C: 40, D: 45 };
const pressureThresholds = { A: 6.5, B: 6.8, C: 7.1, D: 7.4 };

let activeStream = "A";
let autoModeEnabled = true;

const streamData = {
  A: { flow: 0, pressure: 0, fault: false, faultReason: null },
  B: { flow: 0, pressure: 0, fault: false, faultReason: null },
  C: { flow: 0, pressure: 0, fault: false, faultReason: null },
  D: { flow: 0, pressure: 0, fault: false, faultReason: null },
};

const lowFlowCounters = { A: 0, B: 0, C: 0, D: 0 };
const pressureBoost = { A: 0, B: 0, C: 0, D: 0 };
const manualFlowOverrides = { A: null, B: null, C: null, D: null };

// --- Stream logic ---

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomPressure() {
  return Number((Math.random() * (7.2 - 1.8) + 1.8).toFixed(2));
}

function getNextHealthyStream(current) {
  const idx = streams.indexOf(current);
  let checked = 0;
  let next = streams[(idx + 1) % streams.length];

  while (streamData[next].fault && checked < streams.length) {
    next = streams[(streams.indexOf(next) + 1) % streams.length];
    checked++;
  }

  if (streamData[next].fault) {
    // Clear fault automatically so the system doesn't get stuck
    streamData[next].fault = false;
    streamData[next].faultReason = null;
  }

  return next;
}

async function switchStream(reason, target) {
  const prev = activeStream;

  let next = null;
  if (target && streams.includes(target) && !streamData[target].fault) {
    next = target;
  } else {
    next = getNextHealthyStream(prev);
  }

  if (!next || next === prev) return null;

  activeStream = next;
  await insertLog(prev, next, reason);
  return { previousStream: prev, newStream: next, reason };
}

function updateStreamValues() {
  for (const s of streams) {
    if (streamData[s].fault) {
      streamData[s].flow = 0;
      streamData[s].pressure = 0;
      lowFlowCounters[s] = 0;
      continue;
    }

    const hasManual = Number.isFinite(manualFlowOverrides[s]);

    if (s === activeStream) {
      const flow = hasManual
        ? manualFlowOverrides[s]
        : clamp(randomInt(20, 100) + pressureBoost[s], 0, 100);
      const pressure = hasManual ? 1.8 + flow / 28 : randomPressure();
      streamData[s].flow = clamp(Math.round(flow), 0, 100);
      streamData[s].pressure = Number(Math.min(9.5, pressure + pressureBoost[s] / 20).toFixed(2));
      pressureBoost[s] = 0;
    } else {
      const flow = hasManual ? manualFlowOverrides[s] : randomInt(8, 35);
      streamData[s].flow = clamp(Math.round(flow), 0, 100);
      streamData[s].pressure = Number(
        (hasManual ? 1.4 + flow / 30 : randomPressure()).toFixed(2)
      );
      lowFlowCounters[s] = 0;
    }
  }
}

async function applyFault(stream, reason) {
  if (!stream || streamData[stream].fault) return null;

  streamData[stream].fault = true;
  streamData[stream].faultReason = reason;
  lowFlowCounters[stream] = 0;

  const logReason = reason === "pressure_high" ? "pressure_threshold_fault" : "flow_threshold_fault";
  await insertLog(stream, stream, logReason);

  return switchStream("auto_fault");
}

function getCurrentState() {
  return {
    activeStream,
    autoModeEnabled,
    flow: streamData[activeStream].flow,
    pressure: streamData[activeStream].pressure,
    streams: streams.map((s) => ({
      name: s,
      flow: streamData[s].flow,
      pressure: streamData[s].pressure,
      flowThreshold: flowThresholds[s],
      pressureThreshold: pressureThresholds[s],
      manualFlowOverride: manualFlowOverrides[s],
      fault: streamData[s].fault,
      faultReason: streamData[s].faultReason,
      status: streamData[s].fault ? "fault" : s === activeStream ? "active" : "standby",
    })),
  };
}

// --- Page routes ---

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/index.html", (req, res) => res.redirect("/"));

app.get("/login", (req, res) => {
  if (auth.getSession(req)) { res.redirect("/dashboard"); return; }
  res.sendFile(path.join(__dirname, "login.html"));
});
app.get("/login.html", (req, res) => res.redirect("/login"));

app.get("/dashboard", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "dashboard.html")));
app.get("/dashboard.html", auth.requirePageAuth, (req, res) => res.redirect("/dashboard"));

app.get("/logs", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "logs.html")));
app.get("/logs.html", auth.requirePageAuth, (req, res) => res.redirect("/logs"));

app.get("/simulation", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "simulation.html")));
app.get("/simulation.html", auth.requirePageAuth, (req, res) => res.redirect("/simulation"));

app.get("/settings", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "settings.html")));
app.get("/settings.html", auth.requirePageAuth, (req, res) => res.redirect("/settings"));

app.get("/forgot-password", (req, res) => res.sendFile(path.join(__dirname, "forgot-password.html")));
app.get("/forgot-password.html", (req, res) => res.redirect("/forgot-password"));

app.get("/change-password", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "change-password.html")));
app.get("/change-password.html", auth.requirePageAuth, (req, res) => res.redirect("/change-password"));

// Static files
app.get("/styles.css", (req, res) => res.sendFile(path.join(__dirname, "styles.css")));
app.get("/login.css", (req, res) => res.sendFile(path.join(__dirname, "login.css")));
app.get("/dashboard.css", (req, res) => res.sendFile(path.join(__dirname, "dashboard.css")));
app.get("/logs.css", (req, res) => res.sendFile(path.join(__dirname, "logs.css")));
app.get("/settings.css", (req, res) => res.sendFile(path.join(__dirname, "settings.css")));
app.get("/simulation.css", (req, res) => res.sendFile(path.join(__dirname, "simulation.css")));
app.get("/login.js", (req, res) => res.sendFile(path.join(__dirname, "login.js")));
app.get("/forgot-password.js", (req, res) => res.sendFile(path.join(__dirname, "forgot-password.js")));
app.get("/change-password.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "change-password.js")));
app.get("/site.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "site.js")));
app.get("/dashboard.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "dashboard.js")));
app.get("/logs.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "logs.js")));
app.get("/settings.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "settings.js")));
app.get("/simulation.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "simulation.js")));

// --- API routes ---
app.use(auth.router);

app.get("/api/flow", auth.requireAuth, (req, res) => {
  res.json(getCurrentState());
});

app.get("/api/logs", auth.requireAuth, async (req, res) => {
  try {
    res.json(await getAllLogs());
  } catch {
    res.status(500).json({ error: "Failed to fetch logs." });
  }
});

app.delete("/api/logs", auth.requireAuth, async (req, res) => {
  try {
    await clearAllLogs();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to clear logs." });
  }
});

app.post("/api/switch", auth.requireAuth, async (req, res) => {
  try {
    const change = await switchStream("manual");
    if (!change) { res.status(400).json({ error: "No healthy stream available." }); return; }
    res.json(change);
  } catch {
    res.status(500).json({ error: "Manual switch failed." });
  }
});

app.post("/api/activate", auth.requireAuth, async (req, res) => {
  try {
    const target = req.body?.stream;
    if (!streams.includes(target)) { res.status(400).json({ error: "Invalid stream." }); return; }
    if (streamData[target].fault) { res.status(400).json({ error: "Cannot activate a faulted stream." }); return; }

    const change = await switchStream("manual_activate", target);
    if (!change) { res.json({ message: "Stream already active." }); return; }
    res.json(change);
  } catch {
    res.status(500).json({ error: "Activation failed." });
  }
});

app.post("/api/fault", auth.requireAuth, async (req, res) => {
  try {
    const target = req.body?.stream;
    const fault = req.body?.fault !== false;
    if (!streams.includes(target)) { res.status(400).json({ error: "Invalid stream." }); return; }

    streamData[target].fault = fault;
    streamData[target].faultReason = fault ? "manual_fault" : null;

    if (fault && target === activeStream) {
      await insertLog(target, target, "fault_inserted");
      const change = await switchStream("auto_fault");
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

app.post("/api/pressure/increase", auth.requireAuth, (req, res) => {
  pressureBoost[activeStream] = Math.min(30, pressureBoost[activeStream] + 10);
  updateStreamValues();
  res.json({ success: true });
});

app.post("/api/simulation/stream", auth.requireAuth, (req, res) => {
  const target = req.body?.stream;
  if (!streams.includes(target)) { res.status(400).json({ error: "Invalid stream." }); return; }

  if (req.body?.flowThreshold !== undefined) {
    const t = Number(req.body.flowThreshold);
    if (!Number.isFinite(t)) { res.status(400).json({ error: "Flow threshold must be a number." }); return; }
    flowThresholds[target] = clamp(Math.round(t), 10, 90);
  }

  if (req.body?.pressureThreshold !== undefined) {
    const pt = Number(req.body.pressureThreshold);
    if (!Number.isFinite(pt)) { res.status(400).json({ error: "Pressure threshold must be a number." }); return; }
    pressureThresholds[target] = Number(clamp(pt, 2.0, 10.0).toFixed(2));
  }

  if (req.body?.useAutoFlow) {
    manualFlowOverrides[target] = null;
  } else if (req.body?.flow !== undefined) {
    const f = Number(req.body.flow);
    if (!Number.isFinite(f)) { res.status(400).json({ error: "Flow value must be a number." }); return; }
    manualFlowOverrides[target] = clamp(Math.round(f), 0, 100);
  }

  updateStreamValues();
  res.json({ success: true, state: getCurrentState() });
});

app.get("/api/settings", auth.requireAuth, (req, res) => {
  res.json({ autoModeEnabled });
});

app.post("/api/settings/auto-mode", auth.requireAuth, (req, res) => {
  autoModeEnabled = Boolean(req.body?.enabled);
  res.json({ autoModeEnabled });
});

// --- Simulation loop ---

function startSimulationLoop() {
  setInterval(async () => {
    try {
      updateStreamValues();

      if (streamData[activeStream].pressure > pressureThresholds[activeStream]) {
        await applyFault(activeStream, "pressure_high");
        return;
      }

      if (!autoModeEnabled) {
        lowFlowCounters[activeStream] = 0;
        return;
      }

      if (streamData[activeStream].flow < flowThresholds[activeStream]) {
        lowFlowCounters[activeStream]++;
        if (lowFlowCounters[activeStream] >= 2) {
          await applyFault(activeStream, "flow_low");
        }
      } else {
        lowFlowCounters[activeStream] = 0;
      }
    } catch (err) {
      console.error("Simulation error:", err.message);
    }
  }, 4000);
}

async function startServer() {
  try {
    await initDb();
    startSimulationLoop();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
