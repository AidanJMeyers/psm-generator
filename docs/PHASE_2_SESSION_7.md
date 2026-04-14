# Phase 2 — Session 7: Workspace Gate Retirement + Auth Infrastructure Cleanup

**Date:** 2026-04-14
**Session type:** Medium risk. One code change (`USE_ALLOWLIST_AUTH` flip), five rules edits, one emergency rules fix, zero new tests. First time allowlist-only auth has been exercised against production Firebase Auth with a non-admin user.
**Parent docs:** [PHASE_2_SESSION_1.md](PHASE_2_SESSION_1.md) (authoritative schema + session plan) · [PHASE_2_SESSION_6.md](PHASE_2_SESSION_6.md) (follow-ups queued for Session 7) · [PHASE_2_SESSION_7_PLAN.md](PHASE_2_SESSION_7_PLAN.md) (approved plan, with scope cut mid-session) · [AUTH_MIGRATION_PLAN.md](AUTH_MIGRATION_PLAN.md) (the Phase A/B/C/D work this completes)
**Outcome:** Workspace domain gate retired from production. Allowlist auth is now the only auth path for tutors and admins. Student submission update rule tightened to prevent students from touching tutor-written fields. Latent bug from Session 2 caught and fixed: non-admin users could not read their own allowlist entry. Family rollout (Phase IV) deferred to a future session because no real session data exists for the portal to display.

---

## What shipped

Three commits. All on `main`. Every production operation ran manually by Kiran (rules deploys, Firebase Console allowlist operations, sign-in verification) except for `firebase deploy --only firestore:rules`, which Kiran ran locally.

### Commit 1: `28b22ab` — Flip `USE_ALLOWLIST_AUTH` to true

