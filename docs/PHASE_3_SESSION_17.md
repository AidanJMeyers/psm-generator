# Phase 3 — Session 17: Tutor "Assign to Wise" button + first real family rollout

**Date:** 2026-04-17
**Session type:** Client-side wiring (auto-assign to Wise from PSM generator), Cloud Function formatting fix (dynamic practice exams in discussion text), flag flip (`WISE_WRITE_ENABLED=true`). Two deploys: hosting + functions.
**Parent docs:** [PHASE_3_SESSION_16.md](PHASE_3_SESSION_16.md)
**Outcome:** Tutors can now generate a PSM and have it automatically posted as a Wise discussion to the student's class. Practice exams in the discussion are dynamic (only platforms actually assigned, with correct exam numbers). `WISE_WRITE_ENABLED` flipped to `true` — real-mode class resolution and caching active. First real PSM assigned to Michael Shapira via the live portal. **The portal is now in production use for real client families.**

---

## What shipped

### 1. Auto-assign to Wise from PSM generator

**`build_index.py`:** Added `firebase-functions-compat.js` script tag to the HTML shell. The lazy-load in `lib/wise.js` is now a no-op since the SDK loads statically.

**`app.jsx`:** Added `assignToWise(studentId, assignmentId, showToastFn)` helper at the top level. Calls the `assignToWise` Cloud Function via the compat SDK. Shows toast feedback: "Posting to Wise…" → "Posted to Wise ✓" (real mode) or "Posted to Wise (dev mode)".

Wired into two save points:
- **Main PSM generator** — auto-fires after `setStudents` saves the new assignment to the student profile.
- **Pre-assign flow** — auto-fires after `savePreAssign` saves the pre-assigned entry.

**Timing fix:** The Firestore batch write is debounced by 800ms in a `useEffect`. The Cloud Function reads the student doc from Firestore, so calling it immediately after `setStudents` races the write. Fixed with a 2s initial delay + retry logic (up to 3 retries, 2s apart) on "not found" errors. The retry handles variable Firestore sync latency without fragile fixed delays.

### 2. Dynamic practice exams in discussion text

**`functions/index.js` — `buildPsmDescription`:** Refactored from hardcoded BlueBook + WellEd sections to dynamic rendering based on the assignment's `practiceExams` array.

- Only shows BlueBook section if BlueBook exams were assigned
- Only shows WellEd section if WellEd exams were assigned
- Shows no Practice Exams section if neither was assigned
- Bullet points list actual exam numbers (`Practice Exam #3`, `Practice Exam #4`, etc.)
- Added blank line after `Worksheets:` header before bullet points

### 3. `WISE_WRITE_ENABLED` flipped to `true`

`functions/.env`: `WISE_WRITE_ENABLED=true`. Real-mode `assignToWise` now:
1. Resolves the student's Wise user ID by email (cached as `wiseUserId` on student doc)
2. Resolves the student's 1:1 class via `resolveClassForStudent` (cached as `wiseClassId` on student doc)
3. Posts the discussion to the resolved class

Dev-mode redirect (`DEV_TEST_CLASS_ID`) is bypassed when the flag is true.

---

## The deploys

### Deploy 1 — `firebase deploy --only hosting`

New `index.html` with `firebase-functions-compat.js` script tag and the `assignToWise` auto-fire wiring. Multiple iterations during dev testing to fix the Firestore sync race condition.

### Deploy 2 — `firebase deploy --only functions`

Updated `buildPsmDescription` (dynamic practice exams) + `WISE_WRITE_ENABLED=true` flag flip. All four functions redeployed.

---

## Surprises

### 1. Firestore batch write race condition

`setStudents` triggers a React state update, which triggers a `useEffect` with an 800ms debounced Firestore batch write. Calling the Cloud Function immediately after `setStudents` meant the function read Firestore before the assignment was written. Initial fix (direct `.set()` before calling) also failed — the write completed but the Cloud Function still couldn't find the assignment, likely due to Firestore propagation. Final fix: 2s delay + retry with exponential backoff on "not found" errors.

### 2. `resolveClassForStudent` picked the wrong class for Michael

Michael has two Wise classes: "(DNU) M. Shapira - SAT Prep w/ Aidan M." and "M. Shapira - ATS Tutoring Course". The resolution function returns the first class containing the student, which happened to be the DNU class. Fixed by manually setting `wiseClassId` on Michael's student doc (`tk369fgn`) to the correct class ID (`6807139ccf1d99a633a6ced6`). Most students have one class, so the resolution logic is fine for the general case.

### 3. Discussion poster identity

All Wise discussions are posted as "Aidan Meyers" because the Wise API uses the credentials of the API key owner. This is a Wise platform limitation — the API doesn't support posting on behalf of a different user.

---

## Testing performed

- **`npx esbuild app.jsx` parse check** — clean
- **`node --test tests/*.mjs`** — 58 tests, all pass
- **`node --test functions/grade.test.js`** — 20 tests, all pass
- **`node -e "require('./functions/index.js')"` parse check** — clean
- **Dev-mode testing** (`WISE_WRITE_ENABLED=false`) — multiple PSMs generated and posted to dev test class, confirmed discussions appeared on Wise with correct formatting
- **Real-mode testing** (`WISE_WRITE_ENABLED=true`) — Michael's first real PSM posted to correct class, `wiseClassId` cached on student doc
- **Dynamic practice exams verified** — worksheets-only (no practice exams section), BlueBook-only, WellEd-only, both platforms with specific exam numbers

