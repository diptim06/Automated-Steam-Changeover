require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "flowDB";

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

async function insertLog(previousStream, newStream, reason) {
  const timestamp = new Date().toISOString();
  await db.collection("logs").insertOne({
    timestamp,
    previous_stream: previousStream,
    new_stream: newStream,
    reason,
  });
}

async function getAllLogs() {
  const docs = await db
    .collection("logs")
    .find({}, { projection: { _id: 0 } })
    .sort({ _id: -1 })
    .toArray();
  return docs;
}

async function clearAllLogs() {
  await db.collection("logs").deleteMany({});
}

async function getUserByOperatorId(operatorId) {
  const doc = await db.collection("users").findOne({ operatorId });
  if (!doc) return null;

  // Map MongoDB field names back to the shape server.js expects
  return {
    operator_id: doc.operatorId,
    email: doc.email,
    password_hash: doc.passwordHash,
    password_salt: doc.passwordSalt,
    created_at: doc.createdAt,
  };
}

async function getUserByEmail(email) {
  const doc = await db.collection("users").findOne({ email });
  if (!doc) return null;

  return {
    operator_id: doc.operatorId,
    email: doc.email,
    password_hash: doc.passwordHash,
    password_salt: doc.passwordSalt,
    created_at: doc.createdAt,
  };
}

async function createUser(operatorId, email, passwordHash, passwordSalt) {
  const createdAt = new Date().toISOString();
  await db.collection("users").insertOne({
    operatorId,
    email,
    passwordHash,
    passwordSalt,
    createdAt,
  });

  return {
    operator_id: operatorId,
    email: email,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    created_at: createdAt,
  };
}

async function updateUserPassword(operatorId, passwordHash, passwordSalt) {
  await db.collection("users").updateOne(
    { operatorId },
    { $set: { passwordHash, passwordSalt } }
  );
}

module.exports = {
  initDb,
  insertLog,
  getAllLogs,
  clearAllLogs,
  getUserByOperatorId,
  getUserByEmail,
  createUser,
  updateUserPassword,
};
