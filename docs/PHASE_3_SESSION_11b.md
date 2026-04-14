# Phase 3 — Session 11b: Wise write-path Cloud Functions

**Date:** 2026-04-14
**Session type:** Follow-up to Session 11. Narrow scope: ship the two write-path HTTPS callables that Session 11 deferred.
**Parent docs:** [PHASE_3_SESSION_11.md](PHASE_3_SESSION_11.md) · [PHASE_3_SPEC.md](PHASE_3_SPEC.md) §"Wise API integration"
**Outcome:** `assignToWise` and `sendStudentMessage` deployed as v2 HTTPS callables in `us-central1`. First real Wise writes against the `DEV_TEST_RECIPIENT_EMAIL` redirect landed cleanly — three messages arrived in Kiran's own Wise chat (two worksheet deep-links, one ad-hoc note) within one minute of each other. `WISE_WRITE_ENABLED` is still `false` at session close; the flip happens when Kiran is ready to hit a real student.

---

## What shipped

### Function surface (deployed, live)

| Function | Type | Status | Notes |
|---|---|---|---|
| `assignToWise` | v2 HTTPS callable, tutor-only | **Live in us-central1** | Loads student + inline assignment, resolves Wise recipient (real student or dev-redirect depending on `WISE_WRITE_ENABLED`), ensures an admin chat via scan-then-create, posts deep-link message. Caches `wiseUserId` on `students/{id}` only on successful real-mode resolve. |
| `sendStudentMessage` | v2 HTTPS callable, tutor-only | **Live in us-central1** | Thin wrapper around `sendChatMessage`. Same dev-redirect behavior as `assignToWise`. |
| `reconcileStudentsWithWise` | v2 HTTPS callable, admin-only | **Unchanged** | Session 11. Not touched this session. |

### Files modified

- [functions/wise.js](../functions/wise.js) — added `resolveWiseUserIdByEmail`, `listAllChats`, `createAdminChat`, `ensureAdminChat`, `sendChatMessage`. Existing `userByIdentifierEmail` untouched. Reconcile still uses its inline call site from Session 11.
- [functions/index.js](../functions/index.js) — added `resolveRecipient` helper + two new `onCall` exports. Reconcile export untouched.
- [lib/wise.js](../lib/wise.js) — **new file.** Client-side wrapper exporting `reconcileStudentsWithWise`, `assignToWise`, `sendStudentMessage`. Lazy-loads `firebase-functions-compat.js` on first call so `index.html` does not need to change this session. **Not imported from `app.jsx`** — Session 16 wires it in.
- [docs/wise_postman.md](wise_postman.md) — the "Admin Only Chat with Student" and "Send a Message" entries were missing from this file during Session 11; Kiran pasted them into the session at kickoff and they are the canonical wire-format reference for the write path going forward.

### Files intentionally NOT touched

- `reconcileStudentsWithWise` — per kickoff
- `firestore.rules` — `assignToWise` writes `wiseUserId` via admin SDK which bypasses rules
- `firebase.json` — no new hosting rewrites; the client wrapper calls via `httpsCallable` directly
- `index.html` — functions-compat SDK script tag deferred to Session 16 (lazy-loaded instead)
- `app.jsx` — Session 16 wires the wrapper into the tutor UI
- `worksheets_catalog.json`, `build_index.py` — out of scope

## Wise endpoints hit for the first time

Three endpoints made their first real calls against `api.wiseapp.live` this session:

1. **`GET /institutes/{institute_id}/chats?chatSection=all_chats`** — `listAllChats`, called inside `ensureAdminChat` to scan for a pre-existing admin chat with the target user. Response shape matched the Postman example exactly. `chatWithId` is an **object** on list responses (`{_id, name, profile, profilePicture}`) whereas it's a bare string on create/get-by-id responses — `ensureAdminChat` handles both.

2. **`POST /institutes/{institute_id}/chats`** (body `{chatType: "INSTITUTE", chatWithId}`) — `createAdminChat`. First real call created chat `69de9c5798ee51775f230596` for `kshay@` (dev-redirect target). Response shape matched exactly; returned `data.chat._id` as documented.

