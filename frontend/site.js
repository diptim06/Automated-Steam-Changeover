// check if we are logged in and apply the dark mode theme if needed
window.pageSetup = function() {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }

  return fetch("/api/session")
    .then(function(response) {
      if (!response.ok) {
        window.location.href = "/login";
        return null;
      }
      return response.json();
    })
    .then(function(session) {
      var label = document.getElementById("operatorLabel");
      if (label) {
        label.textContent = "Logged in as Operator ID: " + session.operatorId;
      }
      var logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.onclick = function() {
          fetch("/api/logout", { method: "POST" })
            .then(function() {
              window.location.href = "/login";
            });
        };
      }
      return session;
    });
};
