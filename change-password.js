document.addEventListener("DOMContentLoaded", function () {
  var oldPassword = document.getElementById("oldPassword");
  var newPassword = document.getElementById("newPassword");
  var confirmNewPassword = document.getElementById("confirmNewPassword");
  var passwordMessage = document.getElementById("passwordMessage");
  var changePasswordBtn = document.getElementById("changePasswordBtn");

  changePasswordBtn.onclick = function () {
    var oldPass = oldPassword.value;
    var newPass = newPassword.value;
    var confirmPass = confirmNewPassword.value;

    passwordMessage.className = "page-text";
    passwordMessage.textContent = "";

    if (!oldPass || !newPass || !confirmPass) {
      passwordMessage.style.color = "var(--danger-color)";
      passwordMessage.textContent = "All fields are required.";
      return;
    }

    if (newPass !== confirmPass) {
      passwordMessage.style.color = "var(--danger-color)";
      passwordMessage.textContent = "New passwords do not match.";
      return;
    }

    fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
    })
      .then(function (response) {
        if (!response.ok) {
          if (response.status === 401 && !response.headers.get("Content-Type").includes("json")) {
            window.location.href = "/login";
            return;
          }
          return response.json().then(function (data) {
            throw new Error(data.error || "Failed to change password.");
          });
        }
        return response.json();
      })
      .then(function (data) {
        passwordMessage.style.color = "var(--success-color)";
        passwordMessage.textContent = "Password updated successfully.";
        oldPassword.value = "";
        newPassword.value = "";
        confirmNewPassword.value = "";

        // Redirect back after short delay
        setTimeout(function () {
          window.location.href = "/settings";
        }, 1500);
      })
      .catch(function (err) {
        passwordMessage.style.color = "var(--danger-color)";
        passwordMessage.textContent = err.message;
      });
  };

  // Ensure user is authenticated
  window.pageSetup().then(function (session) {
    if (!session) return;
  });
});
