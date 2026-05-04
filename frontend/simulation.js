// Get all elements by ID
// get all simulation controls
function getElements() {
  var elements = {};
  elements.streamSelect = document.getElementById("streamSelect");
  elements.thresholdSlider = document.getElementById("thresholdSlider");
  elements.flowSlider = document.getElementById("flowSlider");
  elements.thresholdValue = document.getElementById("thresholdValue");
  elements.flowValue = document.getElementById("flowValue");
  elements.pressureThresholdSlider = document.getElementById("pressureThresholdSlider");
  elements.pressureThresholdValue = document.getElementById("pressureThresholdValue");
  elements.applySimulationBtn = document.getElementById("applySimulationBtn");
  elements.autoFlowBtn = document.getElementById("autoFlowBtn");
  elements.activateSimulationBtn = document.getElementById("activateSimulationBtn");
  elements.simulationMessage = document.getElementById("simulationMessage");
  elements.simulationHint = document.getElementById("simulationHint");
  elements.selectedStreamTitle = document.getElementById("selectedStreamTitle");
  elements.streamModeSelect = document.getElementById("streamModeSelect");
  elements.selectedFlowStat = document.getElementById("selectedFlowStat");
  elements.selectedThresholdStat = document.getElementById("selectedThresholdStat");
  elements.selectedPressureThresholdStat = document.getElementById("selectedPressureThresholdStat");
  return elements;
}

var els = getElements();
var flowState = null;
var isEditing = false;

// show a status message to the user
function setMessage(text, cls) {
  if (!cls) {
    cls = "page-text";
  }
  els.simulationMessage.className = cls;
  els.simulationMessage.textContent = text;
}

// figure out which stream is currently picked in the dropdown
function getSelectedStream() {
  if (!flowState) return null;
  var i;
  for (i = 0; i < flowState.streams.length; i++) {
    var s = flowState.streams[i];
    if (s.name === els.streamSelect.value) {
      return s;
    }
  }
  return null;
}

// update the text next to the range sliders
function updateSliderLabels() {
  var threshold = Number(els.thresholdSlider.value);
  var pressureThreshold = Number(els.pressureThresholdSlider.value);
  var flow = Number(els.flowSlider.value);
  els.thresholdValue.textContent = threshold + " L/min";
  els.pressureThresholdValue.textContent = pressureThreshold.toFixed(1) + " bar";
  els.flowValue.textContent = flow + " L/min";
  els.selectedFlowStat.textContent = flow + " L/min";
  els.selectedThresholdStat.textContent = threshold + " L/min";
  els.selectedPressureThresholdStat.textContent = pressureThreshold.toFixed(1) + " bar";
}

// show helpful tips based on what the user is doing
function updateHint(stream) {
  if (!stream) {
    els.simulationHint.textContent = "";
    return;
  }
  var flow = Number(els.flowSlider.value);
  var threshold = Number(els.thresholdSlider.value);
  
  if (stream.fault) {
    els.simulationHint.textContent = "Stream " + stream.name + " is faulted. Clear the fault on the Dashboard first.";
  } else if (stream.status === "active" && flow < threshold) {
    els.simulationHint.textContent = "This active stream is below the threshold. If Auto Mode is ON, a low-flow fault may trigger.";
  } else if (stream.status === "active") {
    els.simulationHint.textContent = "This stream is active. Values are applied directly to the running line.";
  } else {
    els.simulationHint.textContent = "This stream is on standby. Activate it to observe the chosen flow and threshold.";
  }
}

// update sliders when the stream selection changes
function syncControls(stream, preserveInputs) {
  if (!stream) return;
  els.selectedStreamTitle.textContent = "Stream " + stream.name;
  if (stream.manualFlowOverride === null) {
    els.streamModeSelect.value = "auto";
  } else {
    els.streamModeSelect.value = "manual";
  }
  
  if (!preserveInputs) {
    els.thresholdSlider.value = stream.flowThreshold;
    els.pressureThresholdSlider.value = stream.pressureThreshold;
    if (stream.manualFlowOverride === null) {
      els.flowSlider.value = stream.flow;
    } else {
      els.flowSlider.value = stream.manualFlowOverride;
    }
  }
  
  updateSliderLabels();
  updateHint(stream);
}

