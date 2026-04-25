document.addEventListener("DOMContentLoaded", function() {
  var step1 = document.getElementById("step1");
  var step2 = document.getElementById("step2");
  var flowDescription = document.getElementById("flowDescription");

  // Step 1 Elements
  var operatorIdInput = document.getElementById("operatorId");
  var requestOtpBtn = document.getElementById("requestOtpBtn");
  var step1Message = document.getElementById("step1Message");

  // Step 2 Elements
  var otpInput = document.getElementById("otp");
  var newPasswordInput = document.getElementById("newPassword");
  var confirmNewPasswordInput = document.getElementById("confirmNewPassword");
  var resetPasswordBtn = document.getElementById("resetPasswordBtn");
  var step2Message = document.getElementById("step2Message");

  // State
  var requestedOperatorId = "";

  requestOtpBtn.onclick = function() {
    var operatorId = operatorIdInput.value.trim();
    if (!operatorId || !/^\d+$/.test(operatorId)) {
      step1Message.style.color = "var(--danger-color)";
      step1Message.textContent = "Please enter a valid numeric Operator ID.";
      return;
    }

    step1Message.style.color = "var(--text-primary)";
    step1Message.textContent = "Requesting code...";

    fetch("/api/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorId: operatorId })
    })
    .then(function(response) {
      return response.json().catch(function() { return {}; }).then(function(data) {
        if (!response.ok) {
          throw new Error(data.error || "Failed to request OTP.");
        }
        return data;
      });
    })
    .then(function(data) {
      // Simulate OTP arriving by showing an alert
      alert("SIMULATED NOTIFICATION:\n\nHello, a password reset was requested for your account.\nYour reset code is: " + data.simulatedOtp);

      requestedOperatorId = operatorId;
      
      // Transition to Step 2
      step1.style.display = "none";
      step2.style.display = "grid";
      flowDescription.textContent = "Enter the 4-digit code to reset your password.";
    })
    .catch(function(err) {
      step1Message.style.color = "var(--danger-color)";
      step1Message.textContent = err.message;
    });
  };

  resetPasswordBtn.onclick = function() {
    var otp = otpInput.value.trim();
    var newPass = newPasswordInput.value;
    var confirmPass = confirmNewPasswordInput.value;

    step2Message.style.color = "var(--text-primary)";
    step2Message.textContent = "";

    if (!otp || !newPass || !confirmPass) {
      step2Message.style.color = "var(--danger-color)";
      step2Message.textContent = "All fields are required.";
      return;
    }

    if (newPass !== confirmPass) {
      step2Message.style.color = "var(--danger-color)";
      step2Message.textContent = "New passwords do not match.";
      return;
    }

    step2Message.textContent = "Resetting password...";

    fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorId: requestedOperatorId, otp: otp, newPassword: newPass })
    })
    .then(function(response) {
      return response.json().catch(function() { return {}; }).then(function(data) {
        if (!response.ok) {
          throw new Error(data.error || "Failed to reset password.");
        }
        return data;
      });
    })
    .then(function() {
      step2Message.style.color = "var(--success-color)";
      step2Message.textContent = "Password reset successfully! Redirecting to login...";
      
      setTimeout(function() {
        window.location.href = "/login";
      }, 2000);
    })
    .catch(function(err) {
      step2Message.style.color = "var(--danger-color)";
      step2Message.textContent = err.message;
    });
  };
});
