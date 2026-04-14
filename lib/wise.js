// Client-side wrapper around the Wise Cloud Functions.
//
// Phase 3 Session 11b. This file is intentionally NOT imported from
// app.jsx yet — Session 16 wires it into the tutor UI. Shipping it now
// so the contract is pinned and reviewable alongside the server code.
//
// Usage (once index.html loads firebase-functions-compat.js — see below):
//
//   import { reconcileStudentsWithWise, assignToWise, sendStudentMessage }
//     from "./lib/wise.js";
//
//   const report = await reconcileStudentsWithWise();
//   const r = await assignToWise({ studentId, assignmentId });
//   await sendStudentMessage({ studentId, text: "Hi!" });
//
// Depends on:
//   - firebase-app-compat.js       (already loaded in index.html)
//   - firebase-auth-compat.js      (already loaded in index.html)
//   - firebase-functions-compat.js (NOT yet loaded; lazy-loaded on first
//                                   call below so Session 11b does not
//                                   have to touch index.html)
//
// When Session 16 wires this into the UI, index.html should add the
// compat functions SDK script tag statically:
//
//   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-functions-compat.js"></script>
//
// and the lazy-load branch below becomes a no-op.
//
// Region: us-central1 (matches functions/ deploy region).

const FUNCTIONS_REGION = "us-central1";
const COMPAT_FUNCTIONS_SDK_URL =
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions-compat.js";

let _loadingPromise = null;

function ensureFunctionsSdkLoaded() {
  if (typeof window === "undefined" || !window.firebase) {
    return Promise.reject(new Error("lib/wise.js: firebase compat SDK is not loaded."));
  }
  if (typeof window.firebase.functions === "function") {
    return Promise.resolve();
  }
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = COMPAT_FUNCTIONS_SDK_URL;
    s.async = true;
    s.onload = () => {
      if (typeof window.firebase.functions === "function") {
        resolve();
      } else {
        reject(new Error("lib/wise.js: functions SDK loaded but firebase.functions is missing."));
      }
    };
    s.onerror = () => reject(new Error("lib/wise.js: failed to load firebase-functions-compat.js"));
    document.head.appendChild(s);
  });
  return _loadingPromise;
}

async function callable(name) {
  await ensureFunctionsSdkLoaded();
  const fns = window.firebase.app().functions(FUNCTIONS_REGION);
  return fns.httpsCallable(name);
}

// Admin-only. Read-only report. See functions/index.js §reconcileStudentsWithWise.
export async function reconcileStudentsWithWise() {
  const fn = await callable("reconcileStudentsWithWise");
  const { data } = await fn({});
  return data;
}

// Tutor-only. Sends a deep-link worksheet message to a student's Wise
// admin chat. When server-side WISE_WRITE_ENABLED=false the recipient is
// transparently redirected to DEV_TEST_RECIPIENT_EMAIL — the response
// `mode` field reports which path ran ("real" vs "dev-redirect").
//
// params: { studentId: string, assignmentId: string }
// returns: { ok, mode, chatId, messageId, reusedChat, deepLink }
export async function assignToWise({ studentId, assignmentId }) {
  if (!studentId) throw new Error("assignToWise: studentId required");
  if (!assignmentId) throw new Error("assignToWise: assignmentId required");
  const fn = await callable("assignToWise");
  const { data } = await fn({ studentId, assignmentId });
  return data;
}

// Tutor-only. Ad-hoc message to a student's Wise admin chat. Same
// dev-redirect behavior as assignToWise.
//
// params: { studentId: string, text: string }
// returns: { ok, mode, chatId, messageId, reusedChat }
export async function sendStudentMessage({ studentId, text }) {
  if (!studentId) throw new Error("sendStudentMessage: studentId required");
  if (!text || !text.trim()) throw new Error("sendStudentMessage: text required");
  const fn = await callable("sendStudentMessage");
  const { data } = await fn({ studentId, text });
  return data;
}
