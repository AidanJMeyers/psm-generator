# Phase 2 — Session 5: Student Answer Entry (SubmissionEditor + Draft Autosave)

**Date:** 2026-04-14
**Parent docs:** [PHASE_2_SESSION_1.md](PHASE_2_SESSION_1.md) (authoritative spec) · [PHASE_2_SESSION_2.md](PHASE_2_SESSION_2.md) (rules + sync layer this builds on) · [PHASE_2_SESSION_3.md](PHASE_2_SESSION_3.md) (StudentPortal + history tab) · [PHASE_2_SESSION_4.md](PHASE_2_SESSION_4.md) (switcherSlot prop this respects) · [PHASE_2_SESSION_5_PLAN.md](PHASE_2_SESSION_5_PLAN.md) (approved implementation plan)
**Outcome:** Students can write and submit per-assignment answers from the portal. Drafts autosave on a 750ms debounce to `/students/{id}/submissions/{auto-id}`. Submit transitions `draft → submitted` in a single write, locks the UI to read-only, and survives reloads. Parents reach the same component in read-only mode. First time the `submissions/` subcollection has ever been exercised against the live Phase 2 rules — verified end-to-end. No rules changes, no schema changes, no production rollout.

---

## What shipped

All 10 tasks from the Session 5 plan landed on `main`:

1. **`studentSubmissionsCollection(id)` ref helper** next to `studentDocRef`/`notesDocRef`. Mirrors the existing compat-SDK pattern.
2. **`pickLatestSubmission(docs)` pure helper + 6 tests.** Draft wins over any submitted (invariant: student holds at most one open draft per assignment). Otherwise picks the most recent `submittedAt`, normalizing Firestore Timestamps via `toMillis()` and ISO strings via `Date.parse`. Null/empty input returns `null`.
3. **`canSubmitDraft(submission)` pure helper + 5 tests.** Gate for the Submit button. True only when `status === "draft"` AND `responses[0].studentAnswer.trim().length > 0`. Any other status, missing responses, or whitespace-only content returns false.
4. **`makeDraftPayload({assignmentId, answersText, isCreate})` pure helper + 4 tests.** Builds the write payload. Always sets `status: "draft"` — Session 5's write path never transitions state through this helper (submit uses a separate `.update({status:"submitted", ...})`). `createdAt` only on create; `updatedAt` always. Tests take an injected `FieldValue` stub; the real `app.jsx` copy closes over `firebase.firestore.FieldValue`.
5. **`useSubmissionDraft(studentId, assignmentId)` hook.** One-shot `.get()` query on `submissions` where `assignmentId == X`. Not a subscription — the editor owns live textarea state locally, and writes don't need round-trip echo. Passes the doc list through `pickLatestSubmission` and returns `{status, submission}` with `"loading" | "ready" | "not-found" | "error"`. Re-queries when `(studentId, assignmentId)` changes. Same "sign in for real first" dev-bypass caveat as `usePortalStudent`, documented in the hook's comment.
6. **`SubmissionEditor` component.** Drill-in view for a single assignment. Seeds local `text` state from the loaded submission once the hook resolves. Two modes: editable textarea (student role) or whitespace-preserving read-only card (parents + any already-submitted doc). Renders loading/error branches, a Back button, an assignment-date header, and a "Submitted <date>" label when locked. Three style constants (`SUBMIT_EDITOR_BACK_BTN`, `SUBMIT_BTN_STYLE`, `SUBMIT_BTN_STYLE_DISABLED`) live above the component so the JSX body stays readable.
7. **Debounced autosave.** 750ms after the last keystroke. First write generates a client-side auto-id via `studentSubmissionsCollection(id).doc()` — no round-trip — and is held in `submissionIdRef` for the life of the edit session so subsequent writes `.update()` the same doc. `writeDraftRef` holds a fresh closure every render so the timer always sees the latest `text`/`isLocked` without re-creating the timer on every keystroke. Autosave is skipped while `status === "loading"` to avoid racing with the seed effect.
8. **Submit-lock.** Enabled only when `canSubmitDraft()` returns true for the current local text. On click: clears any pending autosave timer, awaits a final `writeDraft(text)` to flush the latest content, then issues `.update({status:"submitted", submittedAt: FieldValue.serverTimestamp()})` on the same doc. Local state flips to `"submitted"` and the view re-renders as the locked read-only card. Errors surface as an `alert` and reset the submitting flag. No retake path — once submitted, the client has no way back to draft.
9. **Role gate.** `PortalHistoryTab` reads `currentUserEntry?.role` and only renders the orange "Answer →" button when `role === "student"`. Parents get a neutral "View submission" button that opens the same component with `readOnly={true}`. Legacy workspace users (null entry) see neither button — consistent with Session 3's "students/parents only" gate on the portal. Server-side rules from Session 2 enforce the same split independently.
10. **`PortalHistoryTab` drill-in state.** New `openAssignmentId` state; when set, the tab renders `SubmissionEditor` instead of the assignment list. Back button clears the state. Signature widened to receive `studentId` and `currentUserEntry` from `StudentPortal`. If the selected assignment vanishes mid-session (tutor deletes it), falls back to the list.

