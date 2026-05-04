const { getDb } = require("../core/db");

// fetch a user using their ID
async function getUserByOperatorId(operatorId) {
  const db = getDb();
  const doc = await db.collection("users").findOne({ operatorId });
  if (!doc) return null;

  return {
    operator_id: doc.operatorId,
    email: doc.email,
    password_hash: doc.passwordHash,
    password_salt: doc.passwordSalt,
    created_at: doc.createdAt,
  };
}

// lookup user by email address
async function getUserByEmail(email) {
  const db = getDb();
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

// register a new user in the system
async function createUser(operatorId, email, passwordHash, passwordSalt) {
  const db = getDb();
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

// swap out the password for an existing user
async function updateUserPassword(operatorId, passwordHash, passwordSalt) {
  const db = getDb();
  await db.collection("users").updateOne(
    { operatorId },
    { $set: { passwordHash, passwordSalt } }
  );
}

module.exports = {
  getUserByOperatorId,
  getUserByEmail,
  createUser,
  updateUserPassword,
};
