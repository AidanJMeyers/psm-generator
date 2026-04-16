# Phase 3 — Session 15: Auto-grading trigger + Option C student-side feedback

**Date:** 2026-04-15
**Session type:** Cloud Function (first Firestore trigger in the project), `firestore.rules` delta, grader unit tests, client UI for student-side score display, Firebase Console auth debugging. Three deploys: rules, function (twice — first was Eventarc propagation retry), hosting (twice — first was missing the pre-build step).
**Parent docs:** [PHASE_3_SPEC.md](PHASE_3_SPEC.md) §"Auto-grading design" · [PHASE_3_SESSION_14.md](PHASE_3_SESSION_14.md) · [PHASE_3_SESSION_12.md](PHASE_3_SESSION_12.md)
**Outcome:** `onSubmissionSubmit` Firestore trigger is live on `psm-generator`. Student submissions transitioning `draft → submitted` are graded server-side, scores + per-question results + the stored correct answer for each graded question are written back to the submission doc. Student-side `SubmissionEditor` renders an auto-grade banner plus per-question ✓/✗/— glyphs with the correct answer inline next to each graded row. Tutor-side `TutorSubmissionsPanel` picked up the auto-graded scores for free (Phase 2 Session 3's manual-review UI reads the same fields). **No Wise post-back** — Kiran's mid-session directive stripped it. Session 15 also closed Session 14's email enumeration protection issue, diagnosed the underlying email-link delivery block (Postmark in Pending Approval — approval request submitted, ~1 day turnaround), and surfaced a major Session 12 data-quality hole: **62 silently-dropped null answers across 40 worksheets**, documented below.

---

## Scope drift from the kickoff

The kickoff prompt scoped Session 15 to three things: the grading trigger, the `questionKeys` rules delta, and a flag-gated Wise score post-back. Mid-session, Kiran added two things and removed one:

| Change | Direction | Source |
|---|---|---|
| Email-link debug (Session 14 Follow-up #1) | ADDED | Override of kickoff "do NOT fix the email-link SMTP problem" |
| Student-side score display + per-question reveals | ADDED | "I want PSM scores to be shown to student and tutor right away" |
| Wise chat post-back for scores | REMOVED | "I don't want to send these as Chats on Wise... Anything posted to Wise regarding PSM should be just as a discussion (for a new PSM) posted to the student's Wise when a tutor/admin assigns a PSM" |

Net effect: Session 15 is larger in client scope and smaller in Wise scope than the kickoff. All three changes landed.

---

## What shipped

### 1. `functions/grade.js` — pure grading module

No firebase-admin, no network, no side effects. All inputs explicit. Exports: `normalize`, `isMcAnswer`, `gradeMc`, `gradeFr`, `gradeOne`, `gradeSubmission`.

- **`normalize(s)`** — trim, uppercase, numeric canonicalization (`27556.0` → `27556`, `0.9411` → `.9411`). Fractions (`16/17`) and letters pass through unchanged. Case fold is a no-op on numerics.
- **`gradeMc(student, key)`** — single-letter match after normalize.
- **`gradeFr(student, key)`** — splits the stored key on commas, normalizes each piece, accepts if the student's answer matches any piece. This is how the Session 12 dual-answer grid-in format (`.9411, .9412, 16/17`) works — the catalog stores the raw KEY PDF answer verbatim, and the grader expands the alternatives at compare time. Aidan confirmed this behavior at Session 15 kickoff: "FR is numeric-only and accepts all possible answers."
- **`gradeOne(student, key)`** — auto-detects MC vs FR per-question by inspecting whether the stored key matches `/^[A-D]$/i`. This is what makes `answerFormat: "mixed"` worksheets Just Work — no per-question format flag needed.
- **`gradeSubmission({submission, assignment, catalogByTitle, questionKeysById})`** — the full join chain. Returns `{status: "graded", scoreCorrect, scoreTotal, perQuestion[]}` or `{status: "skipped", reason}`.

**Session 15 option C (Kiran directive):** `perQuestion[i]` now carries `correctAnswer` on every graded entry so the student-side UI can reveal the stored answer next to the row. The original spec constraint "students never see the answer bank" was overridden for pedagogical feedback — a student looking at their own submitted test seeing the right answers is the standard model.

**Skip semantics** — skipped questions do NOT count toward `scoreTotal`. They carry `correct: null` and a `skipReason` like `"missing-key"`, `"unsupported-worksheet"`, `"questionIndex-out-of-range"`, or `"no-catalog-row"`. If every question on a submission is skipped, the whole submission is marked skipped (no 0/0 fake grade). Blanks (`""`) in a submitted submission count as **wrong**, not skipped.

### 2. `functions/grade.test.js` — 20 tests

`node --test`. Covers:

- `normalize()` — trim/case, null/undefined/empty, numeric canonicalization, fractions, letters
- `isMcAnswer()` — single-letter detection
- `gradeMc()` — basic correct/incorrect, empty answer
- `gradeFr()` — exact numeric, the `.9411, .9412, 16/17` dual-answer case (explicitly), blanks
- `gradeSubmission()` — all-correct two-worksheet, partial score with MC/FR mix, FR whitespace trim, mixed-format per-question MC/FR detection, unsupported-worksheet skip, missing-catalog-row skip, missing-key skip, partial submission with blanks, legacy blob shape skipped, empty responses, assignment with no worksheets

All 20 pass. The `.9411, .9412, 16/17` case is explicitly tested because it's both the Session 12 data shape and the Session 15 kickoff's FR requirement.

### 3. `functions/index.js` — `onSubmissionSubmit` v2 Firestore trigger

- Path: `students/{sid}/submissions/{subId}`
- Event: `onDocumentUpdated` from `firebase-functions/v2/firestore`
- Region: `us-central1` (matches existing callables)
- Gate: only grades on `before.status === "draft" && after.status === "submitted"`
- Idempotency: if `after.gradedAt` is already set, skip. Firestore delivery is at-least-once, so re-firing must not double-write
- Catalog loading: lazy, module-scoped cache. Catalog file is bundled into the function at deploy time (see §"Catalog bundling" below), read via `fs.readFileSync` on first invocation per cold start, then reused
- `questionKeys` fetch: batched via `db.getAll(...refs)` — one round trip even for a 15-question worksheet
- Writes: `scoreCorrect`, `scoreTotal`, `perQuestion[]`, `gradedAt`. On skip: `gradedAt`, `gradeSkipReason`
- No Wise post-back (directive). The trigger has no secrets attached. The `wise.js` helpers still exist for Session 11b's callables (`assignToWise`, `sendStudentMessage`) but this trigger does not call them.

### 4. `firestore.rules` — `questionKeys` delta

```
match /questionKeys/{questionId} {
  allow get:   if isTutorOrAdmin();
  allow write: if false;
}
```

`get` not `read` — tutors can fetch individual docs but cannot enumerate the 1,067-doc collection from the client. Admin SDK writes (Session 12's extraction script, the grader trigger) bypass these rules. Students and parents fall through to default-deny.

Deployed via `firebase deploy --only firestore:rules`. Smoke-tested against the live portal as a tutor: student list, student profile, historical submissions, allowlist admin tab all still load. AdminsTab correctly denies on a non-admin tutor account (expected).

### 5. Catalog bundling via `firebase.json` predeploy

`worksheets_catalog.json` lives at the project root as a Hosting static asset and cannot be read from inside a Cloud Function. Options considered:

| Option | Pro | Con |
|---|---|---|
| **A. Bundle at deploy time via predeploy `cp`** | Zero cold-start cost; deterministic; testable | Deploy coupling — catalog changes need a function redeploy |
| B. Fetch via HTTPS at cold start | Always fresh | Cold-start latency, public-internet dep, failure modes |
| C. Mirror to Firestore | Consistent | New Session 12 follow-up work, doubles source of truth |

Chose **A**. Added to `firebase.json`:

```
"predeploy": [
  "cp \"$PROJECT_DIR/worksheets_catalog.json\" \"$RESOURCE_DIR/worksheets_catalog.json\""
],
"ignore": [..., "*.test.js"]
```

`functions/worksheets_catalog.json` is `.gitignore`'d in `functions/.gitignore` — the source of truth stays at project root, the function copy is deploy-time-only.

### 6. Client UI: score banner + per-question indicators + option C reveal

**File touched:** `app.jsx` — `WorksheetBlock` + `SubmissionEditor`. Session 14 client code was explicitly excluded from the kickoff, but Kiran overrode that when he asked for student-side score display.

#### New component: `AnswerResultIndicator`

Renders a 22px circle glyph with an optional inline text reveal next to it:

- **`correct: true`** — green ✓ + reveal text `{correctAnswer}` if present (e.g., "A", "27556", ".9411, .9412, 16/17")
- **`correct: false`** — red ✗ + same reveal
- **`correct: null`** — orange `—` with `title` tooltip showing the `skipReason`

Reveals are ellipsis-truncated at ~80px with `title` tooltip showing the full value on hover.

#### `WorksheetBlock` changes

- New prop `results` — an array indexed by `questionIndex`, one entry per question from the submission's `perQuestion[]`.
- Row container now renders `<AnswerResultIndicator result={results[i]}/>` inside the row flex layout when `isLocked && results`.
- Grid template widens from `260px` to `340px` for the answer column when graded, to make room for the indicator + reveal without squeezing MC chips. Non-graded renders stay at 260px.

#### `SubmissionEditor` changes

- New `useMemo(perQuestionByWorksheet)` — groups `submission.perQuestion[]` by `worksheetId` into an object-of-arrays indexed by `questionIndex`. **Must be declared before the early returns** (see §Surprises below — this is how I broke the page mid-session).
- New derived value `gradeBanner` (plain IIFE, not a hook) — three states:
  - **Graded**: `Auto-graded: 3 / 6` pill, color varies by score (green perfect / red zero / orange partial)
  - **Skipped**: `Not auto-graded ({reason})` pill, orange
  - **Awaiting**: `Score pending…` pill, gray (for the <1s race window between submit and trigger)
- Banner rendered between the "Submitted {date}" line and the worksheet grid, only when `isLocked`.
- Each `<WorksheetBlock>` gets `results={perQuestionByWorksheet[w.id]}`.

#### Tutor side: zero code changes required

[`TutorSubmissionsPanel`](../app.jsx#L5649) was built in Phase 2 Session 3 for manual tutor-entered scores. Its `isReviewed` check at [app.jsx:1093](../app.jsx#L1093) just tests `typeof scoreCorrect === "number"`. The auto-grader writes the same fields server-side, so the tutor-side pill (`"3 / 6 — submitted ..."`) renders automatically on auto-graded submissions. **Free feature carryover.**

---

## The three deploys

### Deploy 1 — `firebase deploy --only firestore:rules`

Clean first try. 5 seconds. Smoke-tested, no regressions.

### Deploy 2 — `firebase deploy --only functions:onSubmissionSubmit`

**First attempt failed** with a known-good Firebase error:

> Permission denied while using the Eventarc Service Agent. If you recently started to use Eventarc, it may take a few minutes before all necessary permissions are propagated to the Service Agent. Since this is your first time using 2nd gen functions, we need a little bit longer to finish setting everything up. Retry the deployment in a few minutes.

`psm-generator` has only ever had HTTP-triggered callables (`onCall`) — this is the project's first Firestore-triggered function. Firebase provisions the Eventarc Service Agent on first use and the IAM grant takes 2–5 minutes to propagate. Retried ~3 min later, clean success. Function went live at `2026-04-15T18:27:46Z`.

### Deploy 3 — `firebase deploy --only functions:onSubmissionSubmit,hosting`

After adding option C (correctAnswer in perQuestion) and removing the Wise post-back. Function update + hosting together. Clean first try.

### Deploy 4 — `firebase deploy --only hosting` (emergency rebuild)

Shipped a blank page. Root cause in Surprises #1 below. Rebuilt via `python3 build_index.py` and redeployed hosting. `index.html` bumped from ~544,624 bytes to 544,703 (79-byte delta matches the fix).

### Deploy 5 — `firebase deploy --only hosting` (rules-of-hooks fix)

After fixing the rules-of-hooks bug (Surprises #2). Same rebuild + redeploy. Smoke test finally passed.

### Deploy 6 — `firebase deploy --only hosting` (Tier 3: student-side score surfaces)

After Kiran pointed out that the score-tracking tab showed no PSM scores and that the Assignment History cards didn't visually indicate completed submissions. Built on the same submission listener the existing `TutorSubmissionsPanel` uses and wired it into `StudentPortal` at the parent level.

**Tier 3 adds:**

- **`useTutorSubmissions(studentId)` lifted to `StudentPortal`** — single listener shared by both the Score Tracking and Assignment History tabs. The hook name is historical (Phase 2 Session 3); semantically it's a plain listener on `/students/{sid}/submissions`. Rules at [firestore.rules:100](../firestore.rules#L100) already allow a linked student to list their own submissions via `canReadStudent` → `isLinkedToStudent` → `allow read`.
- **`PortalHistoryTab` done pill + muted card** — each assignment card looks up a matching submission by `assignmentId`. If one exists in `status: "submitted"`:
  - A new pill `Done · 3 / 6` in the card header, colored green/red/orange/gray by score state
  - Card opacity dropped to 0.94 to de-emphasize completed assignments
  - `Answer →` button relabeled to `Review →` with neutral gray border — closes [Session 14 Follow-up #7](PHASE_3_SESSION_14.md) for free
- **`PortalHistoryTab` "No PDF" / "Open PDF →" removal** — the Phase 2 row-level PDF link/badge is deleted entirely. The PDF is accessed through the `Review →`/`Answer →` button which opens `SubmissionEditor` (which renders the PDF via `InlinePdfViewer` from the catalog join). Closes [Session 14 Follow-up #5](PHASE_3_SESSION_14.md).
- **`PortalTrackingTab` new "PSM submissions" section** — a table above Practice Exam History listing every submitted PSM with its auto-graded score. Columns: Date / PSM / Score. Newest first. Score colored by performance. Skipped submissions render `— (reason)`. Pre-Session-15 submissions render `not graded` (see below).
- **`isSubmissionStaleUnscored(sub)` helper** — distinguishes the ~1-3s race window between submit-click and trigger-fire from genuinely-never-graded submissions (pre-Session-15 docs, trigger crashes). A submission is stale if `status === "submitted"`, no `scoreCorrect`, no `gradeSkipReason`, no `gradedAt`, and `submittedAt > 30s ago`. Both the `Done · …` pill and the Score Tracking table use this to show `not graded` instead of the misleading `pending`.
- **PSMs do NOT feed Score Trends.** That chart remains full-length-exam-only, as designed ([app.jsx:1208](../app.jsx#L1208)'s category filter). Whether to mix PSMs into Score Trends or build a separate PSM trends view is a deferred Session 16+ decision.

Deploy 6 was hosting-only (no function or rules changes). Rebuild via `build_index.py` → `firebase deploy --only hosting`. Smoke-tested by Kiran: done pills render correctly, "No PDF" gone, "not graded" label correctly applied to pre-Session-15 submissions.

### Deploy 7 — CI `FIREBASE_TOKEN` rotation (out-of-band fix after the Session 15 commit push)

The Session 15 commit push (`session 15: auto-grading trigger + student/tutor score display + rules delta`) triggered the GitHub Actions Deploy to Firebase Hosting workflow, which failed after 30s:

```
Authentication Error: Your credentials are no longer valid.
Please run firebase login --reauth
For CI servers and headless environments, generate a new token with firebase login:ci
```

Root cause: the `FIREBASE_TOKEN` secret that Session 14 rotated (after its own expired-token failure) had expired again. This is not a session-specific bug — Firebase CI tokens have a finite lifetime and need periodic rotation. The local `firebase login --reauth` Kiran ran earlier in Session 15 does NOT share a credential store with the CI token.

Fix: Kiran ran `firebase login:ci` locally and updated the GitHub secret via `gh secret set FIREBASE_TOKEN --repo kiranshay/ats-portal` (or the web UI). Subsequent pushes deploy cleanly.

**Good news:** the `deploy.yml` workflow's pre-deploy verification step (`git diff --quiet -- index.html`) already catches the "forgot to rebuild" footgun. If a commit contains an `app.jsx` change but not a matching `index.html` rebuild, CI refuses to deploy with `index.html is out of date with its sources`. The Session 15 hosting deploy chain was clean on this front. **Scratch the Session 15 follow-up item about verifying build_index.py runs in CI — it already does.**

**Also noted from the failure log:** the `--token` flag is deprecated and will be removed in a future major firebase-tools version. Long-term fix is `GOOGLE_APPLICATION_CREDENTIALS` with a service account key, but the deploy.yml comment says org policy blocks service-account key creation. The modern replacement is GCP Workload Identity Federation, which is significant infra work. Logged as a low-priority Session 17+ follow-up.

---

## Real submission test

Kiran assigned `LinEqin2Var - Medium (7Qs)` (a `mixed`-format worksheet) to test student `rnbw56f5`, submitted 7 answers, and watched `firebase functions:log --only onSubmissionSubmit` while it fired.

```
19:18:42  onSubmissionSubmit: start        sid=rnbw56f5 subId=5PH4UEixC0nM7Svy50RK
19:18:42  catalog loaded                   rows=150 titles=147
19:18:43  onSubmissionSubmit: graded       scoreCorrect=3 scoreTotal=6
```

**`scoreTotal: 6` on a 7-question worksheet** — one question skipped. Investigation (see Surprises #3) revealed `questionKeys/9c7741c6` doesn't exist because Session 12's extraction returned `correctAnswer: null` for that question, and the commit path skips nulls. The grader handled it correctly (`perQuestion[3].correct: null, skipReason: "missing-key"`), just surfaced a latent Session 12 data-quality hole.

**`scoreCorrect: 3` when Kiran intended 2 correct** — reconciled against the catalog + `questionKeys`:

| q | studentAnswer | stored key | result |
|---|---|---|---|
| 0 | `3/17` | `.1764, .1765, 3/17` | ✓ — Session 12 dual-answer grid-in; `3/17` is an accepted form |
| 1 | `B` | `C` | ✗ |
| 2 | `C` | `D` | ✗ |
| 3 | `5` | _(missing)_ | skipped |
| 4 | `C` | `C` | ✓ |
| 5 | `B` | `B` | ✓ |
| 6 | `A` | `C` | ✗ |

3 correct (q0, q4, q5), 3 wrong, 1 skipped = `3/6`. The grader math is 100% correct. Kiran was guessing randomly and didn't realize `3/17` happened to match one of the valid grid-in forms. **No grader bug.**

---

## Surprises

### 1. Forgot to rebuild `index.html` before the hosting deploy

`firebase deploy --only hosting` shipped the old `index.html` because I didn't run `python3 build_index.py` first. `ats-portal` has no bundler — `build_index.py` reads `app.jsx`, `embed.js`, `lib/diagnostic.mjs` and inlines everything into a single `index.html`. `firebase.json`'s hosting ignore list excludes `app.jsx` directly, so only the pre-built file is served.

Smoke test after the first deploy showed nothing — no score banner, no per-question glyphs, no reveal — because the old JS was still being served. Diagnosed in ~2 min by grepping `build_index.py` for how `app.jsx` gets consumed.

**Saved a memory rule for future sessions:** before any `firebase deploy --only hosting` (or any deploy that includes hosting) in `ats-portal`, always run `python3 build_index.py` first. See [feedback_psm_build_before_deploy.md](../../.claude/projects/-Users-kiranshay-projects/memory/feedback_psm_build_before_deploy.md).

**Check the CI workflow:** `.github/workflows/deploy.yml` needs to run `build_index.py` too. If it doesn't, CI deploys are silently broken in the same way. Logged as Session 16 follow-up.

### 2. Rules-of-hooks violation — second-attempt smoke test hit a blank page and broken Back button

After Deploy 4, Kiran reported: "Now it's broken, I can't see or go back to the Answer page it returns a blank page and I didn't see the autograder." `SubmissionEditor`'s existing early returns at lines 5350 and 5357 run before the hook declarations — I had added `useMemo(perQuestionByWorksheet)` *below* the early returns. On transitions between `loading`/`error`/`ready` states, the hook count changed between renders, React threw, and the whole page went blank.

Fix: move `useMemo(perQuestionByWorksheet)` above the early returns. `gradeBanner` is a plain derived IIFE (not a hook) so it can stay below the early returns. Deploy 5, smoke test passed.

**Lesson:** adding ANY hook to an existing component requires verifying it runs unconditionally before every early return. The Session 14 retrospective already called out the cascade failure pattern with `useMemo` dependencies (commit `cb16ea5`); this is a different variant of the same family of bugs. React's rules-of-hooks linter would have caught this pre-run — the project has no ESLint config, so nothing warned.

### 3. Session 12 has 62 silently-dropped null answers across 40 worksheets

**Major finding.** The `LinEqin2Var - Medium (7Qs)` missing key for q3 wasn't a one-off — it's part of a systematic hole. I audited `scripts/extraction_output.json` across all supported rows:

- **62 questions** across **40 worksheets** have `correctAnswer: null`
- Session 12's extraction commit path (`extract_answer_keys.mjs` line ~348) does `if (!t.correctAnswer) continue;` — null-answer tuples are silently skipped
- Worst case: `CompGeo&Trig - Hard (15Qs)` with **5/15 nulls (33%)**
- Average ~1.5 nulls per affected worksheet
- Mostly math worksheets; pattern suggests another pdftotext layout edge case the Session 12 regex didn't anticipate

Session 12's claimed math ("1,067 unique `questionKeys` docs / 1,143 total slots, gap = 76 duplicates") does not account for the 62 nulls. The real math is closer to `1,143 - 76 dupes - 62 nulls ≈ 1,005` docs, with the "1,067" figure either including the null-skipped ones in the denominator or the 76-dupe count being overstated. Session 12's audit was incomplete.

**The grader handles this correctly** — skipped questions don't count toward total, the student sees a "—" glyph with a `missing-key` tooltip. But it's a bad experience: students will see 33% of questions on `CompGeo&Trig - Hard` as "not graded." **This is CRITICAL Session 16 work.**

Full affected list (40 rows):

```
CompAlgebra - Medium (15Qs): 1/15 nulls
CompAlgebra - Hard (15Qs): 1/15 nulls
LinEqin1Var Practice - Medium: 2/10 nulls
LineEq1Var - Comp: 1/15 nulls
LinFunctions - Medium (10Qs): 1/10 nulls
LinEqin2Var - Medium (7Qs): 1/7 nulls
LinEqin2Var - Hard (10Qs): 1/10 nulls
LinEq2Var - Comp (15Qs): 2/15 nulls
SystemsLinEqs - Hard (7Qs): 1/7 nulls
SystemsLinEqs - Comprehensive (15Qs): 3/15 nulls
LinInequalities - Hard (5Qs): 1/5 nulls
LinInequalities - Comprehensive (10Qs): 1/10 nulls
CmpAdvMath - Easy (15Qs: 1/15 nulls
CmpAdvMath - Hard (15Qs: 1/15 nulls
NonLinEQs&SOEs - Med (10Qs): 2/10 nulls
NonLinEQs&SOEs - Hard (10Qs): 1/10 nulls
NonLinEQs&SOEs - Comp (15Qs): 1/15 nulls
EquivolentExpressions - Hard (10Qs): 1/10 nulls
CompPSDA - Easy (20Qs): 1/20 nulls
CompPSDA - Medium (15Qs): 3/15 nulls
CompPSDA - Hard (15Qs): 2/15 nulls
RatesRatiosUnits - Easy (10Qs): 2/10 nulls
RatesRatiosUnits - Medium (10Qs): 2/10 nulls
RatesRatiosUnits - Hard (3Qs): 1/3 nulls
Percentages - Hard (5Qs): 2/5 nulls   ← appears twice — the [115]/[116] duplicate Session 12 flagged
1VarData - Medium (5Qs): 1/5 nulls
2VarData - Comprehensive (10Qs): 2/10 nulls
Probability - Comprehensive (10Qs): 2/10 nulls
Inference&ME - Comprehensive #1 (10Qs): 2/10 nulls
Inference&ME - Comprehensive #2 (10Qs): 1/10 nulls
CompGeo&Trig - Medium (15Qs): 2/15 nulls
CompGeo&Trig - Hard (15Qs): 5/15 nulls    ← worst
Area&Volume - Medium (5Qs): 1/5 nulls
LinesAnglesTriangles - Easy (10Qs): 1/10 nulls
LinesAnglesTriangles - Hard (5Qs): 2/5 nulls
RightTris&Trig - Hard (10Qs): 2/10 nulls
RightTris&Trig - Comprehensive (10Qs): 1/10 nulls
Circles - Medium (3Qs): 1/3 nulls
Circles - Hard (10Qs): 1/10 nulls
```

### 4. Email enumeration protection was silently eating email-link sends

Investigation path: Kiran's burner `sixsiege1414@gmail.com` wasn't in Firebase Auth users → hypothesis that Firebase's email enumeration protection was silently dropping sends to unknown users → Kiran turned it off in Settings → User actions → still no email arrived → pivoted to SMTP debug (Surprises #5). The enumeration protection fix was still the right move — it would have blocked ever sending to a new student regardless of the SMTP story — but it wasn't the delivery blocker.

### 5. Postmark SMTP in Pending Approval

The real email-link delivery blocker. Firebase Auth → Templates → SMTP settings was already configured to use Postmark (`smtp.postmarkapp.com:587`, sender `support@affordabletutoringsolutions.org`, both username and password set to the server token — which is the correct Postmark SMTP auth pattern).

Postmark's gotcha: new accounts start in **Pending Approval** mode, which silently holds all sends to recipients other than the verified Sender Signature email. The client gets `200 OK` from `sendOobCode` (Firebase auth accepted it), Postmark gets the envelope and accepts it (SMTP auth succeeded), but then Postmark internally routes the message to an approval queue and never delivers.

Diagnosis path from the DevTools network capture:
1. `POST /v1/accounts:sendOobCode` → `200 OK` with `{"kind": "identitytoolkit#GetOobConfirmationCodeResponse", "email": "sixsiege1414@gmail.com"}`
2. This is Firebase's success echo — meaningful only insofar as "request valid," not "email dispatched"
3. The drop happens in Postmark's internal pipeline, not in Firebase

Kiran submitted the Postmark approval request. Expected approval window: ~1 business day. **Session 15 does NOT resolve the email-link path** — it diagnoses the root cause and documents the fix path. Email-link auth is still blocked on Postmark approval. Google OAuth sign-in continues to work for all test sessions.

### 6. Firebase CLI reauth required

`firebase projects:list` returned "Your credentials are no longer valid" on the first deploy attempt. Kiran ran `firebase login --reauth` (signed in as `support@affordabletutoringsolutions.org`). First time a firebase login has actually been cycled mid-session — logged as a normal maintenance task, not a surprise.

### 7. Node.js 20 runtime + firebase-functions outdated warnings

Every function deploy emits two warnings:

```
⚠ functions: Runtime Node.js 20 will be deprecated on 2026-04-30 and will be decommissioned
             on 2026-10-30, after which you will not be able to deploy without upgrading.
⚠ functions: package.json indicates an outdated version of firebase-functions.
             Please upgrade using npm install --save firebase-functions@latest in your
             functions directory.
```

**Node 20 deprecates 2026-04-30 — that's 15 days from today.** Deployable until 2026-10-30 but already-deployed functions keep running. Needs to be fixed before the 6-month decommission deadline. Bundling into Session 16 or a dedicated micro-session.

### 8. `assign to Wise` chat→discussion migration deferred to Session 16

The kickoff prompt started with "PSM scores post back to Wise via the existing chat API, flag-gated." Mid-session Kiran flagged two things:

1. **Wise calls them "discussions"** (internally "announcements" — the API is `createAnnouncements` and `removeAnnouncement`, returning `announcementId`). This isn't just terminology — the chat API and the discussion API are different endpoints.
2. **Per-student class model is unknown.** `createAnnouncements` takes `classId`, not a user id. For per-student score post-backs to work, we need to know whether Wise has 1:1 classes per student-tutor pairing, or per-tutor classes that would leak scores across students. Postman docs weren't directly scrapable (Postman documenter is client-rendered; browse skill was SIGKILLed mid-session; WebFetch only got the shell).

Net decision: **Session 15 removes the Wise post-back entirely. Session 16 owns the full chat→discussion migration for the tutor-initiated assign path, NOT the submission post-back. PSM scores live in the portal UI only, never in Wise.** This matches Kiran's directive: "scores shown to student and tutor right away" + "Anything posted to Wise regarding PSM should be just as a discussion (for a new PSM) posted to the student's Wise when a tutor/admin assigns a PSM."

---

## State of `WISE_WRITE_ENABLED`

**Still `false`.** Orthogonal to Session 15 now that the post-back is removed entirely. Flip stays tied to Session 17 pilot rollout. When Session 16 builds the `createAnnouncements` assign path, it will be flag-gated the same way `assignToWise` currently is.

---

## Testing performed

- **`node --test functions/grade.test.js`** — 20 tests, all pass
- **`node --test tests/portal.test.mjs`** — 58 tests, all pass (no new portal tests added this session — the client changes are presentational and verified by manual smoke testing)
- **Parse check on `app.jsx`** — esbuild transform on the full file, clean
- **Local smoke test** — Kiran signed in as the real test student on prod, opened the existing `5PH4UEixC0nM7Svy50RK` submission, confirmed the banner renders, the per-question circles render correctly (✓/✗/— matching the log output), and the page didn't crash after the rules-of-hooks fix
- **Cloud Function live test** — submission `5PH4UEixC0nM7Svy50RK` graded in ~300ms, logs show `onSubmissionSubmit: graded scoreCorrect=3 scoreTotal=6`, Firestore shows the correct perQuestion entries with correct `correct` flags and `skipReason: "missing-key"` on q3

### What was NOT tested this session

- **New submission with the updated grader (Option C).** The existing test submission was graded by the v1 trigger which didn't write `correctAnswer`, so the inline reveal never got exercised against real data. The UI code path for reveal was verified only by reading the code — no browser click-through on a reveal-enabled submission.
- **Email-link auth end-to-end.** Still blocked on Postmark approval.
- **Cross-student submission isolation.** The grader writes to `students/{sid}/submissions/{subId}` using the trigger's path params, so there's no cross-student leak risk by construction, but it wasn't exercised with two students in parallel.
- **Idempotency on re-fire.** The `gradedAt` check is in place but wasn't forced — no crash/retry scenario happened in this session.

---

## Follow-ups

1. **[CRITICAL — Session 16 or dedicated micro-session] Re-run `extract_answer_keys.mjs` to fix 62 null answers across 40 worksheets.** The pattern suggests a pdftotext layout edge case similar to Session 12's footer-bleed fix. Diagnosis: pick one of the affected worksheets (e.g. `CompGeo&Trig - Hard (15Qs)` with 5/15 nulls), run `pdftotext -layout` on the KEY PDF manually, inspect the raw text around the null questions, and extend the extraction regex. Commit a re-extraction, verify null count goes to zero or near-zero. **Student experience is degraded until this lands** — specific worksheets have up to 33% not-graded coverage.

2. **[Session 16 scope] Wise `createAnnouncements` migration.** When tutor assigns a PSM, post a Wise discussion (not chat) to the student's 1:1 class. Requires resolving the `classId` question (Postman docs for the class-list endpoint, or direct answer from Kiran about the Wise class model). Touches `functions/wise.js` and `functions/index.js`. `assignToWise` migrates from `sendChatMessage` to `createAnnouncements`. `WISE_WRITE_ENABLED=false` still routes to `DEV_TEST_RECIPIENT_EMAIL`-equivalent, but the "recipient" concept for discussions is a class, not a user, so there may need to be a `DEV_TEST_CLASS_ID` alongside.

3. **[Session 16 or earlier, tracked] Postmark approval resolution.** Kiran submitted the approval request during this session. Should come through in ~1 business day. Once approved, re-test the full email-link flow end-to-end — it should work without any code changes. If Postmark denies approval for any reason, fallback is Google Workspace SMTP relay (`smtp-relay.gmail.com:587` with the `support@` account app password) — same Firebase Console SMTP settings page, different host/credentials.

4. **[Session 16 close-out] Node.js 20 → 22 runtime upgrade.** Deadline: 2026-10-30 for decommission, 2026-04-30 for soft deprecation. Edit `functions/package.json` `engines.node` from `"20"` to `"22"`, test locally, deploy. Low risk for the current function surface (no Node 20–specific APIs in use).

5. **[Session 16 close-out] `firebase-functions` package upgrade.** Has breaking changes. Read the upgrade guide, patch any callable/trigger signature changes, redeploy. Bundle with the Node 22 upgrade since both touch `package.json`.

6. **[RESOLVED during Session 15] CI workflow already runs `build_index.py`.** Confirmed in `.github/workflows/deploy.yml` lines 42-51. CI runs the rebuild AND verifies the committed `index.html` matches the rebuild output via `git diff --quiet -- index.html`, refusing to deploy on mismatch. No action needed.

6a. **[Low priority, Session 17+] Migrate CI auth away from `--token` to Workload Identity Federation.** The `--token` flag is deprecated. Service account keys are blocked by org policy. Workload Identity Federation is the supported path but requires GCP IAM configuration. Flag for Session 17+.

7. **[Session 16 or dedicated polish session] Kiran's Session 15 test session generated a follow-up that isn't grader-related:** `TutorSubmissionsPanel` shows `Unreviewed — submitted ...` for auto-graded submissions that came through before Session 15 deploy. Post-Session-15 auto-graded submissions show the correct `3/6 — submitted ...` pill. Old submissions from Phase 2 Session 3 testing will stay in the unreviewed state indefinitely unless manually re-submitted or back-filled. Cosmetic only.

8. **[Session 17 or rollout] `WISE_WRITE_ENABLED` flip.** Same as always. Flipping this alone is not enough now — Session 16's `createAnnouncements` work has to land first so the assign path actually has something to do when the flag is on.

9. **[Low priority, unchanged from Session 14 Follow-up #7] `Answer →` button label for submitted assignments.** Still says "Answer" even when the target is graded read-only. Should say "View →" or "Review →" when `submission.status === 'submitted'`. Minor complexity bump because the history row needs to read submission state inline. Not a Session 15 blocker.

10. **[Low priority] Delete the old `5PH4UEixC0nM7Svy50RK` test submission before rollout or leave it as a living-doc test case.** Either way, future sessions should note that this submission was graded by the v1 trigger and does NOT have `correctAnswer` on its `perQuestion` entries, so the reveal UI degrades gracefully (circles render, reveals don't).

11. **[Deferred, Aidan's directional asks from Session 15 kickoff — not grader-related]** Per-worksheet submit, student dashboard of PSMs, external-item completion marking (WellEd / Bluebook), in-portal instructions mirroring the Wise discussion text. Captured in memory at [project_psm_student_portal_ux.md](../../.claude/projects/-Users-kiranshay-projects/memory/project_psm_student_portal_ux.md). These are a real student-portal UX rework — Session 16 or a dedicated UX session.

---

## Checkpoint

- [x] `functions/grade.js` shipped with normalize + MC/FR/mixed graders + gradeSubmission
- [x] `functions/grade.test.js` shipped, 20 tests passing
- [x] `onSubmissionSubmit` Firestore trigger live in production, idempotent, grades on `draft → submitted`
- [x] Option C: `correctAnswer` written into every graded `perQuestion[i]`
- [x] `firestore.rules` has `questionKeys` block (get for tutor/admin, no writes)
- [x] `firebase.json` predeploy bundles `worksheets_catalog.json` into `functions/` at deploy time
- [x] `functions/.gitignore` excludes the copied catalog
- [x] `AnswerResultIndicator` component shipped
- [x] `WorksheetBlock` accepts `results` prop and renders indicators
- [x] `SubmissionEditor` computes `perQuestionByWorksheet`, renders score banner, passes results down
- [x] Rules-of-hooks violation caught and fixed (hook moved above early returns)
- [x] `index.html` rebuilt via `python3 build_index.py` before final hosting deploy
- [x] Wise post-back removed from grader entirely (directive)
- [x] Email enumeration protection disabled in Firebase Console
- [x] Email-link blocker diagnosed (Postmark Pending Approval)
- [x] Postmark approval requested
- [x] Real submission test executed end-to-end (`5PH4UEixC0nM7Svy50RK`, 3/6 graded, verified correct against catalog + extraction output)
- [x] Null-answer audit run (62 nulls / 40 worksheets surfaced)
- [x] Session 16 scope shift logged (chat→discussion, null-answer re-extraction, Node 20 upgrade)
- [x] Tier 3: `StudentPortal` listener lifted, done pill + muted card + Review→ button on `PortalHistoryTab`
- [x] Tier 3: "No PDF" / "Open PDF →" removed from `PortalHistoryTab` worksheet rows (Session 14 FU #5 closed)
- [x] Tier 3: new "PSM submissions" section in `PortalTrackingTab`
- [x] Tier 3: `isSubmissionStaleUnscored` helper distinguishes pre-Session-15 submissions from live race window
- [x] Tier 3 deployed + smoke-tested
- [x] CI FIREBASE_TOKEN rotated (out-of-band Deploy 7)
- [x] GitHub Pages workflow to be disabled by Kiran via `Unpublish site` button (one-click, no repo changes)
- [x] This doc committed to the repo

---

## Kickoff prompt for Session 16

> Copy the block below into a fresh Claude Code session after `/clear`.

---

I'm ready to start **Phase 3 Session 16** of ats-portal: Wise discussion assign-path migration (chat → createAnnouncements) + CRITICAL Session 12 null-answer re-extraction + Node 20 → 22 runtime upgrade. Session 15 shipped auto-grading with student + tutor display, but surfaced a major data hole: **62 silently-dropped null answers across 40 worksheets**. Session 16 fixes that AND builds the tutor-initiated Wise discussion path that Session 15 intentionally deferred.

**Confirm today's date with me at session start before doing anything else.**

### Repo + project naming

- GitHub repo: `github.com/kiranshay/ats-portal`
- Local directory: `~/projects/ats-portal/`
- Firebase project ID: **still `psm-generator`** — immutable.
- App lives at `https://portal.affordabletutoringsolutions.org`.

### Read these in order

1. **`docs/PHASE_3_SESSION_15.md`** §"Surprises" and §"Follow-ups" — especially the 62-null audit and the chat→discussion deferral.
2. **`docs/PHASE_3_SESSION_12.md`** §"Surprises" and `scripts/extract_answer_keys.mjs` — to understand the Session 12 extraction approach and the known edge cases.
3. **`scripts/extraction_output.json`** — actually inspect the null-answer tuples for a worst-case worksheet like `CompGeo&Trig - Hard (15Qs)`. The 5/15 nulls there will show the pattern.
4. **`functions/index.js`** §`assignToWise` — the tutor-facing callable that's about to migrate from `sendChatMessage` to `createAnnouncements`.
5. **`functions/wise.js`** §`sendChatMessage`, `ensureAdminChat`, `resolveRecipient` — these are about to get a discussion sibling.
6. **`functions/package.json`** engines — currently Node 20, needs bump to 22. The deploy warnings from Session 15 cite 2026-10-30 decommission, 2026-04-30 soft-deprecation. **Urgent.**

### What Session 16 ships

Three workstreams. Pick order based on blockers.

**A. Null-answer re-extraction (CRITICAL, pure data work, low deploy risk)**
- Diagnose why `correctAnswer` came back `null` for 62 tuples. Likely another pdftotext layout edge case similar to Session 12's footer-bleed (Surprise #3) or case-sensitivity bug (Surprise #2).
- Start by running `pdftotext -layout` manually on `KEY_CompGeo&Trig - Hard (15Qs).pdf` and inspecting the raw text around the 5 null question IDs (`f7e626b2`, `25da87f8`, `dba6a25a`, `fb58c0db`, `6a3fbec3`). The pattern will show the fix.
- Extend `extract_answer_keys.mjs`'s regex/classifier to handle the case. Re-run with `--commit` against `psm-generator`.
- Target: 0 nulls remaining (or near-zero, with a remaining unfixable set clearly documented as "these specific PDFs need manual edits").
- Kiran needs fresh ADC (`gcloud auth application-default login`) before the commit step.

**B. Wise chat → discussion migration (tutor assign path)**
- Requires first resolving the `classId` question. Two paths:
  - (i) Kiran pastes the Wise Postman entry for "list classes" / "get user's classes"
  - (ii) Kiran answers directly: is there a 1:1 class per student-tutor pairing, or do students share classes?
- Once answered, add `createDiscussion(cfg, classId, {title, description})` to `functions/wise.js`.
- Migrate `assignToWise` callable from `sendChatMessage` to `createDiscussion`. Cache `wiseClassId` on the student doc the same way `wiseUserId` gets cached today.
- Update the tutor UI "assign to Wise" button (Session 16 was supposed to build this originally — check Session 13/14/15 state for whether it's already wired).
- Keep `WISE_WRITE_ENABLED=false`, keep `DEV_TEST_RECIPIENT_EMAIL` routing (extend to a test class id for discussions).

**C. Node 20 → 22 runtime + firebase-functions upgrade**
- Edit `functions/package.json` engines.node from `"20"` to `"22"`.
- `npm install --save firebase-functions@latest` in `functions/`. Read the upgrade guide first — there are breaking changes. Session 15's trigger and the Session 11b callables may need signature tweaks.
- Test locally via `firebase emulators:start --only functions` if possible. Deploy last, after A and B are stable.

### What NOT to do

- **Do NOT deploy a new `onSubmissionSubmit` unless the grader logic actually changes.** A null-answer re-extraction updates `questionKeys/` docs, NOT the grader — the existing function will pick up the new keys automatically on its next invocation.
- **Do NOT flip `WISE_WRITE_ENABLED`.** Session 17.
- **Do NOT touch `SubmissionEditor`, `WorksheetBlock`, or `AnswerResultIndicator`.** Session 15 shipped the grading UI. The Aidan UX asks (per-worksheet submit, student dashboard) are a separate session.
- **Do NOT try to fix the email-link path.** Postmark approval is tracked out-of-band. If it's approved by Session 16 start, Kiran can just retest. No code changes needed either way.
- **Do NOT touch `storage.rules`, CORS, or Session 14 client code.**

### Pause at

- **Before touching `extract_answer_keys.mjs`** — show Kiran the diagnosis of why the 62 nulls happen (the specific pdftotext output pattern) before editing the regex.
- **Before running `extract_answer_keys.mjs --commit`** — any change to production Firestore needs a pre-commit walk-through.
- **Before writing `createDiscussion` in `wise.js`** — confirm the `classId` resolution strategy with Kiran (1:1 class model vs shared).
- **Before the `assignToWise` migration** — confirm the tutor-side UI state (what Session 13 or earlier already built vs what Session 16 needs to add).
- **Before Node 22 upgrade deploy** — local test first, then deploy as the last change of the session.
- **Before ANY hosting deploy** — `python3 build_index.py` first. See [feedback_psm_build_before_deploy.md](~/.claude/projects/-Users-kiranshay-projects/memory/feedback_psm_build_before_deploy.md). Session 15 shipped a blank page because I forgot this step.

### Close out

Write `docs/PHASE_3_SESSION_16.md` + kickoff for Session 17 (real family rollout — flip `WISE_WRITE_ENABLED`, assign first real PSMs, monitor).

### Constraints carrying forward

- **No slop.**
- **ats-portal commit override applies:** Claude may commit + push directly with short user-voice messages, no Co-Authored-By.
- **No bundler.** `build_index.py` produces `index.html`, always run before hosting deploys.
- **Every new function must do its own Firebase Auth check internally.**
- **`gcloud auth application-default login`** before any admin SDK commit — Session 16's re-extraction definitely needs this.
- **CI workflow check**: verify `.github/workflows/deploy.yml` runs `build_index.py` too. If not, fix it.
- **PSM scores are portal-only. Wise only sees the tutor-initiated discussion for new PSM assignments.** Never a chat, never a score post-back.
