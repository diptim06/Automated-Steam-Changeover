require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "flowdb";

let client;
let db;

async function initDb() {
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);

  // Unique index on operatorId for the users collection
  await db.collection("users").createIndex({ operatorId: 1 }, { unique: true });

  console.log(`Connected to MongoDB at ${MONGO_URI} — database: ${DB_NAME}`);
}

function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDb first.");
  return db;
}

module.exports = {
  initDb,
  getDb
};
