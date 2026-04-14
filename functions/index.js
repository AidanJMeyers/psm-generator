// psm-generator Cloud Functions entry point.
//
// Session 11 scope: Wise API proxy, read-only first deploy.
// Only reconcileStudentsWithWise is exported. assignToWise and
// sendStudentMessage are intentionally NOT exported until the
// "Send a Message" Postman shape is confirmed and Kiran reviews
// the read-only reconcile report.
//
// No Firestore triggers (Session 15).

const admin = require("firebase-admin");
const { onCall } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions/v2");

const { ALL_WISE_SECRETS, wiseConfig } = require("./config");
const { verifyCallerIsAdmin } = require("./auth");
const { userByIdentifierEmail } = require("./wise");

admin.initializeApp();

// ── reconcileStudentsWithWise ─────────────────────────────────────────────
//
// Admin-only. Walks every /students/{id} doc, reads meta.email, and for
// each student hits Wise `userByIdentifier?provider=EMAIL` to answer:
// does this student exist in Wise, and if so does the email on the Wise
// user record match the email we sent?
//
// Read-only. Never writes to Firestore, never writes to Wise. Produces a
// report the caller reviews by hand; Kiran decides what to do about each
// gap (create the Wise user manually, fix the email on our side, etc.).
//
// Not auto-run on a schedule — invoked manually by an admin via the
// client-side `lib/wise.js` wrapper (to be added in a follow-up step).
//
// Rate limit: 500 calls/min per Wise API key. With ~51 students the
// sequential loop finishes in a few seconds; no throttling required.
//
// Returns:
//   {
//     totals: { students, withEmail, matched, unmatched, emailMismatched, errors },
//     students: [
//       {
//         studentId, name, email,
//         status: "matched" | "unmatched" | "email-mismatched" | "no-email" | "error",
//         wiseUserId?, wiseEmail?, errorMessage?
//       }, ...
//     ],
//     runAt: ISO timestamp,
//   }

exports.reconcileStudentsWithWise = onCall(
  {
    region: "us-central1",
    secrets: ALL_WISE_SECRETS,
    // Hard concurrency cap: this function is invoked by hand, never in a
    // hot loop. maxInstances:1 also prevents a runaway from fanning out.
    maxInstances: 1,
    timeoutSeconds: 300,
  },
  async (request) => {
    await verifyCallerIsAdmin(request);

    const cfg = wiseConfig();
    const db = admin.firestore();
    const snap = await db.collection("students").get();

    const results = [];
    const totals = {
      students: snap.size,
      withEmail: 0,
      matched: 0,
      unmatched: 0,
      emailMismatched: 0,
      noEmail: 0,
      errors: 0,
    };

    for (const doc of snap.docs) {
      const d = doc.data() || {};
      const name = d.name || "(unnamed)";
      const rawEmail = (d.meta && d.meta.email) || "";
      const email = rawEmail.trim().toLowerCase();

      if (!email) {
        totals.noEmail++;
        results.push({
          studentId: doc.id,
          name,
          email: "",
          status: "no-email",
        });
        continue;
      }

      totals.withEmail++;

      try {
        const lookup = await userByIdentifierEmail(cfg, email);
        if (!lookup.found) {
          totals.unmatched++;
          results.push({
            studentId: doc.id,
            name,
            email,
            status: "unmatched",
          });
          continue;
        }

        const wiseEmail = (lookup.user.email || "").trim().toLowerCase();
        if (wiseEmail && wiseEmail !== email) {
          totals.emailMismatched++;
          results.push({
            studentId: doc.id,
            name,
            email,
            status: "email-mismatched",
            wiseUserId: lookup.user._id,
            wiseEmail: lookup.user.email,
          });
          continue;
        }

        totals.matched++;
        results.push({
          studentId: doc.id,
          name,
          email,
          status: "matched",
          wiseUserId: lookup.user._id,
          wiseEmail: lookup.user.email,
        });
      } catch (err) {
        totals.errors++;
        logger.error("reconcile: wise lookup failed", {
          studentId: doc.id,
          email,
          error: err.message,
        });
        results.push({
          studentId: doc.id,
          name,
          email,
          status: "error",
          errorMessage: err.message,
        });
      }
    }

    logger.info("reconcile: complete", totals);

    return {
      totals,
      students: results,
      runAt: new Date().toISOString(),
    };
  }
);