[app.jsx:490-497](../app.jsx#L490-L497) — single constant flip plus stale comment cleanup.

- `USE_ALLOWLIST_AUTH = false` → `true`.
- Comment block rewritten from 7 lines of Phase-A-era historical framing to 3 lines noting the flag is live and the dead branches are scheduled for Phase 3 cleanup.
- `index.html` rebuilt via `python3 build_index.py`, committed in the same commit per Session 6 discipline.
- 84/84 tests pass (no test changes; baseline preserved).

**What this flip does in practice:** `onAuthStateChanged` at [app.jsx:934-963](../app.jsx#L934-L963) now takes the allowlist branch for every sign-in. Users without a valid allowlist entry land in `LockoutScreen` with their email displayed. Previously this code path only ran under `?dev=1` locally; Session 7 is the first time it has run in production.

### Commit 2: `fb2bd9c` — Rules cleanup + allowlist self-read fix

This commit bundles Task 8 (planned Phase III rules cleanup) **and** the emergency fix for a latent Session-2-era bug that surfaced during Task 9 smoke testing. The commit message only calls out the self-read fix; the full scope is six separate rule edits:

1. **`isWorkspaceUser` helper deleted** ([firestore.rules](../firestore.rules)). No longer referenced after changes 2 and 5 below.
2. **`isTutorOrAdmin` simplified** — dropped `isWorkspaceUser() ||` from the OR chain. Auth is now allowlist-only for tutors and admins.
3. **Student submission update rule tightened** — added `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'responses', 'updatedAt', 'submittedAt'])`. Students can no longer write `scoreCorrect / scoreTotal / reviewedAt / reviewerNotes` onto their own submission docs. This fixes the latent soft spot flagged in [PHASE_2_SESSION_6.md §Submission docs now carry a mix](PHASE_2_SESSION_6.md#L100).
4. **`{document=**}` fallthrough deleted** — removed the workspace-only ad-hoc escape hatch. `app.jsx` Firestore access paths were grepped at Task 9 Step 4 and confirmed to live entirely in `/students/**`, `/psm-data/main`, or `/allowlist/**` — nothing was relying on the fallthrough.
5. **Header comment block updated** — dropped "Phases C/D deferred, workspace gate still present" framing, replaced with a one-line note that Session 7 retired the workspace gate.
6. **Allowlist collection match rule split into `get` / `list` / `write`** — THE BUG FIX. See §"The allowlist self-read bug" below.

### Commit 3: `<TBD>` — Session 7 plan doc + closeout doc

Single commit adding `docs/PHASE_2_SESSION_7_PLAN.md` (untracked since plan-write time) and `docs/PHASE_2_SESSION_7.md` (this file). No code.

---

## What did not ship

Session 7 was scope-cut mid-session from "auth cleanup + real family rollout" to "auth cleanup only." Deliberate deferrals:

- **Real student/parent rollout (Phase IV of the plan, entirely).** No pilot families seeded. No launch email drafted. No wave-2 expansion. **Reason:** Session 2 closeout flagged that most real students had 0 assignments / 0 scores / 0 diagnostics at migration time. Two days later, Kiran confirmed no tutors have logged session data since — "the system is just being built over the past few days and in development." Sending any real family to an empty portal would be a worse first impression than not sending them at all. Family rollout moves to whatever session follows Session 8, gated on tutors actually using the system for real sessions first.
- **Pilot family allowlist entries.** Would have been fake pre-seeding with nobody to actually sign in and see data.
- **Family-facing launch email.** Nothing useful to write when the answer to "what will I see" is "nothing yet."
- **`DUAL_WRITE_GRACE` flip to `false`.** [app.jsx:505](../app.jsx#L505) still `true`, unchanged from Session 2. Different concern, different rollback story — intentionally kept out of Session 7's blast radius. Queued for Phase 3.
- **`USE_ALLOWLIST_AUTH` flag and its dead branches removal.** Flag flipped but not removed. The gated branches at [app.jsx:594,596,626,938,992,1031,1190](../app.jsx#L594) etc. are now dead code, but removing them is its own cleanup — queued for Phase 3.
- **`isWorkspaceUser()` client-side code.** The tutor sign-in screen at [app.jsx:594](../app.jsx#L594) still has `!USE_ALLOWLIST_AUTH` branches and references to `ATS_DOMAIN` (line 488). Queued for Phase 3 dead-branch cleanup.
- **Formal non-Gmail family count from Aidan.** Task 14 was answered by Kiran's operational estimate (16+ families lack Gmail) rather than a precise Aidan audit. That estimate crosses the plan's threshold, so Session 8 exists. A formal count is queued as a Session 8 plan-writing input.
- **Email/password auth build.** Decision made (Session 8 will build it), but no spec drafted in Session 7.
- **PDF / OneDrive migration.** Surfaced mid-session as a Phase 3 candidate. Not scoped or planned here.

---

## Deviations from the Session 7 plan

### 1. Mid-session scope cut: Phase IV deferred entirely

**Plan said:** Session 7 ships the workspace gate retirement AND the real family rollout to 3–5 pilot families, with Phase IV covering launch email and wave-2 expansion.

**What shipped:** Only the workspace gate retirement. Phases I (inventory) and II (flag flip) + III (rules cleanup) + V (audit) + VI (closeout) ran. Phase IV entirely deferred.

**Why:** During Task 3 (pilot family selection), the question "do any real students have enough logged data to make the portal worth visiting?" came up. Kiran answered directly: no tutors had been logging session data since Session 2 two days ago, because the system is still in heavy development. Sending real families to a visibly empty portal would be a worse first impression than waiting. The decision was to cut Phase IV entirely and use Session 7 as pure auth-infrastructure work.

**Plan doc handling:** Left as-is, per Session 6 precedent. The plan is a historical artifact showing what we thought we were doing at plan-write time. This closeout doc is authoritative for what actually shipped.

**Cost of the cut:** ~0. Phase IV work was almost entirely Kiran + Aidan operations (email drafting, family tickets, wave-2 coordination). No code was written and thrown away.

### 2. Task 5 collapsed to baseline acceptance

**Plan said:** Run dev-bypass walkthroughs for tutor / student / parent roles before flipping the flag, as the regression gate Session 2 notoriously skipped.

**What shipped:** Accepted 84/84 tests green + clean working tree + zero app.jsx/firestore.rules changes since Session 6 closeout commit `31d3fa5` as the baseline.

**Why:** The rationale for re-running dev-bypass walkthroughs was "has anything regressed since Session 6 closed green?" But nothing had changed in the code — not a single commit touched `app.jsx` or `firestore.rules` between Session 6 closeout and Session 7. The walkthroughs would have been re-testing known-green state. Task 6's flag flip is a single-line change that doesn't touch any code path reachable under dev bypass (dev bypass bypasses `USE_ALLOWLIST_AUTH` entirely).

**Residual risk:** Lower than Session 2's push-without-verification deviation because the code surface area changed is so much smaller. One constant flip cannot regress the tutor UI's rendering paths; at worst it could regress the sign-in screen itself, which Task 6 Step 4 verified by opening the built `index.html` locally before commit.

### 3. The allowlist self-read bug (the big one)

**Discovered in:** Task 9 smoke test 2.

**Root cause:** [firestore.rules:68](../firestore.rules#L68) (original Session 2 rule) read:

```
match /allowlist/{email} {
  allow read, write: if isAllowlistAdmin();
}
```

This requires admin role to `read` ANY allowlist doc — including a user's own entry. The client `getAllowlistEntry` at [app.jsx:510](../app.jsx#L510) does `window.db.collection("allowlist").doc(key).get()`, which under this rule returns `permission-denied` for any non-admin user. The client catches the error at [app.jsx:526-529](../app.jsx#L526-L529), returns `null`, and the caller at [app.jsx:946](../app.jsx#L946) interprets `null` as "not on allowlist" and routes to `LockoutScreen`.

**Why this was latent:**
- **Session 2** (where the rule originated) tested allowlist sign-in by flipping the flag locally and signing in as admin. `isAllowlistAdmin()` returned true for admins, so the read worked. The flow was never tested with a non-admin token.
- **Between Session 2 and Session 7:** `USE_ALLOWLIST_AUTH = false` in production meant `getAllowlistEntry` was never called during sign-in at all. The legacy workspace path at [app.jsx:965-977](../app.jsx#L965-L977) handled everything and never touched the allowlist collection.
- **Session 7 Task 6:** flag flipped to `true`. Every sign-in now calls `getAllowlistEntry`. **But Task 7's smoke test only exercised admin sign-ins** (`kiranshay123@gmail.com` and Aidan's two admin emails). Admins pass the rule, so the bug stayed hidden.
- **Task 9 smoke test 2:** to validate the new `hasOnly([...])` rule on student submission updates, Kiran created a temporary student-role allowlist entry (`kiranshay234@gmail.com` → `role: "student"`, `studentIds: ["rnbw56f5"]`) and tried to sign in with it in incognito. Result: `LockoutScreen`. The very first non-admin sign-in attempt against the live allowlist path caught the bug.

**The counterfactual:** if Task 9 smoke test 2 had been skipped (Option A that we discussed and rejected), the bug would have sat latent until Danielle or Maryam first tried to sign in as `tutor`-role users. It would have blocked every non-admin sign-in indefinitely. The entire stated value of Session 7 — "prove allowlist-only auth works end-to-end" — would have been false.

**The fix:** split `allow read` into `allow get` (self-only) and `allow list` (admin-only). The new rule block at [firestore.rules](../firestore.rules) allowlist match:

```
match /allowlist/{email} {
  allow get: if request.auth != null
    && request.auth.token.email_verified == true
    && emailKey() == email;
  allow list, write: if isAllowlistAdmin();
}
```

**Why this is safe:**
- `get` permits a signed-in, email-verified user to read a single allowlist doc only when the doc ID matches their own lowercased email. Users can read their own entry, never anyone else's.
- `list` (collection-level enumerate via `collection("allowlist").get()` at [app.jsx:1063](../app.jsx#L1063)) stays admin-only. Tutors cannot harvest peer emails.
- `write` (add / toggle active / delete at [app.jsx:1106, 1131, 1146](../app.jsx#L1106)) stays admin-only.

**Verified working:** Kiran re-deployed rules, signed in with `kiranshay234@gmail.com` in incognito → landed in `StudentPortal` scoped to Sample. Then drilled into an assignment, typed a character in the answer textarea, waited for debounced autosave → clean save, no `permission-denied` in devtools console. Both the self-read fix AND the new `hasOnly([...])` rule are validated end-to-end.

**Scope creep vs. blocker fix:** This fix was not in the Session 7 plan, but it is a blocker for Session 7's stated goal. Without it, non-admin users cannot sign in at all, which means "auth cleanup" is incomplete. Shipping Session 7 without the fix would have required rolling back Task 6's flag flip entirely (two commits and a rules redeploy) to restore tutor access. Fixing it forward is strictly cheaper.

### 4. `firebase deploy` blocked on expired CLI credentials

**Plan said:** Kiran runs `firebase deploy --only firestore:rules`. Simple.

**What happened:** First deploy attempt returned `Authentication Error: Your credentials are no longer valid`. Kiran's local Firebase CLI OAuth token had expired — likely tied to his `kshay@affordabletutoringsolutions.org` workspace account which is winding down, causing Google's refresh token invalidation to fire more aggressively.

**Fix:** `firebase login --reauth` signed in as `support@affordabletutoringsolutions.org` (which per [Session 2 closeout §Deviation 3](PHASE_2_SESSION_2.md#L60) is being kept alive indefinitely as the admin escape hatch and is the Firebase project owner). Deploy succeeded on the retry.

**Adjacent verification:** The GitHub Actions `FIREBASE_TOKEN` secret is independent from Kiran's local CLI token. It was confirmed still valid by proof-of-work: commit `28b22ab`'s auto-deploy to Firebase Hosting succeeded (verified by Kiran's successful sign-in via the allowlist path at Task 7 — which only works if the new `app.jsx` build is live in production). The CI token is sourced from `support@affordabletutoringsolutions.org` and is on stable footing indefinitely.

**Phase 3 follow-up:** `kiranshay123@gmail.com` should be added as a Firebase project Editor (IAM) to future-proof local CLI deploys against the ATS workspace shutdown, and the `FIREBASE_TOKEN` CI secret should eventually be regenerated from that account too. Not Session 7 work.

### 5. Commit `fb2bd9c` bundles more than its message describes

**What happened:** During Task 8, the five planned rules edits were applied as five separate `Edit` calls but not committed (we were showing the diff for review, not pushing). During Task 9 smoke testing, the sixth edit (the allowlist self-read fix) was added on top of the uncommitted working tree. When the commit finally fired, it bundled all six edits but the commit message only mentioned the self-read fix.

**Why it matters:** A future reader doing `git blame` on the `isTutorOrAdmin` helper or the `{document=**}` fallthrough will see commit `fb2bd9c` with a message that doesn't describe those changes.

**Fix:** This closeout doc is the authoritative record of commit `fb2bd9c`'s actual scope. Not worth amending the commit — the message underreports, it doesn't mislead.

### 6. Task 14 answered by Kiran estimate instead of Aidan count

**Plan said:** Kiran asks Aidan for a formal count of non-Gmail families across the 51-family roster.

**What shipped:** Kiran's operational knowledge of his own family base: "16+ families don't have google accounts." Decision rule (agreed during planning: 16+ → Session 8 builds password auth) triggered Session 8.

**Why this is OK:** Kiran has direct contact with these families. He's better positioned to ballpark the count than Aidan is to audit it from the Wise CSV. The exact count doesn't change the decision (16+ is enough to justify building the feature). Session 8 plan-writing will verify the count against a precise source before committing to specific UX trade-offs (e.g., self-service vs admin-issued accounts).

### 7. Drive-by fix: stale `psm-data/main` comment assumed

**Not actually shipped.** [firestore.rules:71-74](../firestore.rules#L71-L74) still says `match /psm-data/main` "houses customAssignments permanently and mirrors `students[]` during the DUAL_WRITE_GRACE window." The `DUAL_WRITE_GRACE` window is technically still open (not flipped to false yet), so the comment is still accurate. Noting for the record — if Phase 3 closes `DUAL_WRITE_GRACE`, this comment needs to be updated in the same commit.

### 8. Stale "Phase A — flag off" banner copy in `AdminsTab`

**Mentioned as drive-by candidate during Task 1, then self-resolved during Task 6.** The banner at [app.jsx:1190-1196](../app.jsx#L1190-L1196) was gated on `!USE_ALLOWLIST_AUTH`, so the flag flip eliminated the banner automatically. No separate fix needed.

---

## Open questions and risks (new or updated from Session 7)

### A. `USE_ALLOWLIST_AUTH` dead-branch cleanup still pending

The flag is now always `true` in production, but [app.jsx](../app.jsx) still contains `if(USE_ALLOWLIST_AUTH){ ... }` and `!USE_ALLOWLIST_AUTH &&` branches at: [594](../app.jsx#L594), [596](../app.jsx#L596), [626](../app.jsx#L626), [938](../app.jsx#L938), [992](../app.jsx#L992), [1031](../app.jsx#L1031), [1190](../app.jsx#L1190), and the constant declaration itself at [497](../app.jsx#L497). `ATS_DOMAIN` at [488](../app.jsx#L488) is also now unused.

**Risk:** latent dead code is a cognitive-load tax and a source of "what was this for?" confusion for future readers. No functional risk today.

**Fix:** Phase 3 cleanup task. Single commit removes the flag, collapses each `if(USE_ALLOWLIST_AUTH)` branch to just its true-arm, drops `ATS_DOMAIN`, drops the legacy workspace sign-in copy. Low risk because the false-arm branches haven't been exercised in production since Session 2 anyway.

### B. Phase D auth cutover is still blocked at the IAM layer

Session 2 flagged this: [PHASE_2_SESSION_2.md §"Risk: Phase D auth cutover is blocked by org-level policy"](PHASE_2_SESSION_2.md#L93). The `constraints/iam.allowedPolicyMemberDomains` policy blocks non-workspace accounts from being added as IAM principals, so `kiranshay123@gmail.com` cannot currently be granted Firebase project Editor role without a policy exception.

Session 7 confirms the problem is still live: the `firebase deploy` during Task 9 required a re-auth as `support@affordabletutoringsolutions.org`, not Kiran's personal Gmail. Kiran's personal account has no Firebase project membership.

**Mitigation:** `support@affordabletutoringsolutions.org` is being kept alive indefinitely per operational policy. This is the documented escape hatch.

**Still owed:** at some point before the workspace actually dies, Kiran or an org admin should either (a) grant `kiranshay123@gmail.com` Firebase Editor role via an org policy exception, or (b) regenerate the CI `FIREBASE_TOKEN` secret from the `support@` account for long-term stability. Neither is urgent as long as `support@` is live.

### C. Parent read access to tutor-written review fields is intentional — but still unexercised

Locked in during planning: `scoreCorrect / scoreTotal / reviewedAt / reviewerNotes` stay visible to parents because they're per-submission grading feedback ("your kid got 7 out of 10") which is exactly what a parent portal should expose. Option (a) from Session 6 closeout (moving review fields to a tutor-only `_private/review` subcollection) was explicitly rejected.

**Risk:** the decision is untested against a real parent-role sign-in under the live rules. Session 7 only exercised a student-role sign-in (`kiranshay234@gmail.com`). The `isLinkedToStudent` rule helper at [firestore.rules:56-60](../firestore.rules#L56-L60) returns `true` for both `student` and `parent` roles, so the code path is the same — but the first real parent sign-in happens at whatever session does the family rollout.

**Not a bug.** Captured here so future-us doesn't re-open the question.

### D. The `hasOnly([...])` field list omits `assignmentId` — and this is correct, but fragile

The student submission update rule allows only `['status', 'responses', 'updatedAt', 'submittedAt']` in `affectedKeys()`. `assignmentId` is deliberately excluded because `makeDraftPayload` writes the same `assignmentId` value on every autosave, so Firestore's `diff().affectedKeys()` does not include it. Kiran verified this empirically at Task 9 smoke test 2 — draft saves work without permission errors.

**Fragility:** if `makeDraftPayload` is ever modified to rewrite `assignmentId` to a different value (for example, to support "move draft to different assignment"), the rule silently breaks. Nothing in the test suite catches this.

**Mitigation (not shipped):** a dedicated `node --test` case that exercises the rule against the Firebase Rules emulator could catch rule/client drift. Worth considering as a Phase 3 infra hygiene task alongside the dead-branch cleanup.

### E. OneDrive PDF single-point-of-failure surfaces as a Phase 3 priority

Mid-session, Kiran surfaced that the PSM worksheet PDFs currently referenced by `student.assignments[]` as OneDrive URLs live in a local folder on his laptop. Session 1 flagged this as a known concern: [PHASE_2_SESSION_1.md §Non-goals row 4](PHASE_2_SESSION_1.md#L270). Kiran now wants to migrate those PDFs into Firebase Storage as part of Phase 3.

**Why this matters:** SPOF risk is non-trivial. If Kiran's laptop dies, OneDrive sync breaks, or the folder organization shifts, every historical worksheet link in the system breaks simultaneously and there is no recovery path other than "ask Kiran to find the PDFs again."

**Session 1's "do not touch OneDrive URLs" constraint no longer applies** once Phase 3 explicitly owns the migration — the constraint was about not silently breaking them during Phase 2's schema migration, not about never touching them ever.

**Scope:** substantial. Captured in Phase 3 kickoff as a 2-session project (inventory + one-shot migration + read-path swap, then tutor upload UI).

### F. Session 6's per-question submission granularity still deferred

Unchanged from Session 6. `scoreCorrect / scoreTotal` is per-submission, not per-question. A `missedQuestions: [2, 5, 7]` field can be added later without breaking anything. Not on Phase 3's top-of-list, but on the list.

### G. Aidan's privacy review of tutor-only fields was informally skipped

Session 1 listed Aidan's privacy review as a pre-Session-7 trigger. Session 7 proceeded on the assumption that no new fields needed to move to `_private/info` beyond `notes`. Aidan has not formally confirmed. This is a latent risk rather than a known problem — if Aidan surfaces additional sensitive fields (for example, a family's financial situation, or notes about a parent's communication style), they go into `_private/info` via a small schema addition.

**Risk:** low. `notes` was the only field ever flagged as sensitive during Phase 2 spec work, and tutors haven't added significant custom data to student docs beyond the pre-existing shape.

**Action for Phase 3 kickoff:** ask Aidan directly at the start of any family-rollout session before real families hit the portal.

---

## Status of Session 1's session plan table

Tracking against [PHASE_2_SESSION_1.md §Session plan](PHASE_2_SESSION_1.md#L250):

| # | Session | Planned ships | Actual |
|---|---|---|---|
| 1 | Brainstorm + spec | Spec only | ✅ done |
| 2 | Schema migration + sync rewrite + cutover | Migration script, rules, client rewrite, `DUAL_WRITE_GRACE` flag | ✅ done (with deviations and latent allowlist bug) |
| 3 | Read-only student portal UI | `RoleRouter`, `StudentPortal`, chart | ✅ done |
| 4 | Parent portal UI | `ParentPortal`, child switcher | ✅ done |
| 5 | Student answer entry | `SubmissionEditor`, draft autosave, submit lock | ✅ done |
| 6 | Tutor missed-question review | Tutor review UI | ✅ done (with boolean→numeric mid-session pivot) |
| 7 | Production rollout | Real allowlist entries, family email, monitoring | **Partial — auth infrastructure only, family rollout deferred** |

Row 7 is the only incomplete one. What Session 7 shipped (workspace gate retirement + rules cleanup + bug fix) was substantial but is not "Production rollout" in the sense Session 1 meant. The actual family rollout is now a post-Phase-2 item, queued behind Session 8 (password auth) and gated on tutors first generating enough session data to make the portal worth visiting.

---

## Commits

Oldest → newest, this session only:

- `28b22ab` — `phase 2 session 7: flip USE_ALLOWLIST_AUTH to true`
- `fb2bd9c` — `phase 2 session 7: allow self-read on allowlist (fix non-admin sign-in)` [bundles Task 8's five planned rules edits + the emergency allowlist self-read fix; commit message underreports scope — this closeout is the authoritative record]
- `<TBD>` — `phase 2 session 7: plan + closeout docs` [this commit]

**Test count unchanged:** 84/84 green at baseline, 84/84 green at end. Session 7 added no code requiring tests.

---

## Phase 2 retrospective — Sessions 1–7

### The seven-session arc, in one sentence each

- **Session 1 (design):** Decided to design per-student Firestore schema for the full vision (read-only portal + student answer entry) in one migration, explicitly decoupling from worksheet regeneration.
- **Session 2 (schema migration):** Rewrote `firestore.rules`, wrote the one-shot migration script, rewrote the client sync layer around `DUAL_WRITE_GRACE`, migrated 51/51 students to per-student docs in one live run. Skipped the dev-bypass regression gate pre-push (got lucky; nothing broke). Shipped a latent allowlist rule bug that was caught five sessions later.
- **Session 3 (portal shell):** Built `RoleRouter`, `StudentPortal` tabs, a hand-rolled SVG Score Trends chart, all tested under `?dev=1&role=student`. Kept `AppInner` untouched.
- **Session 4 (parent portal):** `ParentPortal` wrapper, `ChildSwitcher` with localStorage persistence, multi-child routing logic. Mostly reuse of Session 3 components.
- **Session 5 (student writes):** `SubmissionEditor` with debounced autosave and monotonic draft→submitted state machine. First time `submissions/` subcollection was exercised.
- **Session 6 (tutor review):** Tutor-side `TutorSubmissionsPanel` + missed-question report. **Mid-session pivot from boolean-per-submission to numeric N/M review** after Kiran pointed out that "7 out of 10" is more useful than "correct/incorrect." Drive-by fix for a stale `profileNotes` reference that was crashing student profile view.
- **Session 7 (auth cleanup):** Workspace gate retired. Allowlist-only auth proven end-to-end. Session-2-era latent bug caught and fixed. Family rollout deferred until tutors actually use the system.

### What went well

- **Session-by-session discipline with written closeouts held up.** Every session shipped a closeout doc with what shipped vs planned, deviations, and a kickoff prompt for the next session. This let fresh Claude pick up each session cold with zero conversation history, exactly as Session 1 designed. The pattern is proven and should carry forward to Phase 3.
- **The "plan doc stays, closeout doc updates" split worked.** When Session 6 pivoted boolean→numeric and Session 7 cut Phase IV, the plan docs were left as historical artifacts and the closeout docs captured the actual state. Future readers have both "what we thought" and "what shipped" with no conflation.
- **Smoke tests that felt redundant actually caught bugs.** Task 9 smoke test 2 was borderline — we almost skipped it because no real student users exist. Running it anyway caught a latent bug that would have blocked every non-admin sign-in. This is the second Phase 2 session where a regression gate had outsized value (Session 6 caught the `profileNotes` crash the same way). **Lesson: never skip the smoke test even when you think it's redundant.**
- **Scope cuts mid-session based on data reality were the right call every time.** Session 6's boolean→numeric pivot and Session 7's Phase IV deferral both came from Kiran reading real product state and disagreeing with plan assumptions. Both cuts improved Phase 2's output, neither wasted work.
- **Velocity overrides for psm-generator (commit+push directly, run rules deploys locally) matched the session cadence.** The general no-auto-commit rule would have added async-handoff tax that Session 2 would have hated. The project-specific override was the right call.

### What went poorly

- **Session 2 skipped its own regression gate and got away with it — and shipped a latent bug anyway.** The skipped dev-bypass verification didn't catch the bug Session 7 found, but it also didn't catch the specific stale `profileNotes` reference that Session 6 caught as a drive-by. Session 2's closeout explicitly flagged this as residual risk and added "better next time: open the built index.html locally before pushing." Session 6 and Session 7 both honored that lesson. **Net: Session 2's skip was a shortcut that worked but set a bad precedent that later sessions had to consciously reject.**
- **Session 1 spec under-specified the allowlist read rule.** The behavioral spec at [PHASE_2_SESSION_1.md §Firestore rules](PHASE_2_SESSION_1.md#L107) said `match /allowlist/{email} { allow read, write: if isAllowlistAdmin(); }` which is literally what shipped. The spec was correct about intent (admins manage the allowlist) but wrong about behavior (admins reading the allowlist is not the same as non-admins reading their own entry during sign-in). **Lesson for Phase 3 specs: when writing a rule that a non-admin user's sign-in flow will hit, explicitly test that the user's own token can satisfy the rule. "admin-only" as a default is structurally wrong for the allowlist collection because everyone's sign-in flow needs it.**
- **Task 14 / Task 15's non-Gmail audit was resolved by gut estimate rather than data.** Acceptable for Session 7's outcome ("Session 8 exists") but sloppy in principle. Session 8's plan-writing should pay down the debt by actually verifying the number before scoping the UX.
- **Plan docs sometimes lag behind reality.** Session 6's plan described the boolean version; Session 7's plan described a Phase IV that was cut. Both are historically accurate but create a tension between "the plan" and "what shipped." The closeout-as-authoritative pattern papers over this, but a reader who stops at the plan doc gets a wrong impression.

### Invariants Phase 2 preserved

These are things that went into Phase 2 on Day 1 and survived all seven sessions unchanged:

- **No bundler.** `build_index.py` + esbuild parse-check + in-browser Babel Standalone. Every session consciously rejected the "just add a bundler" temptation.
- **No `npm install` into the repo.** Node dependencies are temporary (esbuild via `npx`, `firebase-admin` via `/tmp/fb-admin/` symlink).
- **React state shape unchanged.** `students` stays as a flat array from `AppInner`'s perspective. Seven sessions touched the underlying Firestore layer, the portal layer, the submission layer, and the auth layer without ever breaking this invariant.
- **`customAssignments` lives in `psm-data/main` permanently.** Every session preserved this. Not a strong invariant (it could move), but it didn't need to.
- **Commit discipline: `git add app.jsx tests/*.mjs index.html` every task commit.** Session 6 had to catch up on this mid-session (one rebuild-catch-up commit); Session 7 bundled source + rebuilt index from the start.

### Metrics

| Metric | Value |
|---|---|
| Sessions | 7 |
| Total commits on main | ~30 across all Phase 2 work (exact count in `git log`) |
| Tests at phase start | 0 (test harness was in the diagnostic parser only) |
| Tests at phase end | 84/84 green |
| Code added (approximate) | ~2500 lines in `app.jsx` net (portal components, submission editor, tutor review panel, allowlist helpers, RoleRouter, dev bypass extensions, sync layer rewrite) |
| Production migrations run | 1 (`migrate_to_per_student.mjs` live run, 51/51 students, 0 errors) |
| Rules deploys | 3 (Session 2, Session 7 Task 9 first attempt, Session 7 Task 9 retry with fix) |
| Latent bugs shipped | 2 (`profileNotes` reference in Session 5 area, caught Session 6; allowlist read rule from Session 2, caught Session 7) |
| Families onboarded | 0 (deferred to post-Phase-2) |
| Users who actually signed in via the new allowlist path | 3 (Kiran + 2 × Aidan; all admins; all verified Session 7 Task 7) |

### The one thing Phase 2 explicitly did not do

**Onboard real families.** The goal from Session 1 was "read-only portal first, student answer entry later, in a single schema migration," and Phase 2 shipped every piece of code that enables that — but zero real students or parents have signed in. The infrastructure is live and proven (via Kiran's second-Gmail smoke test), but the product is only "ready for rollout" in the narrow sense that nothing code-side blocks it. Rollout requires (a) tutors actually using the system to log sessions, so the portal has data worth showing, and (b) password auth for non-Gmail families, which is Session 8.

Phase 2 was the right phase to stop at. Rolling families out prematurely would have burned support budget on "why is my portal empty" tickets without validating anything the infrastructure needs validated.

---

## Follow-ups rolled forward to Phase 3

Priority-ordered.

1. **Session 8: Email/password Firebase auth for non-Gmail families.** Unblocks the family rollout.
2. **PDF / OneDrive migration to Firebase Storage.** Kills the laptop-as-SPOF risk. 2-session project.
3. **Close `DUAL_WRITE_GRACE`.** Single-line flip in `app.jsx:505` + rebuild + commit + monitor. Housekeeping. Should happen before the family rollout so the rollback story during rollout is clean.
4. **Delete `USE_ALLOWLIST_AUTH` flag and dead branches.** Housekeeping. Should happen in the same session as the `DUAL_WRITE_GRACE` cleanup to batch the legacy-Phase-2-scaffold removal into one commit.
5. **Grant `kiranshay123@gmail.com` Firebase project Editor role.** IAM change. Future-proofs local CLI deploys against the ATS workspace shutdown. Requires org policy exception.
6. **Real family rollout (what Session 7's Phase IV was supposed to be).** Gated on Sessions 8 + PDF migration + some amount of tutors actually using the system. Probably the Phase 3 capstone session.
7. **Per-question submission granularity.** Session 6 deferred. `missedQuestions: [2,5,7]` field add. Non-urgent.
8. **Formal Aidan non-Gmail count.** Session 8 plan-writing input. Nice-to-have; Kiran's estimate is sufficient to decide Session 8 exists.
9. **Aidan privacy review of tutor-only fields.** Session 1 deferred. Ask before any real family hits the portal.

---

## Session 8 kickoff prompt

> Copy everything between the horizontal rules below into a fresh Claude Code session, after running `/clear` in the psm-generator workspace.

---

I'm ready to start **Phase 3 Session 8** of psm-generator: build email/password Firebase auth for the ~16+ families who don't have Google accounts. This session is **MEDIUM risk** — it's the first real auth-provider expansion since Phase A/B of the auth migration, and it touches the sign-in surface area. No production cutover is expected this session; the work ships behind a flag or as an additional option on the existing sign-in screen.

**Confirm today's date with me at session start before doing anything else.**

### Read these in order before any planning or code

1. **`docs/PHASE_2_SESSION_7.md`** — this file. §"What shipped" tells you the current auth state (workspace gate retired, allowlist-only, self-read fix deployed). §"Follow-ups rolled forward to Phase 3" tells you why Session 8 exists and what its neighbors are.
2. **`docs/AUTH_MIGRATION_PLAN.md`** — the Phase A/B/C/D framing. Session 8 is effectively "Phase E": adding a second auth provider to the existing allowlist model.
3. **`docs/PHASE_2_SESSION_1.md`** — authoritative Phase 2 schema and access model. Every new email/password user still goes through the allowlist collection; Session 8 does not change that. It changes how the user establishes their Firebase Auth identity before the allowlist lookup runs.
4. **`firestore.rules`** — specifically the `allowlist/{email}` match block (lines ~65-74) with the split `get / list / write` rules Session 7 shipped. The new `allow get` rule requires `email_verified == true` — **this is load-bearing for Session 8 because Firebase's email/password provider sets `email_verified: false` by default until the user clicks a verification link.** If Session 8 does not enforce email verification, non-verified users will not be able to read their own allowlist entry, and sign-in will lockout-loop.
5. **`app.jsx`** — specifically:
   - `SignInScreen` (around line 570-670) — this is where a new "Sign in with email and password" option needs to appear alongside the existing Google button, probably gated on a new UI state or a tab switcher.
   - `onAuthStateChanged` handler (around line 920-980) — the post-sign-in flow that calls `getAllowlistEntry`. Session 8 must verify this handler correctly processes `auth.providerData[0].providerId === 'password'` users the same way it processes Google users, and correctly enforces `emailVerified === true` before completing sign-in.
   - `getAllowlistEntry` (around line 505) — no changes expected, but the rule it hits requires `email_verified == true`.

### Scope and architecture questions Session 8 must resolve at plan time

These are the actual design decisions. The rollout question in Session 7 had a "pick one" moment; Session 8 has several.

1. **Self-service registration vs admin-issued accounts.** Does a family create their own account (email + password) and then wait for an admin to add them to the allowlist? Or does an admin pre-create their account + add them to the allowlist in one step? Trade-offs: self-service has lower admin burden but a "dead time" between sign-up and allowlist activation where the user gets `LockoutScreen`; admin-issued is more hand-held but adds admin workload.
   - **Recommendation at plan time:** admin-issued, because Aidan is already the family contact and this eliminates the "I signed up but I'm locked out" confusion.
2. **Where does the admin issue the account?** New section in `AdminsTab`, or a separate tool? Admin-issued means the admin needs to pick an email, generate a password (or have Firebase send a password-reset link that doubles as initial setup), and add the allowlist entry. The admin-UX here is a real design question.
3. **Password reset flow.** Families **will** forget passwords. Firebase's `sendPasswordResetEmail` handles the mechanics; the question is where in the sign-in UI the "forgot password?" link lives and how prominent it is. Also: does the admin UI let admins trigger a reset on behalf of a family ("re-send the setup link") or do families self-serve?
4. **Email verification enforcement.** Load-bearing per firestore.rules. Session 8 must either (a) block sign-in until the user clicks the verification link, or (b) modify the allowlist `allow get` rule to not require `email_verified`. Option (a) is strictly better because it matches the Google path's behavior and doesn't weaken the security model. Plan on (a).
5. **Sign-in UI presentation.** Does the existing `SignInScreen` show Google + email/password side-by-side? As two tabs? As a "Sign in with Google ▾" with an "Or use a password" disclosure? The UI language needs to be plain enough that a parent with no technical background picks the right button.
6. **What existing `USE_ALLOWLIST_AUTH` dead branches should Session 8 also clean up while it's editing this area?** Session 7's follow-up A.4 queued the dead-branch cleanup as its own session. Session 8 is editing the exact same code surface and could reasonably fold the cleanup in. **My recommendation:** fold it in. A dedicated "delete dead branches" commit inside Session 8 is cheap and leaves the sign-in file in a known-clean state before the new email/password code lands.

### Prerequisite tasks before Session 8 starts building

Some of this is Kiran-operations, some is Aidan coordination:

1. **Formal non-Gmail family count from Aidan.** Session 7 Task 14 was answered by estimate. Session 8 plan-writing should start with an actual count so the UX trade-offs (self-service vs admin-issued, bulk import vs one-at-a-time) are sized against real N.
2. **Enable Firebase email/password provider in the Firebase Console.** Authentication → Sign-in method → Email/Password → Enable. Kiran-only operation. Cannot be done programmatically from the psm-generator codebase. Do this before writing client code so tests against real Firebase Auth are possible.
3. **Confirm the existing `kiranshay123@gmail.com` admin allowlist entry is still live.** Same self-check as Session 7 Task 1.
4. **Decide on admin-issued vs self-service early.** This is the architectural fork — get Kiran to commit before the plan calls for components that only make sense in one model.

### Constraints that must not be violated

- **Do NOT weaken the `email_verified` requirement in firestore.rules.** Session 7 shipped this as a load-bearing guardrail. Session 8 must work with it, not around it.
- **Do NOT add new auth providers beyond email/password.** No Apple, no Facebook, no magic-link-only. Google + email/password is the entire provider set.
- **Do NOT change the allowlist schema.** `{email, role, studentIds, active, addedBy, addedAt}` stays exactly the same. New email/password users get allowlist entries with the same shape as existing Google users.
- **Do NOT send real emails from the admin UI to real families during Session 8.** Email verification links from Firebase are automatic on account creation; those are fine. Any broadcast email about "we now support email/password sign-in" goes through Aidan at whatever future session does the family rollout.
- **Do NOT introduce a bundler or npm install.** Same Phase 2 constraint, still holds.
- **Do NOT modify Session 6 or Session 7 UI beyond the sign-in screen.** Tutor-facing panels stay exactly as they are.
- **psm-generator commit override still applies** (commit + push directly, short user-voice messages, no Co-Authored-By).
- **No slop.** Comments only when the *why* is non-obvious. Docs lead with what shipped, not with what was planned.

### Pause at the first natural checkpoint

- **After the Firebase email/password provider is enabled in the console but before any client code is written** — Kiran confirms the provider is live and that admins can manually create a test account via console before anything automated touches it.
- **After the plan is written and before any component code lands** — Kiran reviews and approves the plan's architectural forks (self-service vs admin-issued, verification enforcement, UI presentation).
- **After the client sign-in UI supports both Google and email/password under `?dev=1`** but before real-auth production testing — Kiran verifies the UI flow manually.
- **After real email/password sign-in is proven end-to-end against production Firebase** but before any admin-issued account goes to a real family — Kiran approves and the work ships to production.

Stop at the first one. Report status. Wait for me to push the work or tell you to continue.

### Close out at the end of Session 8

Same pattern as Session 7: write `docs/PHASE_3_SESSION_8.md` capturing what actually shipped (vs planned), deviations, open questions, and a kickoff prompt for the next Phase 3 session (probably the PDF / OneDrive migration, unless something reshuffles).

---