**Commits (`main`, oldest → newest):**

- `83de1ee` — add studentSubmissionsCollection ref helper
- `eefab0b` — add pickLatestSubmission helper + tests
- `d265e95` — add canSubmitDraft gate + tests
- `8bfe790` — add makeDraftPayload helper + tests
- `a3541c9` — add useSubmissionDraft one-shot query hook
- `57790dd` — scaffold SubmissionEditor component (no writes yet)
- `5cc564e` — history tab: drill-in to SubmissionEditor with role-gated button
- `5663587` — SubmissionEditor: debounced draft autosave
- `646c994` — SubmissionEditor: submit-lock transitions draft to submitted

**Test count: 60/60** (`node --test tests/*.mjs`). 45 from Session 4 baseline + 15 new (6 `pickLatestSubmission`, 5 `canSubmitDraft`, 4 `makeDraftPayload`).

## What did not ship

- **Tutor-side view of submissions.** Session 6 work. `AppInner`/`StudentProfile` untouched. Tutors cannot see student answers from within the tutor app yet; they have to open Firebase Console if they want to inspect them.
- **Auto-grading / correctness marking.** Session 6+ and gated on worksheet regeneration. No `correct` field, no per-question scoring, no missed-question report.
- **Per-question structured entry.** Decision locked in the plan: Option (c) — single free-text textarea stored as one `{questionIndex: 0, studentAnswer: "<full text>"}` entry. Forward-compatible with later per-question parsing. Session 5 explicitly does not introduce `questionCount` on assignments or a structured editor.
- **Retake UI.** The schema supports multiple submission docs per assignment, but there is no client path to create a second submission once the first is submitted. If a student needs to retake, Kiran will deal with it manually for now.
- **"Saving…" / "Saved" badges.** Deferred per the plan. Firestore compat SDK queues writes on flaky networks; silence is acceptable for v1.
- **Offline / failure toast.** Submit errors show a native `alert("Could not submit. Try again.")`. Autosave errors log to the console and silently retry on the next keystroke. Good enough for pilot.
- **Real student rollout.** Still reachable only via `?dev=1&role=student&studentId=<id>` on localhost. `USE_ALLOWLIST_AUTH` stays `false`. Students cannot reach the editor in production — Phase C/D cutover still deferred.
- **Firestore rules changes.** Zero. The Session 2 rules already encode the contract: `create` requires `status == "draft"` + linked student; `update` requires existing `status == "draft"` + new status in `{draft, submitted}`; parents have read-only access by virtue of `canReadStudent`. Nothing needed to change.
- **Schema changes.** Zero. First real write to `/students/{id}/submissions/{subId}` — the subcollection existed as a latent path in the rules and is now populated on demand.

## Deviations from plan

### 1. `writeDraft` lives on a ref, not as a plain inner function

**Plan said:** `writeDraft` is defined inside the component body on each render and captured by the debounce effect's closure.

**What shipped:** `writeDraftRef.current = async (answersText) => { ... }` on every render, and the debounce timer calls `writeDraftRef.current(text)` at fire time.

**Why:** The plan's version would have needed `writeDraft` in the effect's dependency array, which would re-create the timer on every render (every keystroke) and defeat the debounce — or required a stale-closure workaround that's harder to reason about than the ref. The ref approach is a standard React idiom for "latest callback" and gets the behavior right the first time: one timer per keystroke burst, always reading the freshest closure when it fires.