3. **`POST /institutes/{institute_id}/chats/{chatId}/messages`** (body `{message}`) — `sendChatMessage`. Three messages sent during testing:
   - `69de9c57bf5dacc1479bc5e0` — worksheet deep link (first `assignToWise` call, fresh chat)
   - (second `assignToWise` call, `reusedChat: true`, new messageId) — idempotency proof
   - `sendStudentMessage` ad-hoc test note

All three returned `data.chatMessage._id` in the shape documented in `wise_postman.md`. No surprises.

## Dev-mode recipient override — the test that actually mattered

The kickoff's hard requirement was that calling `assignToWise` with `WISE_WRITE_ENABLED=false` and a real `studentId` must **not** touch the student's actual Wise record. Verified empirically:

**Test call 1:**
```js
const r = await firebase.app().functions("us-central1")
  .httpsCallable("assignToWise")({ studentId: "rnbw56f5", assignmentId: "s62qx0bh" });
```

**Returned:**
```js
{
  ok: true,
  mode: "dev-redirect",
  chatId: "69de9c5798ee51775f230596",
  messageId: "69de9c57bf5dacc1479bc5e0",
  reusedChat: false,
  deepLink: "https://psm-generator.web.app/?a=s62qx0bh&s=rnbw56f5"
}
```

**Observed in Wise (kshay@ account, at 03:58 PM):**
```
New worksheet: ComInfoIdeas-Easy (10Qs). Start: https://psm-generator.web.app/?a=s62qx0bh&s=rnbw56f5
```

Message landed in an admin-only chat on Kiran's own account. The real student (`rnbw56f5`) was never touched on Wise — the `mode: "dev-redirect"` field on the response is the contract that confirms this, and the server-side `resolveRecipient` path that produces it never calls `userByIdentifierEmail` against the student's email when the gate is false.

**Test call 2 (idempotency):** re-ran the same `assignToWise` call. A second worksheet message arrived at 03:59 PM in the same chat — `chatId` stayed `69de9c5798ee51775f230596`, `reusedChat` flipped to `true`, new `messageId`. Idempotency at the chat level verified; message-level non-idempotency is by design.

**Test call 3 (`sendStudentMessage`):** ad-hoc `"Test note from sendStudentMessage (dev-redirect)"` → third message in the same chat at 03:59 PM. Same recipient redirect, same chat reuse.

Title synthesis for the deep-link message produced `"ComInfoIdeas-Easy (10Qs)"` — that's the first-worksheet-title-only path since this particular assignment had exactly one worksheet. The multi-worksheet branch (`"<first title> + N more"`) was NOT exercised by the live test; if tutors typically assign multi-worksheet bundles, Session 16 should retest before rollout.

## No surprises vs. the Postman doc

Unlike Session 11, Session 11b had zero infrastructure surprises and zero wire-format surprises. Everything behaved as documented. Reasons this session was cheap:

1. **Infra was pre-debugged.** Compute SA grants, org-policy override, Artifact Registry cleanup policy — all landed in Session 11 and persisted. The only per-function work this session was two `gcloud run services add-iam-policy-binding allUsers → run.invoker` calls after deploy, exactly as Session 11 §Infrastructure surprises #1 predicted.

2. **Postman entries were complete.** Kiran pasted the missing "Send a Message" and "Admin Only Chat with Student" entries into the session at the first checkpoint. Both shapes matched the live API response byte-for-byte. No guessing.

3. **Reconcile provided a proven Wise client.** `wiseHeaders`, `basicAuthHeader`, and the namespace/user-agent conventions were already validated by Session 11's 50/50 reconcile run. The new write-path functions reuse the exact same headers — no auth debugging needed.

4. **Tight scope.** 11b did one thing: two new onCall exports behind an explicit gate. No refactors, no infra work, no UI work.

Deploy took ~2 minutes. First real Wise write arrived in chat ~30 seconds after that. End-to-end session time was dominated by the wait for Kiran's manual verification in the Wise UI, not by code or debugging.

## State of `WISE_WRITE_ENABLED` at session close

**Still `false`.** This is deliberate per kickoff:

> The flip happens only after Kiran has tested `assignToWise` against the dev recipient and confirmed the Wise message arrives correctly.

