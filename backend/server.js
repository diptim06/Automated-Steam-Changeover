const express = require("express");
const { initDb } = require("./core/db");
const engine = require("./simulation/engine");
const authRoutes = require("./auth/authRoutes");
const simulationRoutes = require("./simulation/simulationRoutes");
const logRoutes = require("./logs/logRoutes");
const pageRoutes = require("./core/pageRoutes");

const app = express();

app.use(express.json());

// Mount the authentication router
app.use(authRoutes.router);

// Mount the domain-specific API routes
app.use("/api", simulationRoutes);
app.use("/api/logs", logRoutes);

// Mount the main page routes
app.use(pageRoutes);

async function startServer() {
  try {
    await initDb();
    engine.startSimulationLoop();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