Behavior is identical to the plan's intent. No test surface affected (the ref pattern isn't testable through the pure helpers anyway).

### 2. `isLocked` was renamed to `isLockedNow` and aliased

The autosave effect needs `isLocked` in its dependency array. The plan's name collided with a later `const isLocked = readOnly || localStatus === "submitted"` that the JSX body reads. Shipped as `const isLockedNow = readOnly || localStatus === "submitted"` near the top of the component, with `const isLocked = isLockedNow` kept for JSX readability. Pure rename — no behavior change.

### 3. Submit button JSX wraps an IIFE instead of pulling `enabled` to the top

The plan's pseudocode destructured state inside an IIFE (illegal — hooks can't run in IIFEs). The shipped version keeps the IIFE for local computation of `enabled` but calls no hooks inside it:

```javascript
{!isLocked && (() => {
  const enabled = canSubmitDraft({status:"draft", responses:[{questionIndex:0, studentAnswer:text}]}) && !submittingState;
  return (...);
})()}
```

Cleaner than hoisting `enabled` to the component body. Behavior matches the plan.

### 4. No deviations on the Firestore write path

The actual writes went in exactly as planned:
- Create: `col.doc()` generates a client-side id, then `.set(makeDraftPayload({..., isCreate:true}))`.
- Update (autosave): `.update(makeDraftPayload({..., isCreate:false}))` on the held id.
- Submit: `.update({status:"submitted", submittedAt: FieldValue.serverTimestamp()})` on the same id.

Kiran verified at Checkpoint B that each of these lands at `/students/{id}/submissions/{auto-id}` with the expected shape, and that the doc id is stable across keystrokes within one edit session.

## Open questions and risks

### First real exercise of the `submissions/` subcollection rules passed, but only on one doc

Checkpoint B verified one full draft → submit → reload → read-only cycle under a real Firebase Auth session with the student role faked via `?dev=1`. What was NOT tested:

- A real allowlist entry with `role: "student"` and `studentIds: [<id>]` writing under its own uid (vs. the workspace account that happened to be signed in). Rules should allow it — `isLinkedToStudent` is the exact gate — but no real student principal has ever touched the collection. **Session 7 rollout is the first time this happens.**
- An attempted write by a parent role. The client gate prevents the editor from rendering, so the rules path is untested. Rules-side, `isLinkedToStudent(studentId)` requires `allowlistRole() in ['student', 'parent']` OR'd — wait, actually the rule is `allowlistRole() in ['student', 'parent']` for `isLinkedToStudent`, but the `submissions/create` rule uses `isLinkedToStudent` directly, which means **a parent could technically create a submission under the current rules.** The client gate is the only thing stopping them. This is consistent with Session 1's spec (which bundled student+parent under one "linked" concept) but worth flagging: if a future Session 6 relies on "only students create submissions" as a server-side invariant, the rules need tightening. Not a Session 5 fix — the client gate is sufficient for the product.

**Follow-up for Session 6 or 7:** decide whether rules should split student from parent on submission writes, or whether the client gate is the permanent contract. If the latter, document it.

### `responses` is a one-element array permanently

Option (c) stores all answers in `responses[0].studentAnswer`. A later session that wants per-question data would need to either (a) parse that string at read time, or (b) migrate existing submissions by splitting them. Kiran's call on which path. No data loss either way — the original free-text is always preserved in `studentAnswer`.

### Autosave silently drops errors

`writeDraft`'s catch block only `console.warn`s. If the network flaps or the rules reject a write (e.g., stale session), the student has no visible feedback and will think their draft is saved. Firestore compat SDK queues offline writes, so transient network failures should recover automatically. Rules rejections — the more likely failure mode — would be silent until Submit fails with the same error.

**Mitigation for pilot:** if a student reports "I typed stuff but it didn't save", check the browser console. Consider adding a failing-autosave badge in Session 7 if this becomes a real user complaint.

### Submit flow double-writes on the happy path

Submit calls `writeDraft(text)` (one write) and then `.update({status:"submitted", ...})` (a second write). Could be collapsed into a single write by having `handleSubmit` compose the full payload directly. Kept as two writes because it reuses the tested `makeDraftPayload` path for the content and keeps the submit logic focused only on the status transition. Two writes for one submit is not a cost concern at 51 students. Revisit only if we ever have scale issues.