Kiran has now done that. The flip is still Kiran's decision and still not tied to this session — when he's ready to hit a real student (probably as part of Session 17 rollout, or a smaller one-off test against a trusted student), the flip is a single `functions/.env` edit (`WISE_WRITE_ENABLED=true`) followed by `firebase deploy --only functions:assignToWise,functions:sendStudentMessage`. No code changes.

**Until then, every `assignToWise`/`sendStudentMessage` call in production — whether from DevTools, Session 16's tutor button, or anywhere else — will silently redirect to `kshay@affordabletutoringsolutions.org`.** This is the correct posture for Sessions 12–16, which will need to exercise the write path repeatedly during development without spamming real students.

## Caching posture

- `assignToWise` writes `wiseUserId` to `students/{id}` **only** when `mode === "real"` and the field is not already present on the doc.
- In dev-redirect mode, no student docs are touched at all.
- Reconcile still never writes `wiseUserId` — only the write-path functions do. This means the 50 students Session 11 successfully matched are still uncached on the student doc, and `assignToWise` will do a one-time `userByIdentifierEmail` lookup per student the first time it's called in real mode.
- One-time cost: 50 Wise lookups amortized across the first 50 real `assignToWise` calls. No bulk pre-cache job.

This is cheaper than a pre-cache pass and keeps the data path simple. If the one-time lookup cost turns out to matter (unlikely at 51 students), Session 17 rollout can add a `cacheStudentsToWise` admin-only callable that does a bulk pre-cache. Not recommended unless observed latency becomes a problem.

## Follow-ups

Most of Session 11's follow-ups are unchanged. This session adds:

1. **[low priority, Session 16] Retest multi-worksheet title synthesis.** The live test covered the single-worksheet branch only. Multi-worksheet bundles produce `"<first title> + N more"` — visually inspect one before shipping to real students.

2. **[low priority, Session 17] Consider a `cacheStudentsToWise` bulk admin-only callable.** Only if the one-time lookup cost of `assignToWise`'s first call per student becomes observable. Otherwise skip.

3. **[Session 16 prep] Add `firebase-functions-compat.js` script tag to `index.html`.** The lazy-load path in `lib/wise.js` works but a static script tag is cleaner and removes a first-call latency hit.

4. **[unchanged from Session 11] Node 20 runtime deprecation 2026-04-30.** Any session that redeploys `functions/` after 2026-04-30 should bump `engines.node` to `"22"` first. This session's deploy emitted the warning but did not act on it.

5. **[unchanged from Session 11] Custom domain `portal.affordabletutoringsolutions.org`.** Still the recommended mini-session before Session 13 — `APP_BASE_URL` is currently `https://psm-generator.web.app` and that string is now embedded in every Wise deep-link message ever sent. Cheaper to change the domain once before Session 13 than to explain two different URLs to students later. **Two deep-link messages with the current URL already exist in Kiran's own Wise chat from this session's testing; any tutors/students who see them later will need to be told these were test sends.**

## Checkpoint

Session 11b is complete when:

- [x] `functions/wise.js` extended with `listAllChats`, `ensureAdminChat`, `sendChatMessage`, `resolveWiseUserIdByEmail`
- [x] `assignToWise` onCall deployed to `us-central1`, `allUsers → run.invoker` granted
- [x] `sendStudentMessage` onCall deployed to `us-central1`, `allUsers → run.invoker` granted
- [x] `lib/wise.js` client wrapper created (not wired into `app.jsx`)
- [x] First real `assignToWise` call returned `mode: "dev-redirect"` and the message landed in Kiran's own Wise chat, correctly formatted, with a working deep link
- [x] Idempotency verified: second `assignToWise` call reused the existing admin chat (`reusedChat: true`)
- [x] `sendStudentMessage` verified end-to-end with the same dev-redirect behavior
- [x] `WISE_WRITE_ENABLED=false` at session close — no real student has ever been touched by psm-generator on Wise
- [x] This doc committed to the repo

---

## What comes next

Two parallel options, Kiran's pick:

### Option A — Session 12 (extraction + audit + PDF migration)

Per [PHASE_3_SPEC.md §Session table](PHASE_3_SPEC.md), Session 12 ships:

