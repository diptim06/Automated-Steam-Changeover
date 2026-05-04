// Get all elements by ID when page loads
// get the login/register form elements
function getElements() {
  var elements = {};
  elements.loginForm = document.getElementById("loginForm");
  elements.registerBtn = document.getElementById("registerBtn");
  elements.operatorIdInput = document.getElementById("operatorId");
  elements.passwordInput = document.getElementById("password");
  elements.messageBox = document.getElementById("messageBox");
  elements.loginBtn = document.getElementById("loginBtn");
  return elements;
}

var els = getElements(); //storing ids

// handle login or register button clicks
function submitAuth(url) {
  var operatorId = els.operatorIdInput.value.trim(); //to extract values
  var password = els.passwordInput.value;

  if (!/^\d+$/.test(operatorId)) {
    els.messageBox.textContent = "Operator ID must contain digits only.";
    return;
  }
  if (password.length < 6) {
    els.messageBox.textContent = "Password must be at least 6 characters.";
    return;
  }

  els.messageBox.textContent = "Please wait...";

  var payload = { operatorId: operatorId, password: password };

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (data) {
        if (!response.ok) {
          els.messageBox.textContent = data.error || "Request failed.";
          return;
        }
        window.location.href = "/dashboard";
      });
    })
    .catch(function () {
      els.messageBox.textContent = "Unable to reach server.";
    });
}

// attach the form submit and register button events
function setupEventListeners() {
  els.loginForm.onsubmit = function (event) {
    event.preventDefault();
    submitAuth("/api/login");
  };

  els.registerBtn.onclick = function () {
    submitAuth("/api/register");
  };
}

setupEventListeners();