---

## State of the portal

**The portal is now live for real client families.** Tutors generate PSMs → assignments auto-post to student Wise classes → students receive discussion notifications. The full pipeline is operational:

1. Tutor selects student + worksheets + practice exams → Generate
2. Assignment saves to student profile (Firestore)
3. Discussion auto-posts to student's Wise class with formatted instructions, portal deep link, worksheet list, and platform-specific practice exam details
4. Student submits answers via portal deep link
5. `onSubmissionSubmit` auto-grades on submission

---

## Follow-ups

1. **[Low priority] Multi-class disambiguation.** `resolveClassForStudent` returns the first matching class. For students with multiple classes (currently only Michael), manual `wiseClassId` override works. If more students end up with multiple classes, add filtering logic (skip DNU-prefixed classes, prefer most recent, etc.).

2. **[Low priority] Clean up `DEV_TEST_CLASS_ID` from `functions/.env`.** Ignored when `WISE_WRITE_ENABLED=true` but still present. Can remove for hygiene.

3. **[Low priority] Migrate CI auth to Workload Identity Federation.** Carried from Session 16 Follow-up #5. Firebase CI token expires periodically; WIF uses short-lived tokens from GitHub OIDC.

4. **[Low priority] Disable GitHub Pages.** `pages-build-deployment` workflow fails on every push because Jekyll chokes on JSX in markdown docs. Go to repo Settings → Pages → set Source to "None".

5. **[Low priority, unchanged] Row [116] Percentages duplicate-title triage.** Carried from Session 12.

6. **[Deferred — Session 18] Aidan's student-portal UX rework.** Per-worksheet submit, student dashboard, external-item completion, instruction parity with Wise discussion text.

7. **[Deferred — Session 19] In-portal diagnostic standardized tests.** Students take diagnostic tests directly in the portal rather than on a separate platform.

---

## Checkpoint

- [x] `build_index.py`: `firebase-functions-compat.js` script tag added
- [x] `app.jsx`: `assignToWise` helper function added (top-level, with retry logic)
- [x] `app.jsx`: auto-fire wired into main PSM generator save path
- [x] `app.jsx`: auto-fire wired into pre-assign save path
- [x] `functions/index.js`: `buildPsmDescription` refactored for dynamic practice exams
- [x] `functions/index.js`: blank line added after Worksheets header
- [x] `functions/.env`: `WISE_WRITE_ENABLED=true`
- [x] All tests pass (20 grader + 58 portal)
- [x] `firebase deploy --only hosting` — clean
- [x] `firebase deploy --only functions` — clean
- [x] Dev-mode testing complete (multiple test PSMs posted to dev class)
- [x] Real-mode testing complete (Michael's first real PSM posted to correct class)
- [x] Michael's `wiseClassId` manually set to correct class ID
- [x] This doc committed to the repo

---

## Kickoff prompt for Session 18

> Copy the block below into a fresh Claude Code session after `/clear`.

---

I'm ready to start **Phase 3 Session 18** of ats-portal: Aidan's student-portal UX rework. Session 17 shipped the tutor "Assign to Wise" auto-post, flipped `WISE_WRITE_ENABLED`, and completed the first real family rollout. The portal is now in production use.

**Confirm today's date with me at session start before doing anything else.**

### Repo + project naming

- GitHub repo: `github.com/kiranshay/ats-portal`
- Local directory: `~/projects/ats-portal/`
- Firebase project ID: **still `psm-generator`** — immutable.
- App lives at `https://portal.affordabletutoringsolutions.org`.

### Read these in order

1. **`docs/PHASE_3_SESSION_17.md`** — what just shipped and remaining follow-ups.
2. **`app.jsx`** — the main application. Find the student-facing submission flow (`SubmissionEditor`, `WorksheetBlock`, `AnswerResultIndicator`).

### What Session 18 ships

Aidan's student-portal UX asks (carried from Session 15 Follow-up #11):

**A. Per-worksheet submit** — students submit one worksheet at a time rather than all at once.

**B. Student dashboard** — a dashboard view showing all assigned PSMs and their status.

**C. External-item completion** — students can mark external items (practice exams, WellEd domain assignments) as complete.

**D. Instruction parity** — the student portal instructions match the Wise discussion text.

### What NOT to do

- **Do NOT change `functions/wise.js` or `functions/index.js` callable logic.** Session 17 shipped the auto-assign pipeline.
- **Do NOT touch the grading pipeline.** `onSubmissionSubmit`, `grade.js`, `questionKeys` are all stable.
- **Do NOT touch `storage.rules`, CORS, or authentication code.**

### Pause at

- **Before changing the submission flow** — confirm the UX changes with Kiran.
- **Before ANY hosting deploy** — `python3 build_index.py` first.

### Close out

Write `docs/PHASE_3_SESSION_18.md` + kickoff for Session 19 (in-portal diagnostic standardized tests).

### Constraints carrying forward

- **No slop.**
- **ats-portal commit override applies:** Claude may commit + push directly with short user-voice messages, no Co-Authored-By.
- **No bundler.** `build_index.py` produces `index.html`, always run before hosting deploys.
- **Every new function must do its own Firebase Auth check internally.**
- **PSM scores are portal-only. Wise only sees the tutor-initiated discussion for new PSM assignments.** Never a chat, never a score post-back.
