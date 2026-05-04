const { getDb } = require("../core/db");

// save a new event to the logs collection
async function insertLog(previousStream, newStream, reason) {
  const db = getDb();
  const timestamp = new Date().toISOString();
  await db.collection("logs").insertOne({
    timestamp,
    previous_stream: previousStream,
    new_stream: newStream,
    reason,
  });
}

// get every log in the db, newest first
async function getAllLogs() {
  const db = getDb();
  const docs = await db
    .collection("logs")
    .find({}, { projection: { _id: 0 } })
    .sort({ _id: -1 })
    .toArray();
  return docs;
}

// wipe out all logs (dangerous!)
async function clearAllLogs() {
  const db = getDb();
  await db.collection("logs").deleteMany({});
}

module.exports = {
  insertLog,
  getAllLogs,
  clearAllLogs,
};