// get latest system data for simulation
function loadState(preserveInputs) {
  fetch("/api/flow")
    .then(function(response) {
      if (!response.ok) {
        window.location.href = "/login";
        return;
      }
      return response.json();
    })
    .then(function(data) {
      flowState = data;
      
      if (els.streamSelect.options.length === 0) {
        var html = "";
        var i;
        for (i = 0; i < flowState.streams.length; i++) {
          var s = flowState.streams[i];
          html = html + '<option value="' + s.name + '">Stream ' + s.name + '</option>';
        }
        els.streamSelect.innerHTML = html;
      }
      
      if (!els.streamSelect.value) {
        els.streamSelect.value = flowState.activeStream;
      }
      
      var shouldPreserve = preserveInputs && isEditing;
      syncControls(getSelectedStream(), shouldPreserve);
    });
}

// post data to the api with a callback
function post(url, body, callback) {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  .then(function(response) {
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      return response.json().then(function(data) {
        callback(new Error(data.error || "Request failed."), null);
      });
    }
    return response.json();
  })
  .then(function(data) {
    callback(null, data);
  })
  .catch(function() {
    callback(new Error("Request failed."), null);
  });
}

// listen for slider changes and button clicks
function setupEventListeners() {
  els.streamModeSelect.onchange = function() {
    isEditing = false;
    var mode = els.streamModeSelect.value;
    if (mode === "auto") {
      post("/api/simulation/stream", {
        stream: els.streamSelect.value,
        flowThreshold: Number(els.thresholdSlider.value),
        pressureThreshold: Number(els.pressureThresholdSlider.value),
        useAutoFlow: true
      }, function(err, data) {
        if (err) {
          setMessage(err.message, "page-text message-danger");
          return;
        }
        loadState();
        setMessage("Automatic flow restored.", "page-text message-success");
      });
    } else {
      post("/api/simulation/stream", {
        stream: els.streamSelect.value,
        flowThreshold: Number(els.thresholdSlider.value),
        pressureThreshold: Number(els.pressureThresholdSlider.value),
        flow: Number(els.flowSlider.value)
      }, function(err, data) {
        if (err) {
          setMessage(err.message, "page-text message-danger");
          return;
        }
        loadState();
        setMessage("Manual flow applied.", "page-text message-success");
      });
    }
  };

  els.streamSelect.onchange = function() {
    isEditing = false;
    syncControls(getSelectedStream());
    setMessage("");
  };

  els.thresholdSlider.oninput = function() {
    isEditing = true;
    updateSliderLabels();
    updateHint(getSelectedStream());
  };

  els.flowSlider.oninput = function() {
    isEditing = true;
    updateSliderLabels();
    updateHint(getSelectedStream());
  };

  els.pressureThresholdSlider.oninput = function() {
    isEditing = true;
    updateSliderLabels();
    updateHint(getSelectedStream());
  };

  els.applySimulationBtn.onclick = function() {
    post("/api/simulation/stream", {
      stream: els.streamSelect.value,
      flowThreshold: Number(els.thresholdSlider.value),
      pressureThreshold: Number(els.pressureThresholdSlider.value),
      flow: Number(els.flowSlider.value)
    }, function(err, data) {
      if (err) {
        setMessage(err.message, "page-text message-danger");
        return;
      }
      isEditing = false;
      loadState();
      setMessage("Simulation values applied.", "page-text message-success");
    });
  };

  els.autoFlowBtn.onclick = function() {
    post("/api/simulation/stream", {
      stream: els.streamSelect.value,
      flowThreshold: Number(els.thresholdSlider.value),
      useAutoFlow: true
    }, function(err, data) {
      if (err) {
        setMessage(err.message, "page-text message-danger");
        return;
      }
      isEditing = false;
      loadState();
      setMessage("Automatic flow restored.", "page-text message-success");
    });
  };

  els.activateSimulationBtn.onclick = function() {
    post("/api/activate", { stream: els.streamSelect.value }, function(err, data) {
      if (err) {
        setMessage(err.message, "page-text message-danger");
        return;
      }
      isEditing = false;
      loadState();
      setMessage("Stream " + els.streamSelect.value + " is now active.", "page-text message-success");
    });
  };
}


// startup the simulation page refresh loop
function init() {
  setupEventListeners();
  
  window.pageSetup().then(function(session) {
    if (!session) return;
    loadState();
    setInterval(function() {
      loadState(true);
    }, 2000);
  });
}

init();
