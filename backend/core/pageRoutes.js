const express = require("express");
const path = require("path");
const auth = require("../auth/authRoutes");

const router = express.Router();

router.get("/", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "index.html")));
router.get("/index.html", (req, res) => res.redirect("/"));

router.get("/login", (req, res) => {
  if (auth.getSession(req)) { res.redirect("/dashboard"); return; }
  res.sendFile(path.join(__dirname, "../../frontend", "login.html"));
});
router.get("/login.html", (req, res) => res.redirect("/login"));

router.get("/dashboard", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "dashboard.html")));
router.get("/dashboard.html", auth.requirePageAuth, (req, res) => res.redirect("/dashboard"));

router.get("/logs", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "logs.html")));
router.get("/logs.html", auth.requirePageAuth, (req, res) => res.redirect("/logs"));

router.get("/simulation", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "simulation.html")));
router.get("/simulation.html", auth.requirePageAuth, (req, res) => res.redirect("/simulation"));

router.get("/settings", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "settings.html")));
router.get("/settings.html", auth.requirePageAuth, (req, res) => res.redirect("/settings"));

router.get("/forgot-password", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "forgot-password.html")));
router.get("/forgot-password.html", (req, res) => res.redirect("/forgot-password"));

router.get("/change-password", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "change-password.html")));
router.get("/change-password.html", auth.requirePageAuth, (req, res) => res.redirect("/change-password"));

// Static files
router.get("/styles.css", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "styles.css")));
router.get("/login.css", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "login.css")));
router.get("/dashboard.css", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "dashboard.css")));
router.get("/logs.css", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "logs.css")));
router.get("/settings.css", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "settings.css")));
router.get("/simulation.css", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "simulation.css")));
router.get("/login.js", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "login.js")));
router.get("/forgot-password.js", (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "forgot-password.js")));
router.get("/change-password.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "change-password.js")));
router.get("/site.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "site.js")));
router.get("/dashboard.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "dashboard.js")));
router.get("/logs.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "logs.js")));
router.get("/settings.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "settings.js")));
router.get("/simulation.js", auth.requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "../../frontend", "simulation.js")));

module.exports = router;
