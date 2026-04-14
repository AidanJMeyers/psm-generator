# Phase 2 — Session 1: Schema Decision & Session Plan

**Date:** 2026-04-13
**Session type:** Design only. **Zero code changes this session.**
**Parent docs:** [PHASE_2_PORTAL_PROMPT.md](PHASE_2_PORTAL_PROMPT.md) · [AUTH_MIGRATION_PLAN.md](AUTH_MIGRATION_PLAN.md) · [AUTH_MIGRATION_SESSION_1.md](AUTH_MIGRATION_SESSION_1.md) · [AUTH_MIGRATION_SESSION_2.md](AUTH_MIGRATION_SESSION_2.md)
**Outcome:** this document, committed to the repo. Session 2 implements the schema migration.

---

## Scope decision (the most important call in this session)

The [Phase 2 prompt](PHASE_2_PORTAL_PROMPT.md#L17-L23) frames the portal as **read-only**: students and parents log in and see progress, nothing more. That framing was incomplete. The actual product vision — confirmed in this session — includes **student answer entry**: students log into the portal, type their per-question responses to assigned worksheets, and the system logs performance. Tutors see an auto-generated missed-question report.

That changes the architectural requirements. A read-only schema and a writable schema look different in Firestore because rules can gate subcollection docs independently from parent docs, but cannot gate individual fields within a doc.

**Decision:** Design Phase 2's schema for the full vision — read-only portal first, student answer entry later — in a single schema migration. Explicitly **decouple from worksheet regeneration**: submissions store per-question responses whether or not worksheets have machine-readable keys. Auto-grading is a future unlock when worksheets get regenerated, not a Phase 2 commitment.

**Rationale:**

- The [Phase A/B allowlist precedent](AUTH_MIGRATION_SESSION_1.md#L82) already shipped `studentIds: []` on admin docs specifically so Phase 2 wouldn't require a second allowlist migration. That same principle applies here: design the schema once for the known future, not twice.
- The "I'd be comfortable trying to sell this someday" product aspiration makes a future migration significantly more expensive (real customer data) than doing the design work now (no customer data yet).
- The marginal cost of including submissions in this session's design is ~30-45 minutes of brainstorming and ~150 lines of spec. There is **no additional code this session** in either scope — submissions subcollection is created lazily by Firestore on first write, and no first write happens until Session 5.

## Migration risk: what the numbers actually show

The Phase 2 prompt worried about "probably 200+ touch points" for an Option A rewrite. Grep against [app.jsx](../app.jsx) contradicts that:

| Metric | Count |
|---|---|
| `students` references | ~80 |
| `setStudents` call sites | ~28 |
| `students.map/find/filter/...` | ~18 |
| **`fsWrite` call sites** | **2** ([app.jsx:1047](../app.jsx#L1047), [app.jsx:1053](../app.jsx#L1053)) |
| **`onSnapshot` listeners** | **1** ([app.jsx:1016](../app.jsx#L1016)) |

The Firestore boundary is a ~40-line island at [app.jsx:1008-1054](../app.jsx#L1008-L1054). Everything else is pure React state management. Migration blast radius for Option A is the sync layer, not the business logic. The "200 touch points" concern was over-stated because it counted every React state read as a touch point — but those don't care where the data came from, as long as the `students` array shape is preserved.

This is the crucial observation that unlocks (1-modified) without ballooning into a multi-session rewrite: **we keep the React state shape identical and only rewrite the persistence layer.**

## Schema

### Firestore layout (post-migration)

```
psm-data/
  main                          LEGACY. Kept for the 24-hour dual-write grace
                                period and thereafter as the home for
                                customAssignments. A `migratedAt` tombstone
                                field marks that students[] is no longer
                                authoritative.

students/
  {studentId}                   One doc per student. Visible to:
                                - tutor/admin: read + write
                                - student (their own): read
                                - parent (their linked children): read
    {
      id,                       duplicated in field for query convenience
      name, grade, tutor, dateAdded,
      assignments: [...],       VERBATIM from blob — OneDrive URLs preserved
      scores: [...],            VERBATIM from blob
      diagnostics: [...],       VERBATIM from blob
      welledLogs: [...],        VERBATIM from blob
      deleted: false,
    }

    _private/
      info                      Subcollection doc. Visible to tutor/admin only.
        { notes: "..." }        The one tutor-only field from the current
                                schema. Split out of the parent doc because
                                Firestore rules cannot gate individual fields.

    submissions/
      {submissionId}            Subcollection. Student-written.
        {
          assignmentId,
          worksheetRef,
          responses: [ {questionIndex, studentAnswer}, ... ],
          submittedAt,
          status: "draft" | "submitted" | "reviewed",
          reviewedAt,
          reviewerNotes,
        }

allowlist/
  {emailLowercase}              UNCHANGED from Phase B. Already supports
                                studentIds[] for parent multi-child.
```

### Key structural decisions

1. **Historical arrays (`assignments`, `scores`, `diagnostics`, `welledLogs`) stay as arrays on the parent doc.** The only structural change in this migration is splitting out `notes` and adding the new `submissions/` subcollection. Arrays-vs-subcollections for the historical fields is a future optimization gated on real scale pressure, not a Phase 2 commitment. Rationale: tutor writes are the sole writers of historical arrays, so there are no write-collision or rule-scoping reasons to split them. Splitting them would force a ~200-touch-point rewrite of the existing tutor code for marginal benefit.

2. **`customAssignments` stays in `psm-data/main`.** It's not per-student, so there's no structural reason to move it. Leaving it eliminates a code-path change.

3. **`_private/info` is a subcollection doc, not a field.** This is the only way to hide a field from students under Firestore's rule model. It costs one extra read per tutor StudentProfile view (~51 reads per tutor session worst case). Negligible.

4. **`submissions/` is the only write-heavy subcollection** and the only place two principals (tutor reviewing + student editing) might touch concurrently. It exists precisely because it needs independent rules and independent writes. Other subcollections would be premature.

5. **One submission doc per attempt.** If a student retakes a worksheet, a new submission doc is created. Old attempts are preserved as history.

6. **Drafts are mutable, submitted submissions are immutable from the student side.** Rules enforce that a student can only update their own submission while `status == "draft"`, and can only transition `draft → submitted` (never `submitted → draft`). This preserves data integrity of the missed-question report — a student cannot retroactively rewrite answers after seeing tutor feedback.

7. **Grading is deferred but schema-compatible.** The `responses` array entries contain `{questionIndex, studentAnswer}`. A `correct: boolean` field can be added later without migration, populated either by tutor review or by auto-grading if worksheet keys become structured data.

### Firestore rules (Phase 2 target shape)

The exact rules text is finalized in Session 2. This is the behavioral spec.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Existing helpers from Phase B (unchanged):
    //   isWorkspaceUser, emailKey, isAllowlisted, allowlistRole, isAllowlistAdmin

    function allowlistStudentIds() {
      return get(/databases/$(database)/documents/allowlist/$(emailKey())).data.studentIds;
    }
    function isTutorOrAdmin() {
      return isWorkspaceUser()
        || (isAllowlisted() && allowlistRole() in ['tutor', 'admin']);
    }
    function isLinkedToStudent(studentId) {
      return isAllowlisted()
        && allowlistRole() in ['student', 'parent']
        && studentId in allowlistStudentIds();
    }
    function canReadStudent(studentId) {
      return isTutorOrAdmin() || isLinkedToStudent(studentId);
    }

    match /allowlist/{email} {
      allow read, write: if isAllowlistAdmin();
    }

    match /psm-data/main {
      // Legacy blob. During grace window, tutors still write here.
      // customAssignments lives here permanently.
      allow read, write: if isTutorOrAdmin();
    }

    match /students/{studentId} {
      allow read:  if canReadStudent(studentId);
      allow write: if isTutorOrAdmin();

      match /_private/{doc} {
        allow read, write: if isTutorOrAdmin();
      }

      match /submissions/{submissionId} {
        allow read: if canReadStudent(studentId);

        allow create: if isLinkedToStudent(studentId)
          && request.resource.data.status == 'draft';

        allow update: if isLinkedToStudent(studentId)
          && resource.data.status == 'draft'
          && request.resource.data.status in ['draft', 'submitted'];

        allow write:  if isTutorOrAdmin();
        allow delete: if isTutorOrAdmin();
      }
    }

    match /{document=**} {
      allow read, write: if isWorkspaceUser();
    }
  }
}
```

**Important:** `isWorkspaceUser()` stays in the OR chain because Phases C and D of the auth migration remain deferred. Phase 2 does not force the workspace gate to come down.

**Caveat:** these rules are untested as of this spec. Session 2 will write them into [firestore.rules](../firestore.rules), verify via the Firebase rules simulator, and deploy only after verification. Approving this section of the spec means approving the *shape and behavior*, not certifying the rules as correct.

## Migration procedure

### Strategy: big-bang + 24-hour dual-write grace period (BB + R2)

Chosen over incremental migration because:
- Only 51 students — no partial-migration scenario helps
- Dual-write grace eliminates the data-loss risk on rollback
- Single cutover event is simpler to reason about than a rolling one

### The migration script (`scripts/migrate_to_per_student.mjs`)

One-shot Node script using `firebase-admin` (not the web SDK). Admin privileges bypass rules, which is what we want for a one-time migration.

**Behavior:**

1. Read `psm-data/main` once.
2. For each entry in `students[]`:
   - Extract `notes` field.
   - Write the remaining fields (name, grade, tutor, dateAdded, assignments, scores, diagnostics, welledLogs, deleted) to `students/{studentId}`.
   - Write `{notes}` to `students/{studentId}/_private/info`.
   - Copy `assignments[]` byte-for-byte. **OneDrive URLs are not rewritten, reformatted, or validated.** Whatever the current state is, it is preserved.
3. Add a `migratedAt: <timestamp>` field to `psm-data/main`.
4. Print a summary: N students migrated, M `_private/info` docs written, any errors.

**Idempotency:** safe to re-run. If `students/{id}` exists and matches the blob's current state, skip.

**No deletion.** The script never removes `psm-data/main.students[]`. The blob stays intact as a rollback anchor.

**Dry-run flag:** `--dry-run` prints what the script would write without writing. Required before any real run.

**No staging Firestore project.** The dry-run output is the verification gate. Setting up a staging project is real engineering work and the 100-line migration script has a low bug surface. If Session 2 reveals scheduled Firestore exports exist, we reconsider.

### Client code changes (Session 2 work)

Two `useEffect`s in [app.jsx:1008-1054](../app.jsx#L1008-L1054) are rewritten. React state shape is preserved — `students` stays as an array.

**Read path (replaces the single `onSnapshot`):**

- Collection listener on `/students` → maps snapshot docs into the `students` array.
- Separate listener on `psm-data/main` → pulls `customAssignments` (still lives there).
- Two listeners total. Both feed into the existing React state the same way `setStudents` / `setCustomAssignments` do today.

**Write path (dual-write during grace period, gated by `DUAL_WRITE_GRACE` flag):**

- On `students` state change: batch-write all 51 student docs to `students/{id}`.
- If `DUAL_WRITE_GRACE === true`, also write to `psm-data/main.students` via the existing `fsWrite`.
- Batch-writing all students on every state change is wasteful (N writes per change where N = 51) but matches current blob-overwrite semantics. Optimization to diff-and-write-only-changed is deferred as a Session 3+ cleanup item.

**Notes write path:** notes are written via a new `saveStudentNotes` helper, not inside the batch. Rationale: notes change rarely (on user edit, debounced), not on every React state mutation. Mixing them into the batch would fire notes writes on unrelated changes.

### Cutover sequence (Session 2, manual steps by Kiran)

Claude does not touch production Firestore. Claude does not deploy rules. Claude does not push client code. All of the following are manual.

1. Deploy new rules to a test project or verify extensively via Firebase rules simulator. No production deploy yet.
2. Run the migration script locally with `--dry-run`. Review the output. Confirm student count matches blob.
3. Run the migration script for real against production Firestore. The blob is untouched except for the `migratedAt` tombstone.
4. Spot-check 3 students in Firebase Console. Confirm per-student docs match the blob. Confirm `_private/info` docs have notes. Confirm OneDrive URLs in `assignments[]` are intact.
5. Deploy new `firestore.rules` to production: `firebase deploy --only firestore:rules`.
6. Push the new client code with `DUAL_WRITE_GRACE = true`. Production now reads from `students/` collection and writes to both locations.
7. Monitor for 24 hours. Watch for tutor reports, console errors, missing data.
8. Flip `DUAL_WRITE_GRACE = false`. Rebuild. Push. Grace window closed.

### Rollback

**During step 3 (migration just finished, client not yet deployed):** delete the `students/` collection. Blob is untouched. Zero user impact.

**During steps 5-7 (rules deployed, new client live, within grace window):** revert the client commit and push. Old client reads the still-fresh blob (dual-write kept it current). Optionally revert the rules deploy. Leave `students/` in place as orphaned data. **Zero data loss.** Time to rollback: ~5 minutes.

**After step 8 (grace window closed):** rollback requires a reverse-migration script that reads `students/` and reconstructs `psm-data/main.students[]`, then reverts the client. Hours, not minutes. **This is the post-grace risk window.** Mitigation: only close the grace window after 24 clean hours with no reports.

## Session plan

| # | Session | Ships | Risk |
|---|---|---|---|
| **1** | **Brainstorm + spec (THIS SESSION)** | This document only. Zero code. | None |
| **2** | Schema migration + sync layer rewrite + cutover | Migration script, new `firestore.rules`, new client read/write paths, `DUAL_WRITE_GRACE` flag. Kiran runs the migration + cutover. Grace period begins. | **High** |
| **3** | Read-only student portal UI | `RoleRouter`, `StudentPortal` component, Score Trends chart. Testable via `?dev=1&role=student`. | Low |
| **4** | Parent portal UI | `ParentPortal` component (mostly reuse of StudentPortal), child-switcher. | Low |
| **5** | Student answer entry | `SubmissionEditor` component, draft autosave, submit-lock behavior. First time the `submissions/` subcollection is exercised. | Medium |
| **6** | Tutor missed-question review UI | Tutor-side view of a student's submissions, auto-generated missed-question report. Lives inside the existing tutor `StudentProfile`. | Low |
| **7** | Production rollout | Real student/parent allowlist entries via admin UI, coordinate with Aidan to email families, monitor. | Medium |

Every session after this one starts with its own spec-review → plan → review cycle. Each session ships independently and can be paused or reordered.

## Non-goals for Phase 2

Explicitly out of scope. The spec names them so future sessions don't scope-creep into them.

1. **Worksheet regeneration into structured data.** The "AI recreates worksheets + keys" vision is a separate project. Phase 2 schema does not depend on it. The submission shape works whether or not worksheets have machine-readable keys.
2. **Auto-grading.** Phase 2 stores student answers but does not grade them. Tutors manually mark correct/incorrect during review. Auto-grading is unlocked by worksheet regeneration.
3. **Assignable YouTube videos.** Mentioned in the product vision, not in Phase 2. Same tutor-assigns/student-consumes pattern as submissions; deferred to its own project.
4. **OneDrive folder inventory and backup.** Kiran flagged "it's on my computer I think" during Session 1 — this is a single-point-of-failure concern for the authoritative OneDrive folder organization. Logged here, not a Phase 2 problem.
5. **Auth migration Phases C and D.** Still deferred. Phase 2 keeps `isWorkspaceUser()` in the rules OR chain. Phase 2 does not force the workspace gate to come down.
6. **Full subcollection split of historical arrays.** `assignments`, `scores`, `diagnostics`, `welledLogs` stay as arrays on the parent doc. Splitting them is a future optimization gated on real scale pressure.
7. **Custom claims for auth.** Allowlist-collection-based rules remain. Upgrade path documented in [AUTH_MIGRATION_PLAN.md](AUTH_MIGRATION_PLAN.md) is not triggered by Phase 2.
8. **Real-time messaging / chat / billing views.** Already out of scope per the [original Phase 2 prompt](PHASE_2_PORTAL_PROMPT.md#L208-L210). Reiterating.
9. **Mobile responsive for the tutor app.** Tutor app stays desktop-only. The student/parent portal pages need basic responsive behavior (students will open it on phones) but that's a Session 3/4 UI concern, not a schema concern.
10. **Bundler / build tool introduction.** Phase 2 does not require a bundler. If a future session appears to need one, the session stops and asks Kiran before adding one.

## Open questions deferred to later sessions

These are intentionally unresolved. Each is scoped to the session that actually needs the answer.

- **Aidan's privacy review.** The schema assumes `notes` is the only tutor-only field. If Aidan flags others during his review, they get added to `_private/info` as additional fields — zero schema change. **Trigger: before Session 7 rollout.**
- **Score Trends chart library.** Recharts via CDN? Chart.js? Hand-rolled SVG? Constrained by the no-bundler rule. **Trigger: Session 3.**
- **Parent child-switcher UX.** Always-visible vs only-for-multi-child parents. **Trigger: Session 4.**
- **Initial student/parent rollout scope.** Pilot with 3-5 students first, or all 51 at once? **Trigger: Session 7.**
- **Retention / history UI for old submissions.** How does the student see their past attempts? Tab? Collapsible list? **Trigger: Session 5.**

## What changes in Session 2

Session 2's implementation plan will cover, in order:

1. **Write the full `firestore.rules`** matching the shape in this spec, replacing the Phase 2 scaffold comment block in [firestore.rules](../firestore.rules) with the live rules.
2. **Write the migration script** `scripts/migrate_to_per_student.mjs` with `--dry-run` support. Add a brief `scripts/README.md` if one doesn't exist.
3. **Rewrite the client sync layer** at [app.jsx:1008-1054](../app.jsx#L1008-L1054):
   - Replace the single `onSnapshot` with two listeners (students collection + legacy blob for customAssignments).
   - Replace the single `fsWrite({students})` with a batch write to `students/{id}` plus dual-write to the blob while `DUAL_WRITE_GRACE === true`.
   - Add `DUAL_WRITE_GRACE` constant near `USE_ALLOWLIST_AUTH`.
   - Add `saveStudentNotes` helper for writing `_private/info`.
4. **Verify the tutor flow is unchanged** via dev bypass. The entire existing tutor UI should work identically — this is the regression gate.
5. **Ship** the code to a Kiran-run cutover sequence (the 8-step procedure above). Claude writes; Kiran runs every production operation.

Session 2 does NOT include: building any portal UI, exercising the submissions subcollection, or touching `AppInner` beyond what's required for the sync layer rewrite.

## Checkpoint

This session is complete when:
- [x] Schema decision made and rationale captured
- [x] Migration procedure defined with rollback plan
- [x] Session plan revised to account for writable submissions
- [x] Non-goals explicitly named
- [x] This spec committed to the repo
- [x] Kickoff prompt for Session 2 appended below (so a fresh Claude can pick up cold)
- [ ] Kiran reviews the spec and commits
- [ ] Kiran `/clear`s and starts Session 2 using the kickoff prompt below

## Session workflow (applies to every Phase 2 session)

To minimize token usage across sessions, every Phase 2 session follows this pattern:

1. **Fresh session.** Kiran pastes the kickoff prompt from the end of the previous session's doc.
2. **Read cold.** The fresh Claude reads the linked docs, not any prior conversation history.
3. **Plan before code.** First action is `superpowers:writing-plans` to produce an implementation plan from the spec.
4. **Plan review.** Kiran approves the plan before any code is touched.
5. **Execute.** Claude implements, pausing at natural checkpoints for Kiran to verify and push.
6. **Close out.** At session end, Claude writes `PHASE_2_SESSION_N.md` capturing what actually shipped, any deviations from plan, and a kickoff prompt for the next session.
7. **`/clear` between sessions.** No conversation carries over. The written docs are the handoff.

This matches the Phase A/B pattern: [AUTH_MIGRATION_SESSION_1.md](AUTH_MIGRATION_SESSION_1.md) and [AUTH_MIGRATION_SESSION_2.md](AUTH_MIGRATION_SESSION_2.md) are the precedent. Each one documents what shipped and sets up the next.

---

## Kickoff prompt for Session 2

> Copy everything between the horizontal rules below into a fresh Claude Code session, after running `/clear` in the psm-generator workspace.

---

I'm ready to start **Phase 2 Session 2** of psm-generator: the schema migration, sync layer rewrite, and production cutover. This session is **HIGH risk** — it migrates production Firestore and rewrites the core data sync path that every tutor depends on. Proceed carefully.

**Confirm today's date with me at session start before doing anything else.**

### Read these in order before any planning or code

1. **`docs/PHASE_2_SESSION_1.md`** — the authoritative spec. All schema decisions, the migration procedure, the rules shape, and the "What changes in Session 2" section are in there. **This is your primary reference and overrides the original Phase 2 prompt wherever they differ.**
2. **`docs/PHASE_2_PORTAL_PROMPT.md`** — the original Phase 2 briefing. Context only. Session 1 resolved the Option A/B/C decision and renegotiated scope; the Session 1 spec is authoritative.
3. **`docs/AUTH_MIGRATION_PLAN.md`**, **`docs/AUTH_MIGRATION_SESSION_1.md`**, **`docs/AUTH_MIGRATION_SESSION_2.md`** — Phase 2 sits on top of the auth migration. Phases A and B are shipped; C and D are deferred.
4. **`firestore.rules`** — the current live rules. Session 2 rewrites them.
5. **`app.jsx`** — specifically:
   - Lines ~290-320: `FS_DOC`, `fsWrite`, `USE_ALLOWLIST_AUTH`, `getAllowlistEntry`.
   - Lines ~1008-1054: the sync layer being rewritten.
   - Skim `StudentProfile` for how `assignments/scores/diagnostics/welledLogs` are read from the student object today.

### Then, before touching ANY code

- Invoke the **`superpowers:writing-plans`** skill to produce a detailed Session 2 implementation plan. The "What changes in Session 2" section of `PHASE_2_SESSION_1.md` is your starting point.
- Present the plan to me for review.
- **Do not start implementing until I approve the plan.**

### Constraints that must not be violated

- **Do NOT touch OneDrive URLs in `student.assignments[]`.** The migration copies the entire array byte-for-byte. No rewriting, no reformatting, no "helpful" cleanup. This is a hard constraint — breaking it breaks the current system in ways that are immediately visible to tutors.
- **Do NOT flip `USE_ALLOWLIST_AUTH`.** Phases C and D of the auth migration are still deferred. Phase 2 does not depend on them and must not force them.
- **Do NOT commit, push, or deploy.** Every operation that touches production is manual, by me. You write code; I run production operations.
- **Do NOT run the migration script against production.** I run it. The `--dry-run` flag is required on the first run, and I verify the output before any real run.
- **Verify the tutor flow is unchanged** via dev bypass (`?dev=1`) as your regression gate before claiming the sync layer rewrite is done. The existing tutor UI should behave identically after the rewrite — if anything behaves differently, stop and tell me.
- **Honor the feedback memory:** no slop, no AI-generated filler in docs or comments. Only write a comment when the *why* is non-obvious.

### Pause at the first natural checkpoint

Session 2 is big. Do not batch everything into one push. Good checkpoints:

- **After `firestore.rules` is rewritten but not deployed** — I verify the rules logic, optionally test in the rules simulator.
- **After the migration script is written but not run** — I read the script end to end, we discuss, then I dry-run it.
- **After the client sync layer is rewritten but the code has not been pushed** — I run it locally via dev bypass, verify the tutor flow, then push.
- **After the client code is pushed but before `DUAL_WRITE_GRACE` is flipped off** — we monitor for 24 hours before closing the grace window.

Stop at the first one. Report status. Wait for me to push the work or tell you to continue.

### Close out at the end of Session 2

When Session 2's work is done (or when we decide to stop for the day), write `docs/PHASE_2_SESSION_2.md` capturing:
- What actually shipped (vs. what was planned).
- Any deviations from the Session 1 spec, with reasons.
- Any new open questions or risks discovered.
- A **kickoff prompt for Session 3** at the bottom, same pattern as this one.

Then I commit that doc, `/clear`, and start Session 3 fresh.

---

