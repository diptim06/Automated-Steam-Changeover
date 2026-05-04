const express = require("express");
const crypto = require("crypto");
const { getUserByOperatorId, getUserByEmail, createUser, updateUserPassword } = require("./authDb");

const router = express.Router();

const sessions = new Map();
const otpMap = new Map(); // Store OTPs temporarily
const COOKIE_NAME = "flow_session";

// helper to pull the session cookie out of the request
function getSessionToken(req) {
  const cookieHeader = req.headers.cookie || "";
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === COOKIE_NAME) {
      return decodeURIComponent(trimmed.slice(eq + 1));
    }
  }
  return null;
}

// get the session info if the user is logged in
function getSession(req) {
  const token = getSessionToken(req);
  return token ? sessions.get(token) || null : null;
}

// hash a password so we don't store it in plain text
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

// check if the password matches the hash we have
function checkPassword(password, salt, storedHash) {
  const a = crypto.scryptSync(password, salt, 64);
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// block the request if the user isn't logged in (for API)
function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  req.session = session;
  next();
}

// redirect to login if session is missing (for pages)
function requirePageAuth(req, res, next) {
  const session = getSession(req);
  if (!session) {
    res.redirect("/login");
    return;
  }
  req.session = session;
  next();
}

// basic check for id/password format
function validateCredentials(operatorId, password) {
  if (!/^\d+$/.test(operatorId || "")) return "Operator ID must contain digits only.";
  if ((password || "").length < 6) return "Password must be at least 6 characters.";
  return null;
}

router.get("/api/session", (req, res) => {
  const session = getSession(req);
  if (!session) { res.status(401).json({ error: "Not logged in" }); return; }
  res.json({ operatorId: session.operatorId });
});

router.post("/api/login", async (req, res) => {
  try {
    const operatorId = String(req.body?.operatorId || "").trim();
    const password = String(req.body?.password || "");
    const err = validateCredentials(operatorId, password);
    if (err) { res.status(400).json({ error: err }); return; }

    const user = await getUserByOperatorId(operatorId);
    if (!user) { res.status(404).json({ error: "No account found for this Operator ID." }); return; }
    if (!checkPassword(password, user.password_salt, user.password_hash)) {
      res.status(401).json({ error: "Incorrect password." });
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, { operatorId });
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict`);
    res.json({ operatorId });
  } catch {
    res.status(500).json({ error: "Login failed." });
  }
});

router.post("/api/register", async (req, res) => {
  try {
    const operatorId = String(req.body?.operatorId || "").trim();
    const password = String(req.body?.password || "");
    
    const err = validateCredentials(operatorId, password);
    if (err) { res.status(400).json({ error: err }); return; }

    const existingId = await getUserByOperatorId(operatorId);
    if (existingId) { res.status(409).json({ error: "Operator ID already exists. Please log in." }); return; }

    const { salt, hash } = hashPassword(password);
    // Passing empty string for email since we removed it
    await createUser(operatorId, "", hash, salt);

    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, { operatorId });
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict`);
    res.status(201).json({ operatorId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Account creation failed." });
  }
});

router.post("/api/logout", (req, res) => {
  const token = getSessionToken(req);
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`);
  res.json({ success: true });
});

router.post("/api/change-password", requireAuth, async (req, res) => {
  try {
    const operatorId = req.session.operatorId;
    const oldPassword = String(req.body?.oldPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    
    if (newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters." });
      return;
    }

    const user = await getUserByOperatorId(operatorId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (!checkPassword(oldPassword, user.password_salt, user.password_hash)) {
      res.status(401).json({ error: "Incorrect old password." });
      return;
    }

    const { salt, hash } = hashPassword(newPassword);
    await updateUserPassword(operatorId, hash, salt);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to change password." });
  }
});

router.post("/api/request-otp", async (req, res) => {
  try {
    const operatorId = String(req.body?.operatorId || "").trim();
    if (!operatorId) {
      res.status(400).json({ error: "Operator ID is required." });
      return;
    }

    const user = await getUserByOperatorId(operatorId);
    if (!user) {
      res.status(404).json({ error: "No account found with that Operator ID." });
      return;
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpMap.set(user.operator_id, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins

    // Return the OTP in the response (simulating an SMS/notification)
    res.json({ success: true, simulatedOtp: otp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to request OTP." });
  }
});

router.post("/api/reset-password", async (req, res) => {
  try {
    const operatorId = String(req.body?.operatorId || "").trim();
    const otp = String(req.body?.otp || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters." });
      return;
    }

    const user = await getUserByOperatorId(operatorId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const storedOtpData = otpMap.get(user.operator_id);
    if (!storedOtpData || storedOtpData.otp !== otp || Date.now() > storedOtpData.expires) {
      res.status(401).json({ error: "Invalid or expired OTP." });
      return;
    }

    const { salt, hash } = hashPassword(newPassword);
    await updateUserPassword(user.operator_id, hash, salt);

    // Clear OTP after successful reset
    otpMap.delete(user.operator_id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

module.exports = {
  router,
  requireAuth,
  requirePageAuth,
  getSession
};
