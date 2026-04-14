# Phase 2 — Session 7 Plan: Real Rollout + Workspace Gate Removal + Non-Gmail Audit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is heavier on Kiran-operations than code; every "deploy" / "flag flip" / "allowlist write" step is Kiran-only.

**Goal:** Ship the real student/parent portal rollout as a single coordinated cutover that also retires the `@affordabletutoringsolutions.org` workspace gate, while running a parallel non-Gmail family audit whose result decides whether Session 8 builds email/password auth or not.

**Architecture:** One flag flip (`USE_ALLOWLIST_AUTH = false → true`), staged over two checkpoint-gated days. Day 1: seed tutor + pilot-family allowlist entries, flip the flag, 24h silent monitoring window. Day 2: rules cleanup dropping `isWorkspaceUser()` + the `{document=**}` fallthrough + two Session-6 rules-tightenings. Pilot expansion to remaining families only after both flips prove stable. Non-Gmail audit (Kiran + Aidan) runs in parallel, blocking nothing.

**Tech Stack:** No new dependencies. Firestore rules + `firebase deploy`. Single `app.jsx` constant flip. Existing `AdminsTab` UI for allowlist seeding.

**Parent docs:** [PHASE_2_SESSION_1.md](PHASE_2_SESSION_1.md) (§Session plan row 7, §Open questions) · [PHASE_2_SESSION_6.md](PHASE_2_SESSION_6.md) (§Follow-ups queued for Session 7 planning, §Open questions and risks) · [PHASE_2_SESSION_2.md](PHASE_2_SESSION_2.md) (rules shape + change-management discipline) · [AUTH_MIGRATION_PLAN.md](AUTH_MIGRATION_PLAN.md) (Phase C/D this replaces).

---

## Sequencing (the single most important decision, for history)

Locked in during planning: **Option 1 — one coordinated cutover.** The rollout flip and follow-up A (workspace gate removal) share a flag. Splitting them across two sessions doubles flag-flip events without reducing per-event risk. Follow-up B (non-Gmail audit) is pure Aidan coordination and runs in parallel — it blocks nothing and only affects whether Session 8 exists.

**Pilot scope:** 3–5 families first wave, not all 51. Rationales (from Session 6 review): (a) Session 2 closeout flagged that most students have 0 assignments / 0 scores / 0 diagnostics, so the portal will be visibly empty for most families — pilot lets us see which families have data worth showing before the mass email goes out; (b) per-ticket support cost favors small-N first wave.