- `scripts/extract_answer_keys.mjs` — Node + `pdftotext` parser that walks the OneDrive `KEY_*.pdf` files and produces the `questionKeys/{id}` collection
- `scripts/audit_catalog.mjs` — reports which catalog entries have/lack extractable keys, flags shape anomalies (e.g., Full Length Exams may not fit the per-question model cleanly)
- `scripts/migrate_stu_pdfs.mjs` — uploads every matched `STU_*.pdf` to Firebase Storage and rewrites `worksheets_catalog.json` with the new `stu` URLs plus `questionIds` + `answerFormat`
- Audit report at `docs/PHASE_3_CATALOG_AUDIT.md`

**Dependencies on 11b: zero.** All local-node + admin SDK work. Can start immediately.

### Option B — Custom domain mini-session

Point `portal.affordabletutoringsolutions.org` at Firebase Hosting before Session 13's `signInWithEmailLink` work locks in a URL in every future auth email. Scope:

- Add A records at Hostinger pointing to Firebase Hosting's IPs
- Verify the domain in the Firebase console
- Wait for Let's Encrypt cert (~15 min)
- Update `functions/.env` `APP_BASE_URL=https://portal.affordabletutoringsolutions.org`
- Redeploy `assignToWise`, `sendStudentMessage`, and reconcile (config-only, no code changes)
- Smoke test: `assignToWise` deep-link now uses the new host

**Recommendation: Option B first, then Session 12.** Session 12 is big and open-ended; Option B is narrow and has a hard timing reason to happen before Session 13. Doing B first also means Session 12 runs against the stable URL, not the `web.app` placeholder.

Kickoff prompts for both are below. Pick one, `/clear`, paste the block.

---

### Kickoff prompt for the custom domain mini-session

> Copy the block below into a fresh Claude Code session after `/clear`.

---

I'm ready to do the **custom domain mini-session** for psm-generator before Session 12. Scope is narrow: point `portal.affordabletutoringsolutions.org` at Firebase Hosting, update `APP_BASE_URL` in `functions/.env`, redeploy the three Wise callables (no code changes), and smoke test that `assignToWise`'s deep link now uses the new host. Reasoning is in `docs/PHASE_3_SESSION_11b.md` §Follow-ups #5 and `docs/PHASE_3_SESSION_11.md` §Follow-ups #2.

**Confirm today's date with me at session start before doing anything else.**

### Read these in order

1. **`docs/PHASE_3_SESSION_11b.md`** — §Follow-ups #5 and §"What comes next" Option B
2. **`docs/PHASE_3_SESSION_11.md`** — §Follow-ups #2 for the full rationale
3. **`functions/.env`** — the one-line `APP_BASE_URL` edit target

### What the session does

1. I ask Kiran to log into Hostinger and grab the Firebase Hosting IPs from the Firebase console.
2. I walk Kiran through the A record setup on Hostinger (Claude cannot do this — DNS edits are human-only).
3. We wait for DNS propagation + Let's Encrypt cert. Kiran confirms in the Firebase console when the domain is "Connected."
4. I edit `functions/.env` → `APP_BASE_URL=https://portal.affordabletutoringsolutions.org`.
5. I redeploy `reconcileStudentsWithWise`, `assignToWise`, `sendStudentMessage`.
6. Kiran runs the same DevTools `assignToWise({studentId: "rnbw56f5", assignmentId: "s62qx0bh"})` call from Session 11b's testing. Expected: fourth message in Kiran's Wise chat with the new host in the deep link.

### What NOT to do

- **Do NOT flip `WISE_WRITE_ENABLED=true`.** Still gated. Still dev-redirect.
- **Do NOT touch `index.html` to set a canonical link or similar.** Session 13 owns that.
- **Do NOT change any function code.** This session is config-only.

### Pause at

- **Before Kiran edits DNS** — confirm the exact A records to add, TTL, which hostname.
- **Before redeploy** — confirm Firebase console shows the domain as "Connected" with a valid cert.
- **After redeploy + first test call** — confirm the deep link in Kiran's Wise chat uses the new domain.

### Close out

Write `docs/PHASE_3_CUSTOM_DOMAIN.md` capturing the DNS setup, the deploy, the smoke test result, and the kickoff prompt for Session 12.