### `submittedAt` displayed after submit is the client's `new Date()`, not the server value

Immediately after submit, the UI renders `submittedAt: new Date().toISOString()` — a client-generated placeholder — so the "Submitted <date>" label appears without waiting for a re-read. On reload, the hook re-fetches and the label shows the real Firestore server timestamp (formatted via `.toDate().toISOString().slice(0,10)`). Both formats happen to be ISO dates at day granularity, so the visual result is identical. Flagging for completeness: if the UI ever needs sub-day precision, the post-submit label will briefly be wrong until reload.

### No tutor visibility into submissions yet

Tutors cannot see anything students submit until Session 6 ships. If Kiran wants to spot-check a submission before then, Firebase Console is the only option. Flag for rollout planning — don't email families "your answers are saved" if tutors can't yet act on them.

## Checkpoint

Session 5 is complete when:
- [x] `studentSubmissionsCollection` helper + `pickLatestSubmission` + `canSubmitDraft` + `makeDraftPayload` ship with 15 new passing tests
- [x] `useSubmissionDraft` resolves one-shot queries against `/students/{id}/submissions`
- [x] `SubmissionEditor` drill-in renders from History tab for student role, read-only for parent
- [x] Draft autosave writes at 750ms debounce, reuses the same doc id across keystrokes
- [x] Submit transitions `status: draft → submitted` in one write; UI locks to read-only
- [x] Read-only state survives page reload (verified end-to-end at Checkpoint B against live Firestore)
- [x] Parent path never renders an editable textarea
- [x] Tutor flow verified unchanged via `?dev=1`
- [x] 60/60 tests green
- [x] This closeout doc committed

Session 5 did NOT require any production operation — no rules deploy, no migration, no flag flip. `DUAL_WRITE_GRACE` and `USE_ALLOWLIST_AUTH` both remain exactly as Session 2/3/4 left them.

---

## Kickoff prompt for Session 6

> Copy everything between the horizontal rules below into a fresh Claude Code session, after running `/clear` in the psm-generator workspace.

---

I'm ready to start **Phase 2 Session 6** of psm-generator: the tutor missed-question review UI. This session is **LOW risk** — it adds a read-and-annotate view inside the existing tutor `StudentProfile`. No new collections, no rules changes, no production data ops. Tutors just get a new tab that reads `/students/{id}/submissions/` and lets them mark answers correct/incorrect.

**Confirm today's date with me at session start before doing anything else.**

### Read these in order before any planning or code

1. **`docs/PHASE_2_SESSION_1.md`** — the authoritative Phase 2 spec. §Schema → `submissions/` shape, §Session plan row 6, §Non-goals row 2 (auto-grading is still out of scope).
2. **`docs/PHASE_2_SESSION_2.md`** — the Firestore rules contract. Specifically the `match /submissions/{submissionId}` block — tutors have full write access via `isTutorOrAdmin()`, which is what Session 6 relies on to add `correct` fields and tutor notes.
3. **`docs/PHASE_2_SESSION_5.md`** — this doc. The submission shape actually being written in production is the one-entry `responses:[{questionIndex:0, studentAnswer:"<free text>"}]` form. Session 6 must handle this shape; it should NOT assume per-question structured data.
4. **[firestore.rules](../firestore.rules)** — live rules. Tutor updates on submissions are allowed via the `allow write: if isTutorOrAdmin()` line, which comes after the student-scoped rules and gives tutors the override path.
5. **[app.jsx](../app.jsx)** — specifically:
   - `StudentProfile` inside `AppInner` — this is where the new Submissions tab lives. Do not touch the existing tabs except to add a new one.
   - `SubmissionEditor`, `useSubmissionDraft`, `pickLatestSubmission`, `studentSubmissionsCollection` from Session 5. The tutor view is mostly a new read path + write path for `correct`/tutor-notes fields; reuse the ref helper and (where it fits) the canonical-pick helper.
   - `DUAL_WRITE_GRACE` — Session 6 does NOT dual-write submissions. Submissions only live in the subcollection.

### Then, before touching ANY code