**DUAL_WRITE_GRACE:** left alone. Session 7 does not touch [app.jsx:505](../app.jsx#L505). Flipping it to `false` is a separate Session 2 cleanup on Kiran's timeline. Different rollback story, different monitoring signal.

**Aidan's privacy review of tutor-only fields:** assumed complete with no new fields needed. Plan proceeds with `_private/info` continuing to house only `notes`. If Aidan surfaces additional fields mid-session, they get added to `_private/info` and do not require schema or rules changes.

**Parent access to review fields (Session 6 §Open questions):** locked in as **option (b) — document as intentional.** `scoreCorrect / scoreTotal / reviewerNotes / reviewedAt` stay visible to parents. Rationale: these are per-submission grading feedback, i.e. "your kid got 7 out of 10," which is exactly the kind of thing a parent portal should expose. Option (a) — moving to a tutor-only `_private/review` subcollection — is real work (tutor panel rewrites its read + write path) and would be the right call only if `reviewerNotes` were tutor-to-tutor communication rather than feedback-about-the-work. Flagged for override if Kiran disagrees at Checkpoint A.

---

## Pre-flight state (verified at plan-write time, 2026-04-14)

- [app.jsx:497](../app.jsx#L497): `USE_ALLOWLIST_AUTH = false` — portal has never been reachable via real sign-in.
- [app.jsx:505](../app.jsx#L505): `DUAL_WRITE_GRACE = true` — Session 2's grace window still open. Left untouched.
- [firestore.rules:59-62](../firestore.rules#L59-L62): `isTutorOrAdmin()` OR chain with `isWorkspaceUser()` — target of follow-up A.
- [firestore.rules:107-109](../firestore.rules#L107-L109): `allow update` on `/students/{id}/submissions/{sub}` currently has no field-name restriction — target of Session-6 tightening.
- [firestore.rules:120-122](../firestore.rules#L120-L122): `match /{document=**}` fallthrough — target of follow-up A.
- [app.jsx:1048](../app.jsx#L1048) `AdminsTab` + [app.jsx:1113](../app.jsx#L1113): already writes `studentIds: []` for student/parent roles. No admin-UI blockers.
- [app.jsx:883](../app.jsx#L883) `RoleRouter`, [app.jsx:3767](../app.jsx#L3767) `StudentPortal`, [app.jsx:3933](../app.jsx#L3933) `ParentPortal`: all in place from Sessions 3–4.
- Allowlist currently contains 3 admin entries (`kiranshay123@gmail.com`, `aidan.meyers12@gmail.com`, `aidan.wolf2005@gmail.com`) + whatever tutor entries Kiran added via Auth Session 2 Step 3 local-test. **Verification in Task 1 below will enumerate the exact set.**

---

## File structure

Files this plan creates or modifies:

- **Modify** [app.jsx:497](../app.jsx#L497) — single-line flag flip `USE_ALLOWLIST_AUTH = false → true`. The only source code change in Session 7.
- **Modify** [firestore.rules](../firestore.rules) — three edits in Phase III: drop `isWorkspaceUser()` from `isTutorOrAdmin()`, drop the `{document=**}` fallthrough match block, and tighten the student-side `allow update` on submissions with a field-name hasOnly restriction.
- **Modify** [index.html](../index.html) — rebuilt via `python3 build_index.py` after the `app.jsx` flag flip. Committed in the same commit as the `app.jsx` change per Session 6 closeout discipline.
- **Create** `docs/PHASE_2_SESSION_7.md` — session closeout doc at session end. Includes a Phase 2 retrospective covering Sessions 1–7 and a Phase 3 kickoff prompt.
- **No new tests.** The helpers, hooks, and components exercised by Session 7 are all from Sessions 3–6 with existing test coverage (84/84 green). Session 7's changes are config (flag flip), rules (untestable without a rules simulator or emulator, which we don't run locally), and operational (allowlist seeding). The verification gates in each Phase are live sign-in walkthroughs under dev bypass and real Google auth, not unit tests.

---

## Phase I — Pre-flip prep (Kiran-operations heavy, no source commits)

Goal: walk into the flag flip with (a) a known-good allowlist for every tutor who will need access, (b) pilot family entries created and spot-checked, (c) a fresh dev-bypass walkthrough of every role under the allowlist path so we know the portal works end-to-end before real users touch it.

### Task 1: Inventory the current allowlist

**Files:** none (read-only Firebase Console operation by Kiran; Claude reads app.jsx to document what the UI shows)

- [ ] **Step 1: Kiran opens the Admins tab** in the running app under `?dev=1&role=admin` (or via workspace sign-in since `USE_ALLOWLIST_AUTH` is still `false`, which means `currentUserEntry` is null and the Admins tab is hidden — so use `?dev=1&role=admin` locally).

- [ ] **Step 2: Kiran screenshots the current allowlist table** and shares it back. Claude records the exact set of entries inline in this plan before proceeding.

- [ ] **Step 3: Claude identifies gaps** by cross-referencing against the tutor list from [AUTH_MIGRATION_SESSION_2.md §"Plan discrepancy resolved"](AUTH_MIGRATION_SESSION_2.md#L12) — the three known-email tutors (Danielle Desrochers, Maryam Alrahmani, and anyone else Aidan has since surfaced) plus the three admins. Anyone currently relying on the workspace gate who isn't in the allowlist will be locked out when the flag flips. Gap list goes in the Session 7 closeout.

- [ ] **Step 4: Checkpoint gate.** Do not proceed to Task 2 until Kiran has eyes on the gap list and confirms whether any missing tutors need to be chased (Aidan coordination) or whether we proceed with the known set.

### Task 2: Seed any missing tutor allowlist entries

**Files:** none (Kiran operation via AdminsTab UI)

- [ ] **Step 1: Kiran signs in locally** via `?dev=1&role=admin` (required because `USE_ALLOWLIST_AUTH` is still `false` and the real workspace sign-in path does not set `currentUserEntry`, so the Admins tab would not render).

- [ ] **Step 2: For each gap identified in Task 1**, Kiran uses the Admins tab "Add entry" form to create an allowlist doc with:
  - `email`: lowercased
  - `role`: `"tutor"` (or `"admin"` if that tutor also manages the allowlist)
  - `studentIds`: empty array
  - `active`: `true`

  Form handles this at [app.jsx:1113](../app.jsx#L1113) — `studentIds` defaults to `[]` for non-student/parent roles. No Firebase Console direct-write needed.

- [ ] **Step 3: Kiran verifies** the new rows appear in the Admins table after each add.

- [ ] **Step 4: No commit.** Allowlist writes are Firestore state, not source changes.

### Task 3: Identify the 3–5 pilot families

**Files:** none (Kiran + Aidan decision)

- [ ] **Step 1: Kiran picks the pilot cohort.** Suggested selection criteria (Session 7 records whichever Kiran actually uses):
  - Families with at least 3 sessions' worth of data so the portal is not visibly empty on first load.
  - A mix of student-role and parent-role (to exercise both portals; parent with multi-child is even better).
  - Families Aidan has warm contact with, to minimize support cost on any "my kid can't sign in" tickets.
  - No families currently in crisis or mid-dispute — save those for wave 2.

- [ ] **Step 2: Claude records the pilot list** (student names + parent emails) inline in this plan before the entries are written, so the Session 7 closeout has a clean audit trail of who was in the pilot.

- [ ] **Step 3: Aidan confirms** the families are aware the portal is coming (soft heads-up, not the formal launch email which happens in Phase IV).

### Task 4: Seed pilot family allowlist entries

**Files:** none (Kiran operation via AdminsTab)

- [ ] **Step 1: For each pilot family**, Kiran looks up the student's document ID from the Firebase Console `/students` collection (the `id` field on the doc — matches `app.jsx` conventions). Kiran records the email → studentIds mapping inline in Session 7 closeout.

- [ ] **Step 2: Kiran writes the student-role entry** via the Admins tab:
  - Doc ID: student's Gmail (lowercased)
  - `email`: same
  - `role`: `"student"`
  - `studentIds`: `[<their student doc id>]`
  - `active`: `true`

- [ ] **Step 3: Kiran writes the parent-role entry** via the Admins tab:
  - Doc ID: parent's Gmail (lowercased)
  - `email`: same
  - `role`: `"parent"`
  - `studentIds`: `[<child doc id>]` (or multiple, if pilot family has multiple enrolled kids)
  - `active`: `true`

- [ ] **Step 4: Kiran spot-checks in Firebase Console** that each new allowlist doc has the exact shape above. `role` must be one of the four literal strings; `studentIds` must be an array (not a string, not null). A typo here is the most likely cause of a "my kid can't sign in" ticket at flip time.

- [ ] **Step 5: Checkpoint gate.** This is the first pause point from the Session 7 kickoff prompt: _"after the rollout allowlist entries are written but `USE_ALLOWLIST_AUTH` is not yet flipped."_ Kiran verifies all pilot entries in the Firebase Console before proceeding. Claude must stop here and wait for explicit approval to continue to Task 5.

### Task 5: Pre-flip verification pass under dev bypass

**Files:** none (Claude walks the paths in-browser via `?dev=1`)

- [ ] **Step 1: Tutor flow under `?dev=1&role=admin`.** Sign in, verify: Dashboard loads, student list renders, open a random student profile, open the Submissions tab, confirm Session 6's `TutorSubmissionsPanel` still renders, open the Admins tab and confirm pilot entries are visible. This is the tutor regression gate that Session 2 skipped — Session 7 does not repeat that mistake.

- [ ] **Step 2: Student flow under `?dev=1&role=student`.** Pick a pilot student's doc id. Manually set `DEV_FAKE_STUDENT_IDS` to `[<that id>]` (or use whatever dev bypass param supports single-student injection — see [app.jsx:687](../app.jsx#L687)). Verify: `StudentPortal` renders the student's name, Score Tracking / Assignment History / Score Trends / History tabs all work, `SubmissionEditor` opens without error, a draft can be created and saved.

- [ ] **Step 3: Parent flow under `?dev=1&role=parent`.** Same drill with a pilot parent's children. Verify: child switcher (if applicable), all tabs render, read-only paths work.

- [ ] **Step 4: Checkpoint gate.** Any failure here stops the plan. A broken portal path discovered post-flip is vastly more expensive than one discovered here. If Step 1/2/3 all pass, announce ready for Phase II.

---

## Phase II — Flag flip (the cutover moment)

Goal: flip `USE_ALLOWLIST_AUTH` to `true`, rebuild, commit, push. Rules are unchanged at this stage — the OR chain in `isTutorOrAdmin()` still contains `isWorkspaceUser()`, so the workspace path is still available as a safety net during the 24h silent window. Phase III removes it after stability is confirmed.

### Task 6: Flip the flag

**Files:**
- Modify: [app.jsx:497](../app.jsx#L497)
- Modify: [index.html](../index.html) (rebuilt artifact)

- [ ] **Step 1: Edit the flag.**

  ```javascript
  // app.jsx line 497
  const USE_ALLOWLIST_AUTH = true;
  ```

  Nothing else in `app.jsx` changes. The branches this flag already controls ([app.jsx:594,596,626,938,992,1031,1190](../app.jsx#L594) etc.) all do the correct thing when the flag is true — that's Phase A's entire purpose. Do not touch any of those call sites.

- [ ] **Step 2: Rebuild `index.html`.**

  Run: `python3 build_index.py`
  Expected: clean rebuild, no errors, `index.html` is regenerated from `app.jsx` via esbuild.

- [ ] **Step 3: Parse-check locally.**

  Run: `node --test tests/*.mjs`
  Expected: 84/84 tests pass (helpers unchanged; this is just confirming nothing in the test harness cares about the flag value).

- [ ] **Step 4: Open the built `index.html` in a browser locally** without `?dev=1`. This is the regression gate Session 2 skipped — surface any boot-time bug before push. Expected behavior: the sign-in screen renders with the allowlist-mode copy (`Sign in` header and the "Your email must be on the allowlist" messaging at [app.jsx:594,596,626](../app.jsx#L594)) instead of the old "Tutor sign-in" header. Do not actually sign in — just confirm the UI branches correctly.

- [ ] **Step 5: Commit.**

  ```bash
  cd /Users/kiranshay/projects/psm-generator
  git add app.jsx index.html
  git commit -m "phase 2 session 7: flip USE_ALLOWLIST_AUTH to true"
  git push
  ```

  Per psm-generator commit override: commit+push directly, short user-voice message, no Co-Authored-By.

- [ ] **Step 6: Checkpoint gate — silent window opens.** This is the second pause point from the kickoff prompt: _"after `USE_ALLOWLIST_AUTH = true` is pushed but before the family email goes out."_ 24h silent window starts now. **No family email, no Aidan broadcast, no pilot invites.** Kiran monitors: his own sign-in with `kiranshay123@gmail.com` (must work via allowlist path now, not workspace), any tutor Slack reports, any Firebase console auth errors. Claude stops and waits.

### Task 7: 24h silent-window monitoring

**Files:** none (Kiran monitoring; Claude records observations)

- [ ] **Step 1: Kiran confirms his own personal-Gmail sign-in works** via the production URL. This single sign-in is the whole point of follow-up A being coupled to the rollout — validates that the allowlist path is load-bearing before the workspace path is removed.

- [ ] **Step 2: Kiran confirms Aidan's sign-in works** with at least one of his two admin emails.

- [ ] **Step 3: Kiran confirms at least one non-admin tutor's sign-in works** (the seeded entries from Task 2). If anyone is locked out, Claude does NOT try to fix it by tweaking rules — the fix is adding the missing allowlist entry, which is a Kiran operation.

- [ ] **Step 4: Claude records what happens** in this plan inline (or in a scratch note for the Session 7 closeout). Any sign-in failure, rules error, or unexpected behavior is recorded with reproduction steps before fixing.

- [ ] **Step 5: Rollback procedure if things break.** Revert commit from Task 6 Step 5, rebuild `index.html`, push. The workspace gate is still intact in rules so tutors recover immediately. Time to rollback: ~5 min. **Only Kiran decides to rollback.** Claude flags problems, does not unilaterally revert.

- [ ] **Step 6: Checkpoint gate.** 24h clean window complete → proceed to Phase III. Any unresolved issue → stop and address before proceeding.

---

## Phase III — Rules cleanup (post-stability)

Goal: three edits to [firestore.rules](../firestore.rules) that collectively retire the workspace gate and tighten two Session 6 soft spots. All three ship in one rules file, one deploy. Claude writes the rules; Kiran deploys via `firebase deploy --only firestore:rules`.

### Task 8: Draft the rules changes

**Files:**
- Modify: [firestore.rules:59-62](../firestore.rules#L59-L62) (`isTutorOrAdmin` helper)
- Modify: [firestore.rules:107-109](../firestore.rules#L107-L109) (student submission update rule)
- Modify: [firestore.rules:120-122](../firestore.rules#L120-L122) (fallthrough match block)
- Consider: [firestore.rules:28-32](../firestore.rules#L28-L32) (`isWorkspaceUser` helper — see Step 4 below)

- [ ] **Step 1: Edit `isTutorOrAdmin` to drop the workspace OR.**

  Current at [firestore.rules:59-62](../firestore.rules#L59-L62):
  ```
  function isTutorOrAdmin() {
    return isWorkspaceUser()
      || (isAllowlisted() && allowlistRole() in ['tutor', 'admin']);
  }
  ```

  Replace with:
  ```
  function isTutorOrAdmin() {
    return isAllowlisted() && allowlistRole() in ['tutor', 'admin'];
  }
  ```

- [ ] **Step 2: Delete the `{document=**}` fallthrough match block.**

  Current at [firestore.rules:120-122](../firestore.rules#L120-L122):
  ```
  match /{document=**} {
    allow read, write: if isWorkspaceUser();
  }
  ```

  Delete the entire three-line block plus the preceding comment at [firestore.rules:118-119](../firestore.rules#L118-L119). Rationale: this was a workspace-only escape hatch for ad-hoc docs outside the explicit paths. Phase 2 schema enumerates every doc path we care about, so the fallthrough is load-bearing only for workspace users touching legacy ad-hoc state — and we're retiring workspace users entirely.

- [ ] **Step 3: Tighten the student submission update rule.**

  Current at [firestore.rules:107-109](../firestore.rules#L107-L109):
  ```
  allow update: if isLinkedToStudent(studentId)
    && resource.data.status == 'draft'
    && request.resource.data.status in ['draft', 'submitted'];
  ```

  Replace with:
  ```
  allow update: if isLinkedToStudent(studentId)
    && resource.data.status == 'draft'
    && request.resource.data.status in ['draft', 'submitted']
    && request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(['status', 'responses', 'updatedAt', 'submittedAt']);
  ```

  Rationale per Session 6 closeout §"Submission docs now carry a mix of student-written and tutor-written fields": students must not be able to write `scoreCorrect / scoreTotal / reviewedAt / reviewerNotes` into their own submission docs. The `affectedKeys().hasOnly(...)` gate restricts a student's update to only the fields `SubmissionEditor` actually writes. Tutor writes on the same doc go through the `allow write: if isTutorOrAdmin()` override at [firestore.rules:113](../firestore.rules#L113) which is evaluated separately and is not affected by this restriction.

  **Verification that this list is complete:** [app.jsx](../app.jsx) `SubmissionEditor` save paths. Claude verifies via Grep for `updateDoc` / `setDoc` on submission paths before finalizing the list. If any other student-written field name appears, it gets added to the `hasOnly` array. **This verification is a hard checkpoint — a wrong list breaks student draft saves silently.**

- [ ] **Step 4: `isWorkspaceUser` helper — keep or delete?**

  The helper at [firestore.rules:28-32](../firestore.rules#L28-L32) becomes unreferenced after Steps 1+2. Options:
  - **(a)** Delete the helper. Cleanest, eliminates dead code.
  - **(b)** Keep the helper as unused. Preserves it for Kiran to reference later if a workspace-only escape hatch is ever needed.

  **Recommendation: (a) delete.** Rationale: dead code rots, and reviving a workspace gate is not the goal — the point of follow-up A is that the workspace is going away. If a future escape hatch is needed, it is reachable through git history. Plan proceeds with (a) unless Kiran overrides at Checkpoint A.

- [ ] **Step 5: Update the comment block at the top of `firestore.rules`** ([firestore.rules:1-22](../firestore.rules#L1-L22)) to reflect the new state. Specifically: remove the line at [firestore.rules:18-19](../firestore.rules#L18-L19) that reads "Auth migration Phases C and D remain deferred, so `isWorkspaceUser()` is still part of `isTutorOrAdmin()`" — that is now false. Replace with a one-line note that the workspace gate was retired in Session 7 and reference the closeout doc.

- [ ] **Step 6: Rules file diff preview.** Claude shows Kiran the full diff of `firestore.rules` before Kiran touches any deploy command. This is the third pause point from the kickoff prompt: _"after follow-up A's rule changes are drafted but not deployed."_ Kiran reads the diff end-to-end and optionally tests in the Firebase rules simulator.

- [ ] **Step 7: Checkpoint gate.** Wait for Kiran's explicit "deploy these rules" confirmation before Task 9.

### Task 9: Deploy rules + smoke test

**Files:** none (deploy is Kiran operation)

- [ ] **Step 1: Kiran deploys.**

  ```bash
  firebase deploy --only firestore:rules
  ```

  Expected: one rules file uploaded, no compile errors. Any compile error is a hard stop — Claude fixes the rules file locally and returns to Task 8 Step 6.

- [ ] **Step 2: Post-deploy smoke test — tutor.** Kiran (as `kiranshay123@gmail.com`) reloads the app. Verify: signs in via allowlist, Admins tab accessible, student list loads, Submissions tab on a pilot student renders with any existing data, can save a test reviewer note.

- [ ] **Step 3: Post-deploy smoke test — student.** If a pilot family is willing to try a 2-minute sign-in right now, Kiran coordinates. Otherwise, Kiran uses `?dev=1&role=student` with a pilot student's id as a stand-in. Verify: `StudentPortal` loads, `SubmissionEditor` can save a draft (this is the rule we just tightened — a successful draft save confirms the `hasOnly` list is correct). If the draft save fails with `permission-denied`, the `hasOnly` list is missing a field — stop and debug the field list before any family is told to try signing in.

- [ ] **Step 4: Post-deploy smoke test — fallthrough removal.** Any client attempt to read a doc outside the explicit paths should now fail. Unlikely to surface unless there's a stale code path somewhere. Claude does a quick Grep of `app.jsx` for any Firestore read path that is not in `/students/**`, `/psm-data/main`, or `/allowlist/**`. Findings are recorded.

- [ ] **Step 5: Commit the rules change.**

  ```bash
  cd /Users/kiranshay/projects/psm-generator
  git add firestore.rules
  git commit -m "phase 2 session 7: retire workspace gate + tighten submission update rule"
  git push
  ```

- [ ] **Step 6: Checkpoint gate.** Tutor + pilot family flows confirmed working under allowlist-only rules → proceed to Phase IV. Any failure → stop, diagnose, do not expand rollout.

---

## Phase IV — Pilot expansion + family communication

Goal: Aidan sends the launch email to pilot families, Kiran monitors tickets, and once the pilot proves stable the remaining ~46 families are added in batches. This phase is almost entirely Aidan coordination — Claude writes language, does not send.

### Task 10: Draft the pilot family launch email

**Files:** draft lives inline in this plan until Aidan uses or edits it; then Claude records the final sent version in `docs/PHASE_2_SESSION_7.md` for audit trail.

- [ ] **Step 1: Claude drafts a short family-facing email.** Three paragraphs max: what the portal is, the URL, how to sign in with Google, what to do if it doesn't work (contact Aidan by whatever channel Aidan prefers). No mention of Phase 2, no mention of the rollout schedule, no marketing language. Plain, honest, short.

- [ ] **Step 2: Kiran reviews the draft.** Edits to taste. The voice is Aidan's (ultimately), so Kiran is reviewing for accuracy, not voice.

- [ ] **Step 3: Aidan receives the draft.** Aidan decides send-or-not and timing. **Claude does not send the email. Claude does not Cc families. Claude does not read from any contact list.**

- [ ] **Step 4: Record.** Whatever version Aidan actually sends (or declines to send) is recorded in the Session 7 closeout.

### Task 11: Pilot monitoring (24–48h)

**Files:** none

- [ ] **Step 1: Aidan forwards any family ticket** to Kiran. Common expected tickets: "I used a different email than you have in the allowlist" (fix: add it), "I can't find the sign-in button" (fix: UI copy tweak if frequent), "the page is empty" (expected for families with no data — pre-empt in the email).

- [ ] **Step 2: For each ticket, Claude records** the family, the root cause, and the fix inline in the Session 7 closeout. This is the observation data that decides whether wave 2 goes out at all.

- [ ] **Step 3: Checkpoint gate.** After 24–48h of pilot traffic:
  - If ticket rate ≤ 1 per family: pilot is green, proceed to Task 12.
  - If ticket rate is higher or the tickets reveal a systemic problem: stop, fix systemically before expansion. Do NOT expand rollout into known breakage.

### Task 12: Wave 2 — remaining families

**Files:** none (Kiran + Aidan operations)

- [ ] **Step 1: Kiran + Aidan decide wave-2 batching.** Options: all ~46 at once, two batches of ~23, or a rolling ramp. Plan does not pre-commit — the right batching depends on Phase IV ticket rate, and Kiran has the signal by the time this task runs.

- [ ] **Step 2: Kiran seeds wave-2 allowlist entries** via the Admins tab. Same pattern as Task 4: student-role doc, parent-role doc, spot-check.

- [ ] **Step 3: Aidan sends the wave-2 email** (reuse Task 10's draft or evolve it based on pilot feedback).

- [ ] **Step 4: Monitor** same as Task 11. Record in closeout.

### Task 13: Rollout complete — record final state

**Files:** `docs/PHASE_2_SESSION_7.md` (updated inline as Phases III+IV run — not a net new file at this step)

- [ ] **Step 1: Claude records in Session 7 closeout:** total families added to allowlist, ticket count, any systemic issues fixed mid-rollout, any families who were skipped and why (pre-existing disputes, etc).

- [ ] **Step 2: Checkpoint gate.** Rollout complete → proceed to Phase V.

---

## Phase V — Non-Gmail audit (parallel track, blocks nothing)

Goal: answer the "how many families don't have Gmail" question from Session 6 follow-up B with a real count so we can decide whether Session 8 builds email/password auth or whether we help 3–5 families create Google accounts. **This phase runs in parallel with Phases I–IV and does not gate any of them.**

### Task 14: Collect the audit data

**Files:** none (Aidan coordination)

- [ ] **Step 1: Kiran asks Aidan** for a count of non-Gmail primary-contact emails across the 51-family roster. Aidan has the Wise roster and is best positioned to eyeball this.

- [ ] **Step 2: Aidan reports back** with either an exact count or a range.

- [ ] **Step 3: Claude records the number** in this plan and in the Session 7 closeout.

### Task 15: Decide the next action based on the count

**Files:** `docs/PHASE_2_SESSION_7.md` (decision recorded inline); optionally `docs/SESSION_8_PASSWORD_AUTH_SPEC.md` (draft, not committed in Session 7)

- [ ] **Step 1: Decision rule** (pre-agreed during planning):
  - **0–5 families:** next action is "Aidan helps them make Google accounts" (~0 code). Session 8 does not exist for this reason. Record the decision in the closeout.
  - **6–15 families:** judgement call with Kiran. Lean toward "help them with Google accounts" unless there's a specific reason several families can't use Gmail.
  - **16+ families:** Session 8 exists. Claude drafts (does **not** commit) a scoping spec for email/password auth covering: Firebase provider enablement, password-reset flow, sign-in UI changes, `email_verified` rule gating, security model review. The draft spec lives as a local file that Kiran reviews and decides whether to commit as `docs/SESSION_8_PASSWORD_AUTH_SPEC.md`.

- [ ] **Step 2: Record the decision** in `docs/PHASE_2_SESSION_7.md` with the count and rationale.

- [ ] **Step 3: Checkpoint gate.** This is the fourth pause point from the kickoff prompt: _"after the non-Gmail audit count is known."_ Kiran reviews the count and decision before any Session 8 scoping happens.

---

## Phase VI — Session closeout + Phase 2 retrospective

### Task 16: Write `docs/PHASE_2_SESSION_7.md`

**Files:**
- Create: `docs/PHASE_2_SESSION_7.md`

- [ ] **Step 1: Claude writes the closeout** following the Session 6 structure:
  - **What shipped** — flag flip commit, rules cleanup commit, pilot + wave-2 allowlist entries (count), any email actually sent, non-Gmail audit result.
  - **What did not ship** — `DUAL_WRITE_GRACE` untouched, any deferred wave-3 families, any systemic issues logged but not fixed.
  - **Deviations from plan** — track anything that changed mid-session (pilot scope slipped, rules edits expanded, etc.)
  - **Open questions and risks** — anything surfaced in monitoring, anything Phase 3 inherits.
  - **Follow-ups for Phase 3** — whatever rolls forward.
  - **Commits** — oldest to newest with hashes, per Session 6 pattern.

- [ ] **Step 2: Phase 2 retrospective section.** Sessions 1–7. What the original Session 1 spec said vs what actually shipped session-by-session, noting the two significant scope pivots (Session 6's boolean-to-numeric review, Session 7's coupling of rollout with workspace gate removal). Lessons for Phase 3.

- [ ] **Step 3: Phase 3 kickoff prompt.** At the bottom of the file, a self-contained kickoff prompt for a fresh Claude session that inherits Phase 2's deferred work. Candidate items: close `DUAL_WRITE_GRACE`, password auth (if Task 15 pointed that way), per-question granularity in submission review, any systemic issue from Phase IV that warranted a separate session. Written in the voice and structure of the Session 7 kickoff prompt in `PHASE_2_SESSION_6.md`.

- [ ] **Step 4: Commit.**

  ```bash
  cd /Users/kiranshay/projects/psm-generator
  git add docs/PHASE_2_SESSION_7.md
  git commit -m "phase 2 session 7 closeout + phase 2 retrospective"
  git push
  ```

---

## Pause points summary (from Session 7 kickoff prompt)

Four natural checkpoints. Plan stops at the first one and waits for explicit continue:

1. **End of Task 4** — pilot allowlist entries written, flag not yet flipped. Kiran verifies Firebase Console state. → Task 5.
2. **End of Task 6** — flag flipped, pushed, 24h silent window. Kiran monitors sign-ins. → Task 7.
3. **End of Task 8** — rules diff drafted, not yet deployed. Kiran reads diff end-to-end, optionally runs rules simulator. → Task 9.
4. **End of Task 14** — non-Gmail audit count known. Kiran decides next action for Session 8. → Task 15.

**Stop at the first one.** Report status. Wait for Kiran to tell Claude to continue.

---

## Constraints (repeated from kickoff prompt for enforcement during execution)

- No production deploys without Kiran running the command. Rules deploys, Firebase Console writes, flag flips all go through Kiran.
- No emails to families without Aidan. Draft, don't send.
- No changes to Session 3–6 UI beyond the three rules edits in Task 8.
- No email/password auth build without Task 14's audit first.
- No `isWorkspaceUser()` removal without verifying at least one admin allowlist path works (Task 7 Step 1).
- Every task commit: `git add app.jsx tests/*.mjs index.html` (per Session 6 discipline) — though Session 7 has only one `app.jsx` change, and the rules/doc commits use their own file lists.
- No bundlers, no `npm install`.
- No comments without a non-obvious "why." No AI slop in docs.

---

## Self-review notes

**Spec coverage check:** Every item in the Session 7 kickoff prompt §"What's in scope" and §"Open questions Session 7 must resolve" is addressed by a task:
- Rollout → Tasks 3, 4, 6, 10, 11, 12, 13.
- Workspace gate removal → Tasks 1, 2, 8, 9.
- Non-Gmail audit → Tasks 14, 15.
- Pilot scope question → Task 3 (answer: 3–5, locked).
- Aidan's privacy review → Sequencing note (assumed complete).
- Parent access to review fields → Sequencing note (option b — document as intentional).
- Tighten submissions update rule → Task 8 Step 3.
- Closeout + retrospective → Task 16.

**Placeholder scan:** No "TBD" / "implement later" / "fill in details." Every action is a concrete command or operation by a named actor (Claude / Kiran / Aidan).

**Type consistency:** The only source of consistency risk is Task 8 Step 3's `hasOnly(['status', 'responses', 'updatedAt', 'submittedAt'])` — the field list must match what `SubmissionEditor` actually writes. **Plan explicitly flags this as a hard checkpoint to verify against app.jsx before the rules deploy.**

---

*Plan saved to `docs/PHASE_2_SESSION_7_PLAN.md` per psm-generator session-doc naming convention (not `docs/superpowers/plans/` default).*
