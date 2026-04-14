// psm-generator Cloud Functions entry point.
//
// Session 11 scope: reconcileStudentsWithWise (read-only).
// Session 11b adds:  assignToWise, sendStudentMessage (write path, gated
//                    on WISE_WRITE_ENABLED; redirect to DEV_TEST_RECIPIENT_EMAIL
//                    when the gate is false).
//
// No Firestore triggers (Session 15).

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions/v2");

const {
  ALL_WISE_SECRETS,
  WISE_WRITE_ENABLED,
  APP_BASE_URL,
  DEV_TEST_RECIPIENT_EMAIL,
  wiseConfig,
} = require("./config");
const { verifyCallerIsAdmin, verifyCallerIsTutor } = require("./auth");
const {
  userByIdentifierEmail,
  resolveWiseUserIdByEmail,
  ensureAdminChat,
  sendChatMessage,
} = require("./wise");

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

// ── Write-path helpers (shared between assignToWise + sendStudentMessage) ──
//
// Resolve the actual Wise user id to send to, applying the
// DEV_TEST_RECIPIENT_EMAIL redirect when WISE_WRITE_ENABLED is false.
//
// Behavior matrix:
//   WISE_WRITE_ENABLED=true  →  send to the real student. Student's email is
//                               resolved via Wise; result is cached on the
//                               student doc as `wiseUserId` on first resolve.
//   WISE_WRITE_ENABLED=false →  send to DEV_TEST_RECIPIENT_EMAIL. Student's
//                               `wiseUserId` is NOT cached (we didn't actually
//                               look up the student). The real student record
//                               is never touched on Wise in this mode.
//
// If the gate is false and DEV_TEST_RECIPIENT_EMAIL is blank/unresolvable,
// this throws — we refuse to fail-open onto a real student.
//
// Returns: { wiseUserId, mode: "real" | "dev-redirect", redirectedFrom? }
async function resolveRecipient(cfg, studentDoc) {
  const writeEnabled = WISE_WRITE_ENABLED.value() === true;

  if (!writeEnabled) {
    const devEmail = (DEV_TEST_RECIPIENT_EMAIL.value() || "").trim().toLowerCase();
    if (!devEmail) {
      throw new HttpsError(
        "failed-precondition",
        "WISE_WRITE_ENABLED is false and DEV_TEST_RECIPIENT_EMAIL is not set. " +
        "Refusing to send to the real student."
      );
    }
    const devWiseId = await resolveWiseUserIdByEmail(cfg, devEmail);
    if (!devWiseId) {
      throw new HttpsError(
        "failed-precondition",
        `DEV_TEST_RECIPIENT_EMAIL ${devEmail} was not found on Wise. ` +
        "Cannot redirect dev-mode Wise write."
      );
    }
    return {
      wiseUserId: devWiseId,
      mode: "dev-redirect",
      redirectedFrom: ((studentDoc && studentDoc.meta && studentDoc.meta.email) || "").toLowerCase() || null,
    };
  }

  // Real send. Use cached wiseUserId if present on the student doc, else
  // look up by email and let the caller write the cache back.
  if (studentDoc && studentDoc.wiseUserId) {
    return { wiseUserId: studentDoc.wiseUserId, mode: "real" };
  }
  const email = (studentDoc && studentDoc.meta && studentDoc.meta.email || "").trim().toLowerCase();
  if (!email) {
    throw new HttpsError(
      "failed-precondition",
      "Student has no email on file; cannot resolve Wise user."
    );
  }
  const wiseUserId = await resolveWiseUserIdByEmail(cfg, email);
  if (!wiseUserId) {
    throw new HttpsError(
      "not-found",
      `No Wise user found for ${email}.`
    );
  }
  return { wiseUserId, mode: "real" };
}

