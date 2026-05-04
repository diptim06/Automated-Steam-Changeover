const { insertLog } = require("../logs/logDb");

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

// helper to get a random number in a range
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// keep a value between min and max so things don't break
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// just get a random pressure reading for simulation
function randomPressure() {
  return Number((Math.random() * (7.2 - 1.8) + 1.8).toFixed(2));
}

// find the next stream that isn't broken
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

// logic to move from one stream to another (manual or auto)
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

// update all the live flow/pressure numbers
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

// mark a stream as failed and try to switch away from it
async function applyFault(stream, reason) {
  if (!stream || streamData[stream].fault) return null;

  streamData[stream].fault = true;
  streamData[stream].faultReason = reason;
  lowFlowCounters[stream] = 0;

  const logReason = reason === "pressure_high" ? "pressure_threshold_fault" : "flow_threshold_fault";
  await insertLog(stream, stream, logReason);

  return switchStream("auto_fault");
}

// wrapper to send the whole system status to the frontend
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

// this runs in the background to keep the numbers moving
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

module.exports = {
  streams,
  flowThresholds,
  pressureThresholds,
  streamData,
  manualFlowOverrides,
  pressureBoost,
  getActiveStream: () => activeStream,
  getAutoModeEnabled: () => autoModeEnabled,
  setAutoModeEnabled: (val) => { autoModeEnabled = val; },
  switchStream,
  updateStreamValues,
  applyFault,
  getCurrentState,
  startSimulationLoop,
  clamp
};