### Constraints carrying forward

- **No slop.** Honest, verified claims.
- **psm-generator commit override applies:** Claude may commit + push directly with short user-voice messages, no Co-Authored-By.
- **Every new function must do its own Firebase Auth check internally** — moot for this session since no new functions, but still carrying forward.

---

### Kickoff prompt for Session 12

> Copy the block below into a fresh Claude Code session after `/clear`.

---

I'm ready to start **Phase 3 Session 12** of psm-generator: extraction + audit + PDF migration. This is the first Session 11–independent session of Phase 3 — all Node-side scripting + admin SDK, no new Cloud Functions, no client changes. Session 11 and 11b shipped the Wise read + write path; 12 builds the data layer that auto-grading (Session 15) will actually join against.

**Confirm today's date with me at session start before doing anything else.**

### Read these in order

1. **`docs/PHASE_3_SPEC.md`** — §"Worksheet data model" and §"Auto-grading design" for the shape `questionKeys/{id}` must take and the join bridge (`worksheets_catalog.json.questionIds[i]` ↔ `responses[i]` ↔ `questionKeys/{id}`).
2. **`docs/PHASE_3_SESSION_11b.md`** — not load-bearing but shows the current state of `functions/` and the gate posture, useful context.
3. **`worksheets_catalog.json`** — current catalog shape, which entries have `stu` vs `key` URLs and which are still `[LINK PENDING]`.
4. **`build_index.py`** — how the catalog is currently built; Session 12's rewrite needs to stay compatible with this script.

### What Session 12 ships

- **`scripts/extract_answer_keys.mjs`** — Node script, uses `pdftotext` via `child_process.spawn`. Walks every `KEY_*.pdf` referenced in `worksheets_catalog.json`, extracts per-question answers, uploads to `questionKeys/{questionId}`. Produces a stable `questionId` naming scheme that the catalog can reference. MC answers A/D, free-response numerics, mixed-format worksheets all handled.
- **`scripts/audit_catalog.mjs`** — walks the catalog + the extraction output, produces a report of: (a) worksheets with successful extraction, (b) worksheets where the PDF parsed but answers didn't fit the expected shape (Full Length Exams are the expected pain point), (c) worksheets with missing PDFs. Writes `docs/PHASE_3_CATALOG_AUDIT.md`.
- **`scripts/migrate_stu_pdfs.mjs`** — uploads every matched `STU_*.pdf` to Firebase Storage at `worksheets/{slugified-title}.pdf`, rewrites `worksheets_catalog.json` `stu` field to the download URL.
- **Catalog rewrite** — `worksheets_catalog.json` gains `questionIds: [...]` and `answerFormat: "mc" | "fr" | "mixed"` per entry.
- **`questionKeys/{questionId}` collection** populated in Firestore.

### What NOT to do

- **Do NOT touch `functions/`.** Session 12 is pure Node scripting + admin SDK.
- **Do NOT touch `firestore.rules`.** Session 15 adds the rules delta for `questionKeys`; Session 12 writes via admin SDK which bypasses rules.
- **Do NOT migrate submissions or touch Phase 2's existing submission shape.** Session 14 owns the per-question `responses[]` shape migration.
- **Do NOT flip `WISE_WRITE_ENABLED`.** Orthogonal to this session.

### Pause at

- **Before writing any script** — confirm with Kiran: (a) where the OneDrive `KEY_*.pdf` files live on Kiran's local filesystem, (b) whether `pdftotext` is installed on his machine, (c) the expected `questionId` naming scheme.
- **After `extract_answer_keys.mjs` runs successfully on 5-10 sample worksheets** — Kiran reviews the extracted shape in the console before we commit to bulk upload.
- **Before `migrate_stu_pdfs.mjs` uploads to Firebase Storage** — Kiran reviews the planned target paths and any catalog shape changes.

### Close out

Write `docs/PHASE_3_SESSION_12.md` + `docs/PHASE_3_CATALOG_AUDIT.md`. Kickoff prompt for Session 13 (magic link + StudentPortal).

### Constraints carrying forward

- **No slop.**
- **psm-generator commit override applies.**
- **No bundler.**
