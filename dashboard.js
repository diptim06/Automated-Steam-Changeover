// Get all elements by ID
function getElements() {
  var elements = {};
  elements.activeStreamTitle = document.getElementById("activeStreamTitle");
  elements.currentFlow = document.getElementById("currentFlow");
  elements.currentPressure = document.getElementById("currentPressure");
  elements.flowPercentLabel = document.getElementById("flowPercentLabel");
  elements.pipeFill = document.getElementById("pipeFill");
  elements.streamGrid = document.getElementById("streamGrid");
  elements.manualSwitchBtn = document.getElementById("manualSwitchBtn");
  elements.simulateFaultBtn = document.getElementById("simulateFaultBtn");
  elements.increasePressureBtn = document.getElementById("increasePressureBtn");
  return elements;
}

var els = getElements();

function flowToPercent(flow) {
  var v = Math.max(20, Math.min(100, Number(flow) || 0));
  return Math.round(((v - 20) / 80) * 100);
}

function statusText(stream) {
  if (stream.faultReason === "pressure_high") {
    return "Pressure Fault";
  }
  if (stream.faultReason === "flow_low") {
    return "Low Flow Fault";
  }
  if (stream.status === "active") {
    return "Active";
  }
  if (stream.status === "fault") {
    return "Fault";
  }
  return "Standby";
}

function renderStreamCards(streams) {
  var html = "";
  var i;
  for (i = 0; i < streams.length; i++) {
    var s = streams[i];
    var pct = flowToPercent(s.flow);
    var disabled = "";
    if (s.fault || s.status === "active") {
      disabled = "disabled";
    }
    html = html + '<article class="stream-card ' + s.status + '">';
    html = html + '<h3>Stream ' + s.name + '</h3>';
    html = html + '<p><strong>Status:</strong> ' + statusText(s) + '</p>';
    html = html + '<p><strong>Flow:</strong> ' + s.flow + ' L/min</p>';
    html = html + '<p><strong>Pressure:</strong> ' + Number(s.pressure).toFixed(2) + ' bar</p>';
    html = html + '<p><strong>Flow Threshold:</strong> ' + s.flowThreshold + ' L/min</p>';
    html = html + '<p><strong>Pressure Threshold:</strong> ' + s.pressureThreshold + ' bar</p>';
    html = html + '<div class="small-flow-track">';
    html = html + '<div class="small-flow-fill" style="width:' + pct + '%"></div>';
    html = html + '</div>';
    html = html + '<div class="button-row">';
    html = html + '<button class="primary-btn" data-action="activate" data-stream="' + s.name + '" ' + disabled + '>Activate</button>';
    var faultText = "Insert Fault";
    var faultValue = "on";
    if (s.fault) {
      faultText = "Clear Fault";
      faultValue = "off";
    }
    html = html + '<button class="danger-btn" data-action="fault" data-stream="' + s.name + '" data-fault="' + faultValue + '">' + faultText + '</button>';
    html = html + '</div>';
    html = html + '</article>';
  }
  els.streamGrid.innerHTML = html;
}

function updateDashboard(data) {
  var pct = flowToPercent(data.flow);
  els.activeStreamTitle.textContent = "Stream " + data.activeStream;
  els.currentFlow.textContent = data.flow + " L/min";
  els.currentPressure.textContent = Number(data.pressure).toFixed(2) + " bar";
  els.flowPercentLabel.textContent = pct + "%";
  els.pipeFill.style.width = pct + "%";
  renderStreamCards(data.streams);
}

function fetchState() {
  fetch("/api/flow")
    .then(function(response) {
      if (!response.ok) {
        window.location.href = "/login";
        return;
      }
      return response.json();
    })
    .then(function(data) {
      updateDashboard(data);
    });
}

function post(url, body) {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  })
  .then(function(response) {
    if (response.status === 401) {
      window.location.href = "/login";
    }
  });
}

function setupEventListeners() {
  els.manualSwitchBtn.onclick = function() {
    post("/api/switch");
    fetchState();
  };

  els.simulateFaultBtn.onclick = function() {
    fetch("/api/flow")
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        post("/api/fault", { stream: data.activeStream, fault: true });
        fetchState();
      });
  };

  els.increasePressureBtn.onclick = function() {
    post("/api/pressure/increase");
    fetchState();
  };
}

function handleStreamClick(event) {
  var target = event.target;
  while (target && target !== els.streamGrid) {
    if (target.tagName === "BUTTON" && target.getAttribute("data-action")) {
      var stream = target.getAttribute("data-stream");
      var action = target.getAttribute("data-action");
      if (action === "activate") {
        post("/api/activate", { stream: stream });
      }
      if (action === "fault") {
        var faultOn = target.getAttribute("data-fault") === "on";
        post("/api/fault", { stream: stream, fault: faultOn });
      }
      fetchState();
      break;
    }
    target = target.parentNode;
  }
}

function init() {
  setupEventListeners();
  els.streamGrid.onclick = handleStreamClick;
  
  window.pageSetup().then(function(session) {
    if (!session) return;
    fetchState();
    setInterval(function() {
      fetchState();
    }, 2000);
  });
}

init();
