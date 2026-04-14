// Server-side allowlist check for HTTPS callables.
//
// Mirrors the Firestore rules exactly (firestore.rules §Identity helpers):
//   - request.auth must exist
//   - request.auth.token.email_verified must be true
//   - /allowlist/{lowercased email} must exist and have active == true
//   - role must match the required role
//
// These functions throw HttpsError so onCall returns a clean error payload
// to the client instead of a 500.

const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");

async function loadAllowlistEntry(request) {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  if (auth.token.email_verified !== true) {
    throw new HttpsError("permission-denied", "Email not verified.");
  }
  const email = (auth.token.email || "").toLowerCase();
  if (!email) {
    throw new HttpsError("permission-denied", "No email on token.");
  }
  const snap = await admin.firestore().collection("allowlist").doc(email).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "Not on allowlist.");
  }
  const data = snap.data();
  if (data.active !== true) {
    throw new HttpsError("permission-denied", "Allowlist entry inactive.");
  }
  return { email, role: data.role, studentIds: data.studentIds || [] };
}

async function verifyCallerIsTutor(request) {
  const entry = await loadAllowlistEntry(request);
  if (entry.role !== "tutor" && entry.role !== "admin") {
    throw new HttpsError("permission-denied", "Tutor or admin role required.");
  }
  return entry;
}

async function verifyCallerIsAdmin(request) {
  const entry = await loadAllowlistEntry(request);
  if (entry.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin role required.");
  }
  return entry;
}

module.exports = { verifyCallerIsTutor, verifyCallerIsAdmin };
