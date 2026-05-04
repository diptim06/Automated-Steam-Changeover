// Get all elements by ID
// get elements for the settings page
function getElements() {
  var elements = {};
  elements.autoModeToggle = document.getElementById("autoModeToggle");
  elements.autoModeStatus = document.getElementById("autoModeStatus");
  elements.darkModeToggle = document.getElementById("darkModeToggle");
  return elements;
}

var els = getElements();

// load the current auto-mode and other settings
function loadSettings() {
  fetch("/api/settings")
    .then(function(response) {
      if (!response.ok) {
        window.location.href = "/login";
        return;
      }
      return response.json();
    })
    .then(function(data) {
      els.autoModeToggle.checked = data.autoModeEnabled;
      if (data.autoModeEnabled) {
        els.autoModeStatus.textContent = "Auto Mode is ON";
      } else {
        els.autoModeStatus.textContent = "Auto Mode is OFF";
      }
    });
}

// handle toggles for dark mode and auto mode
function setupEventListeners() {
  els.autoModeToggle.onchange = function() {
    fetch("/api/settings/auto-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: els.autoModeToggle.checked })
    })
    .then(function(response) {
      if (!response.ok) {
        window.location.href = "/login";
        return;
      }
      return response.json();
    })
    .then(function(data) {
      if (data.autoModeEnabled) {
        els.autoModeStatus.textContent = "Auto Mode is ON";
      } else {
        els.autoModeStatus.textContent = "Auto Mode is OFF";
      }
    });
  };

  if (localStorage.getItem('theme') === 'dark') {
    els.darkModeToggle.checked = true;
  }

  els.darkModeToggle.onchange = function() {
    if (els.darkModeToggle.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

}

// init the page with user details
function init() {
  setupEventListeners();
  
  window.pageSetup().then(function(session) {
    if (!session) return;
    var profileOpId = document.getElementById("profileOperatorId");
    if (profileOpId) profileOpId.textContent = session.operatorId;
    loadSettings();
  });
}

init();