// ── assignToWise ──────────────────────────────────────────────────────────
//
// Tutor-only. Given { studentId, assignmentId }, posts a Wise chat message
// to the student's admin (INSTITUTE) chat with a deep link back into the
// portal. Idempotent at the chat level (reuses an existing admin chat if
// one exists); NOT idempotent at the message level (calling twice sends two
// messages, by design — a tutor re-assigning a worksheet should produce a
// fresh nudge).
//
// Dev-mode behavior: when WISE_WRITE_ENABLED=false, the recipient is
// redirected to DEV_TEST_RECIPIENT_EMAIL. Real student records on Wise are
// never touched. See `resolveRecipient` above.
//
// Returns: { ok: true, mode, chatId, messageId, reusedChat, deepLink }
exports.assignToWise = onCall(
  {
    region: "us-central1",
    secrets: ALL_WISE_SECRETS,
    maxInstances: 5,
    timeoutSeconds: 60,
  },
  async (request) => {
    await verifyCallerIsTutor(request);

    const { studentId, assignmentId } = request.data || {};
    if (!studentId || typeof studentId !== "string") {
      throw new HttpsError("invalid-argument", "studentId is required.");
    }
    if (!assignmentId || typeof assignmentId !== "string") {
      throw new HttpsError("invalid-argument", "assignmentId is required.");
    }

    const cfg = wiseConfig();
    const db = admin.firestore();
    const studentRef = db.collection("students").doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      throw new HttpsError("not-found", `Student ${studentId} not found.`);
    }
    const student = studentSnap.data() || {};

    // Locate the assignment inline on the student doc. Phase 2 keeps
    // assignments in a `student.assignments[]` array (see app.jsx). The
    // display title is synthesized from date + worksheet count since an
    // assignment can bundle multiple worksheets.
    const assignments = Array.isArray(student.assignments) ? student.assignments : [];
    const assignment = assignments.find((a) => a && a.id === assignmentId);
    if (!assignment) {
      throw new HttpsError(
        "not-found",
        `Assignment ${assignmentId} not found on student ${studentId}.`
      );
    }
    const wsCount = Array.isArray(assignment.worksheets) ? assignment.worksheets.length : 0;
    const firstTitle = (wsCount > 0 && assignment.worksheets[0] && assignment.worksheets[0].title) || "";
    const title = wsCount <= 1
      ? (firstTitle || `assignment ${assignment.date || ""}`.trim())
      : `${firstTitle} + ${wsCount - 1} more`;

    const recipient = await resolveRecipient(cfg, student);

    // Cache wiseUserId on the student doc ONLY in real mode and ONLY if we
    // just resolved it (not already cached). Dev-redirect never writes back.
    if (recipient.mode === "real" && !student.wiseUserId) {
      await studentRef.update({ wiseUserId: recipient.wiseUserId });
    }

    const { chatId, reused } = await ensureAdminChat(cfg, recipient.wiseUserId);

    const baseUrl = (APP_BASE_URL.value() || "").replace(/\/+$/, "");
    const deepLink = `${baseUrl}/?a=${encodeURIComponent(assignmentId)}&s=${encodeURIComponent(studentId)}`;
    const body = `New worksheet: ${title}. Start: ${deepLink}`;

    const messageId = await sendChatMessage(cfg, chatId, body);

    logger.info("assignToWise: sent", {
      studentId,
      assignmentId,
      mode: recipient.mode,
      redirectedFrom: recipient.redirectedFrom || null,
      chatId,
      reusedChat: reused,
      messageId,
    });

    return {
      ok: true,
      mode: recipient.mode,
      chatId,
      messageId,
      reusedChat: reused,
      deepLink,
    };
  }
);

// ── sendStudentMessage ────────────────────────────────────────────────────
//
// Tutor-only. Thin wrapper around Wise sendMessage for ad-hoc tutor notes.
// Same dev-mode redirect as assignToWise — per Session 11b decision #2,
// both functions apply the DEV_TEST_RECIPIENT_EMAIL override symmetrically.
//
// Returns: { ok: true, mode, chatId, messageId, reusedChat }
exports.sendStudentMessage = onCall(
  {
    region: "us-central1",
    secrets: ALL_WISE_SECRETS,
    maxInstances: 5,
    timeoutSeconds: 60,
  },
  async (request) => {
    await verifyCallerIsTutor(request);

    const { studentId, text } = request.data || {};
    if (!studentId || typeof studentId !== "string") {
      throw new HttpsError("invalid-argument", "studentId is required.");
    }
    if (!text || typeof text !== "string" || !text.trim()) {
      throw new HttpsError("invalid-argument", "text is required.");
    }
    if (text.length > 4000) {
      throw new HttpsError("invalid-argument", "text exceeds 4000 chars.");
    }

    const cfg = wiseConfig();
    const db = admin.firestore();
    const studentRef = db.collection("students").doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      throw new HttpsError("not-found", `Student ${studentId} not found.`);
    }
    const student = studentSnap.data() || {};

    const recipient = await resolveRecipient(cfg, student);

    if (recipient.mode === "real" && !student.wiseUserId) {
      await studentRef.update({ wiseUserId: recipient.wiseUserId });
    }

    const { chatId, reused } = await ensureAdminChat(cfg, recipient.wiseUserId);
    const messageId = await sendChatMessage(cfg, chatId, text);

    logger.info("sendStudentMessage: sent", {
      studentId,
      mode: recipient.mode,
      redirectedFrom: recipient.redirectedFrom || null,
      chatId,
      reusedChat: reused,
      messageId,
    });

    return {
      ok: true,
      mode: recipient.mode,
      chatId,
      messageId,
      reusedChat: reused,
    };
  }
);