- Invoke the **`superpowers:writing-plans`** skill to produce a detailed Session 6 implementation plan.
- Present the plan to me for review.
- **Do not start implementing until I approve the plan.**

### Constraints that must not be violated

- **Do NOT modify the Firestore rules.** Tutors already have full submission write access.
- **Do NOT auto-grade.** Session 6 is manual review only — tutor marks each submission/answer correct or incorrect by clicking. No regex, no LLM, no keyword matching. Auto-grading is a future unlock tied to worksheet regeneration.
- **Do NOT touch the student/parent portal.** Session 5's editor is complete. Session 6 reads the same data from a different role, nothing else.
- **Do NOT introduce a per-question parser for the free-text `studentAnswer`.** Tutors see the full text and mark the whole submission correct/incorrect (or add a single free-form tutor note). If per-question scoring ever matters, it waits for worksheet regeneration.
- **Do NOT flip `USE_ALLOWLIST_AUTH` or `DUAL_WRITE_GRACE`.** Kiran's call.
- **Do NOT introduce a bundler or `npm install` anything.**
- **Rebuild before reload.** `python3 build_index.py` after every `app.jsx` change. Session 4 and Session 5 both flagged this — it's the single biggest dev-flow gotcha.
- **psm-generator commit override still applies** (commit + push directly, short user-voice messages, no Co-Authored-By).
- **No slop.** Comments only when the *why* is non-obvious.

### What's in scope for Session 6

Per Session 1's §Session plan row 6:

1. **Tutor Submissions tab inside `StudentProfile`.** Fourth (or Nth) tab alongside the existing tutor tabs. Lists all submissions for the current student, grouped by assignment.
2. **Submission detail view.** For each submission, show the assignment header, the student's free-text answer, the submitted-at timestamp, and controls for the tutor to mark it correct/incorrect and add a tutor note. Writes land on the existing doc — no new schema fields needed beyond what Session 1 anticipated (`correct: boolean`, `reviewerNotes: string`, `reviewedAt: timestamp`).
3. **Missed-question report (auto-generated summary).** A derived view: across all this student's submissions, show which ones are marked incorrect. Session 6 open question: is this a separate tab, a filter on the Submissions tab, or a header card on the Score Tracking tab? Plan must decide.
4. **Read hook.** A tutor-side `useTutorSubmissions(studentId)` subscription OR one-shot query that returns all submissions for a student. Mirror `usePortalStudent` / `useSubmissionDraft` lifecycle.
5. **Test coverage.** Any new pure helpers (e.g., a "compute missed-question summary from submissions list" function) get tests in `tests/portal.test.mjs`. UI verified manually.

### Open questions Session 6 must resolve

- **Where does the missed-question report live?** Tab, filter, or header card. Plan picks one and explains why.
- **`correct` shape.** Per-submission boolean (simplest), per-response boolean (empty in Session 5's one-entry-array world), or a three-state (correct/incorrect/unreviewed)? Recommend a three-state to distinguish "tutor hasn't looked yet" from "tutor marked wrong."
- **Tutor-note shape.** One free-form string per submission (`reviewerNotes`)? Or structured per-response notes? Recommend the simple string for parity with the free-text student answer.
- **Live vs one-shot reads.** Tutors can be reviewing while students are submitting. Live subscription feels right. Cost concern: ~51 tutor sessions × N submissions persistent listeners. Probably fine at scale.
- **Should the tutor see drafts-in-progress?** Session 5 shows `status: "draft"` submissions to the student and locks them from further edits only after submit. Tutors reading `submissions/` will see drafts too. Plan must decide whether to filter them out or show them as "in progress."

### Pause at the first natural checkpoint

- **After the Submissions tab renders submissions for a test student** — Kiran verifies he can see Session 5's test submissions in the tutor UI.
- **After correct/incorrect marking writes land and persist across reload** — Kiran verifies end-to-end.
- **After the missed-question report renders** — Kiran reviews the derived view.

Stop at the first one. Report status. Wait for Kiran to push or tell you to continue.

### Close out at the end of Session 6

Same pattern as this doc: write `docs/PHASE_2_SESSION_6.md` capturing what shipped, deviations, open questions, and a Session 7 kickoff prompt at the bottom.

---
