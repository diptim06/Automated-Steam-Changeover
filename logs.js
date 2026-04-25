// Get all elements by ID
function getElements() {
  var elements = {};
  elements.logsList = document.getElementById("logsList");
  elements.clearLogsBtn = document.getElementById("clearLogsBtn");
  return elements;
}

var els = getElements();

var reasonLabels = {
  manual: "Manual Switch",
  manual_activate: "Manual Activate",
  auto_fault: "Fault Failover",
  flow_threshold_fault: "Flow Below Limit",
  pressure_threshold_fault: "Pressure Limit Exceeded",
  fault_inserted: "Fault Inserted",
  fault_cleared: "Fault Cleared"
};

function renderLogs(logs) {
  if (logs.length === 0) {
    els.logsList.innerHTML = '<div class="log-item">No logs available.</div>';
    return;
  }
  var html = "";
  var i;
  for (i = 0; i < logs.length; i++) {
    var log = logs[i];
    var label = reasonLabels[log.reason];
    if (!label) {
      label = log.reason;
    }
    html = html + '<div class="log-item">' + log.timestamp + ' | ' + log.previous_stream + ' → ' + log.new_stream + ' | ' + label + '</div>';
  }
  els.logsList.innerHTML = html;
}

function loadLogs() {
  fetch("/api/logs")
    .then(function(response) {
      if (!response.ok) {
        window.location.href = "/login";
        return;
      }
      return response.json();
    })
    .then(function(data) {
      renderLogs(data);
    });
}

function setupEventListeners() {
  els.clearLogsBtn.onclick = function() {
    fetch("/api/logs", { method: "DELETE" })
      .then(function(response) {
        if (!response.ok) {
          els.logsList.innerHTML = '<div class="log-item">Failed to clear logs.</div>';
          return;
        }
        renderLogs([]);
      });
  };
}

function init() {
  setupEventListeners();
  
  window.pageSetup().then(function(session) {
    if (!session) return;
    loadLogs();
  });
}

init();
