# Phase 2 — Session 3: Read-Only Student Portal UI

**Date:** 2026-04-14
**Parent docs:** [PHASE_2_SESSION_1.md](PHASE_2_SESSION_1.md) (authoritative spec) · [PHASE_2_SESSION_2.md](PHASE_2_SESSION_2.md) (state this builds on) · [PHASE_2_SESSION_3_PLAN.md](PHASE_2_SESSION_3_PLAN.md) (approved implementation plan)
**Outcome:** Read-only `StudentPortal` shipped behind `?dev=1&role=student|parent`. No production rollout. Tutor flow unchanged.

---

## What shipped

All 12 implementation tasks from the Session 3 plan landed on `main`:

1. **`pickPortalStudentId(entry)` pure helper + tests** — picks `entry.studentIds[0]` or empty string. Five test cases in `tests/portal.test.mjs` cover null, missing array, empty array, single id, multi-id. Session 4's parent child-switcher will vary which index gets picked; Session 3 always takes `[0]`.
2. **`DEV_BYPASS` extended with `&studentId=`** — `?dev=1&role=student&studentId=rnbw56f5` plumbs the id through `DEV_FAKE_ENTRY.studentIds`. Missing id → empty array → the portal renders its "no student record linked" empty state.
3. **`usePortalStudent(studentId)` hook** — subscribes to exactly one `/students/{id}` doc via `onSnapshot`. Never reads the full collection, never touches `_private/info`. Returns `{status, student, error}` with status values `loading | ready | not-found | error`. Cleans up the listener in its effect return.
4. **`StudentPortal` + `PortalShell`** — top-level read-only view with student name header, grade pill, sign-out button, and three Fraunces tabs (Score Tracking, Assignment History, Score Trends). Renders loading/error/not-found branches before the main view. Takes `studentId` as a prop so Session 4's child-switcher is additive.
5. **`RoleRouter`** — inserted between `App` and `AppInner`. Routes `role === "student" || "parent"` to `StudentPortal`; everything else (including `null` for legacy workspace users during the still-deferred auth Phases C/D) falls through to `AppInner` unchanged. `App`'s return line changed from `<AppInner .../>` to `<RoleRouter .../>`.
6. **`PortalTrackingTab`** — read-only subset of the tutor `ScoreHistoryPanel`. Three cards: Practice exam history table (full-practice filter matches the tutor `fullPts` regex), Diagnostic profile bars (reuses `buildDiagnosticProfile` + `PctBar`), WellEd practice log. Per-card empty-state italics when that section has zero data; whole-tab empty-state card when all three are empty.
7. **`PortalHistoryTab`** — read-only subset of the tutor Assignment History tab. One card per assignment with worksheet rows, "Open PDF →" link (falls back to "No PDF" pill when `w.url` is absent), WellEd domain entries, and practice exam entries. Whole-tab empty-state card when the student has no assignments.
8. **`PortalTrendsTab` + `ScoreTrendsChart` + `buildScoreTrendsSeries` + tests** — hand-rolled inline SVG chart. 640×280 viewBox, navy line (`#0F1A2E`) with sienna dots (`#9A5B1F`), y-axis auto-fit with 10% padding (clamped to floor 0), 5 gridlines, x-axis dates thinned to ≤6 labels. Single-point case centers the dot; empty case renders an editorial empty-state card. `<title>` tooltips per point. Three new tests cover filter behavior, dateless/NaN dropping, and ascending sort.
9. **Responsive CSS** — `@media (max-width: 768px)` and `@media (max-width: 480px)` rules in `build_index.py`'s `<style>` block, scoped to `[data-portal="student"]`. Tightens padding and table font/cell sizes. Tutor app is untouched because no tutor selector carries the `data-portal` attribute.

**Commits (`main`, oldest → newest):**
- `64148d9` — add pickPortalStudentId helper + tests
- `efee73e` — dev bypass: accept ?studentId= for portal testing
- `051923a` — add usePortalStudent single-doc subscription hook
- `b8646d9` — scaffold StudentPortal component with blank tabs
- `940f343` — add RoleRouter, gate student/parent to StudentPortal
- `7bffc7a` — portal: score tracking tab (read-only)
- `0c6ce6b` — portal: assignment history tab (read-only)
- `065850d` — portal: score trends svg chart + tests
- `e1cfb28` — portal: responsive layout for <=768px and <=480px

Test count: **38/38** (`node --test tests/*.mjs`). Five pre-existing + 33 from Session 2 baseline + 5 new (`pickPortalStudentId`) + 3 new (`buildScoreTrendsSeries`).

## What did not ship

- **Parent child-switcher.** `StudentPortal` takes `studentId` as a prop and `RoleRouter` always picks `studentIds[0]`. Session 4's job is to expose a switcher when `studentIds.length > 1`. The data-loading layer is already set up for this.
- **Real allowlist rollout.** The portal is reachable only via `?dev=1&role=student|parent` on localhost. `USE_ALLOWLIST_AUTH` is still `false`. Students and parents cannot reach it in production — Phase C/D cutover is still deferred, per the Session 1 constraint.
- **Student answer entry.** Session 5 work. No `submissions/` subcollection reads or writes in Session 3.
- **Auto-grading / per-question reporting.** Session 6 and beyond.
- **Tutor-side view of portal telemetry.** No change to `AppInner` in Session 3.

## Deviations from the Session 1 spec / Session 3 plan

### 1. Dev-bypass permission-denied was a real UX surprise that cost a review cycle

**What happened:** At Checkpoint A, Kiran loaded `?dev=1&role=student&studentId=rnbw56f5` and got the "Couldn't load your student record" error card instead of the portal.

**Root cause:** `?dev=1` fakes the *client-side* auth state but does not create a real Firebase Auth session. The Phase 2 Firestore rules require a real authenticated principal (`isTutorOrAdmin()` → `isWorkspaceUser()` OR `isLinkedToStudent()` → `isAllowlisted()`). With no real session, `onSnapshot` fires its error callback with permission-denied → the hook transitions to `status: "error"` → the error card renders.

**Why this was not caught earlier:** Session 2's `?dev=1` tutor-flow verification was done with Kiran already signed in for real in the same browser, so the Firebase Auth session was sitting in IndexedDB and the rules passed. Session 3 didn't inherit that assumption in its docs.

**Resolution:** Added an explanatory comment to `usePortalStudent` documenting the "sign in for real first" prerequisite, then this closeout note. No code change — the error card is the correct behavior for a permission-denied read.

**How to test the portal locally going forward:**
1. Load `localhost:<port>/` with no query params.
2. Click "Sign in with Google", complete workspace auth.
3. Navigate to `localhost:<port>/?dev=1&role=student&studentId=<id>`.
4. The persisted Firebase session satisfies the rules; `usePortalStudent` resolves normally.

### 2. Helper components named `Portal*` not `*`

The plan proposed `SectionHeading` and `EmptyInline` as shared helpers. Both names are generic enough to collide with future code (or with helpers tutors might add inside `AppInner`). Shipped as `PortalSectionHeading` and `PortalEmptyInline` to stay scoped.

### 3. `PortalShell` dropped the unused `currentUserEntry` prop

Plan showed `PortalShell({studentName, studentGrade, onSignOut, currentUserEntry, children})`. The shell never reads `currentUserEntry` (Session 4's child-switcher will, but it'll live in `StudentPortal` or a new `ParentShell`). Shipped without the prop to keep the signature honest.

## Open questions and risks

### Chart design decisions deferred

At Checkpoint C the chart shipped with a few defaults that are reasonable but open to feedback:

- **Y-axis auto-fit vs fixed 0–1600.** Auto-fit zooms to the student's actual range (good for progress visibility). Fixed 0–1600 contextualizes "how close to perfect" (good for motivation, bad for early-stage students). If real students complain either way during Session 7 rollout, revisit.
- **Date label format.** ISO `2026-04-14`. Wider than `Apr '26`. Fine until the x-axis gets crowded.
- **Line between sparse points.** Implies a smoother trajectory than the data warrants when there are 2-3 points weeks apart. Shipping it anyway because students read "line going up" more easily than dot clouds, but this is the kind of thing a designer would push back on.

Not blockers. File as "watch during Session 7 pilot."

### Dev-bypass UX is clunky for future portal testing

The "sign in for real first, then `?dev=1`" dance is workable but annoying. A dev-only `localStorage` fallback (like the tutor path has) would smooth it out, but adds code that'll never run in production. Leaving it alone for now — the comment in `usePortalStudent` is enough.

### Empty-state copy needs a pass by Aidan before Session 7

Current copy ("No scores logged yet. As you complete practice tests and sessions, your scores will appear here.") is functional but not reviewed. Aidan's voice on parent-facing copy should be the authoritative pass before real families see the portal.

### Responsive verified by code review, not physical device

The `@media` rules target 768px and 480px and were verified in Chrome DevTools device emulation. No real phone was used. If a real iPhone user sees something weird during pilot, the `!important` scope under `[data-portal="student"]` is easy to extend.

### `PortalHistoryTab` links assume `w.url` is a usable OneDrive URL

Per Session 1, OneDrive URLs were copied byte-for-byte in the migration and have not been validated. The portal's "Open PDF →" button just sets `href={w.url}` — if any of those URLs are broken, students hitting them will see OneDrive errors. Not a Session 3 problem (it's a pre-existing data quality issue), but the portal makes it newly visible to non-tutors. Flag for Session 7 rollout.

## Checkpoint

Session 3 is complete when:
- [x] `RoleRouter` routes student/parent to `StudentPortal`
- [x] `StudentPortal` renders the three tabs with real data from `/students/{id}`
- [x] Score Trends chart draws on real data
- [x] Responsive rules land for ≤768px and ≤480px
- [x] 38/38 tests green
- [x] Tutor flow verified unchanged via `?dev=1`
- [x] This closeout doc committed

Session 3 does NOT require any production operation (no rules deploy, no migration, no flag flip). The `DUAL_WRITE_GRACE` window from Session 2 is orthogonal — Kiran manages that on his own cadence.

---

## Kickoff prompt for Session 4

> Copy everything between the horizontal rules below into a fresh Claude Code session, after running `/clear` in the psm-generator workspace.

---

I'm ready to start **Phase 2 Session 4** of psm-generator: the parent portal view and multi-child switcher. This session is **LOW risk** — it builds on the `StudentPortal` from Session 3 and only changes how `RoleRouter` picks which student to render.

**Confirm today's date with me at session start before doing anything else.**

### Read these in order before any planning or code

1. **`docs/PHASE_2_SESSION_1.md`** — the authoritative Phase 2 spec. The §Session plan table puts Session 4 as "Parent portal UI — mostly reuse of StudentPortal, child-switcher."
2. **`docs/PHASE_2_SESSION_2.md`** — schema state. `/students/{id}` is authoritative; rules gate reads by `allowlistStudentIds` which is already a plural array.
3. **`docs/PHASE_2_SESSION_3.md`** — what Session 3 shipped. Specifically note that `StudentPortal` already takes `studentId` as a prop and `RoleRouter` hardcodes `pickPortalStudentId(entry)` → `studentIds[0]`. Session 4's job is to replace that single-value pick with a UI.
4. **`docs/PHASE_2_PORTAL_PROMPT.md`** — the original Phase 2 briefing. §Feature scope → Parent view has the product spec.
5. **[app.jsx](../app.jsx)** — specifically:
   - `RoleRouter` and `StudentPortal` from Session 3.
   - `pickPortalStudentId` helper — this is where the switcher logic will plug in, or be replaced by it.
   - `DEV_BYPASS` / `?role=parent&studentId=` mechanism from Session 3 — already supports testing multi-child by passing a comma-separated list or by faking the allowlist entry shape.

### Then, before touching ANY code

- Invoke the **`superpowers:writing-plans`** skill to produce a detailed Session 4 implementation plan.
- Present the plan to me for review.
- **Do not start implementing until I approve the plan.**

### Constraints that must not be violated

- **Do NOT modify `StudentPortal` beyond what the switcher requires.** It shipped read-only and was reviewed; additive parent-only wrapping is preferred over in-place edits.
- **Do NOT flip `USE_ALLOWLIST_AUTH`.** Phases C/D still deferred.
- **Do NOT flip `DUAL_WRITE_GRACE`.** Kiran's call, not yours.
- **Do NOT introduce a bundler or `npm install` anything.**
- **psm-generator commit override still applies** (commit + push directly, short user-voice messages, no Co-Authored-By).
- **No slop.** Comments only when the *why* is non-obvious.

### What's in scope for Session 4

Per Session 1's §Session plan row 4:

1. **`ParentPortal` or `ChildSwitcher` component.** When `currentUserEntry.studentIds.length > 1`, show a child selector (segmented control or dropdown in the `PortalShell` header). When length is 1, no visible switcher. When length is 0, the existing "no student record linked" empty state.
2. **State lives in `RoleRouter` or a new wrapper**, NOT inside `StudentPortal`. Rationale: `StudentPortal` is scoped to one student by design and should stay that way.
3. **Persist the selected child across reloads.** `localStorage["psm-portal-selected-child"] = studentId` or similar. Default to `studentIds[0]` if the stored id is no longer in the allowlist array.
4. **Extend `DEV_BYPASS`** to accept a comma-separated `studentId` list so testing multi-child locally is ergonomic: `?dev=1&role=parent&studentId=id1,id2`.
5. **Child-switcher test coverage** — pure-logic helper for "given entry + stored id, pick which studentId to render" gets a test in `tests/portal.test.mjs`. UI verified manually.

### Open questions Session 4 must resolve

- **Switcher UI form:** segmented control (best for 2-3 children) vs dropdown (scales further, more generic). Probably segmented control — most parents have ≤3 kids in the program.
- **Display name in switcher:** `student.name` is in the `/students/{id}` doc, but the switcher renders BEFORE we subscribe to any one doc. Options: pre-fetch all linked students in parallel via `Promise.all`, or show just the id / a generic "Child 1 / Child 2" until the selected doc resolves. Pre-fetching is probably fine (≤3 parallel reads).
- **Grade-level display in the header:** parent header might want "Alex — Grade 10" vs "Alex" depending on how crowded the switcher gets.

### Pause at the first natural checkpoint

- **After the switcher renders with two mock children (via extended `DEV_BYPASS`) and clicking between them re-subscribes to the right doc** — Kiran verifies the routing.
- **After localStorage persistence works across reloads** — Kiran verifies the stored id survives reloads and gracefully falls back.

Stop at the first one. Report status. Wait for Kiran to push or tell you to continue.

### Close out at the end of Session 4

Same pattern as this doc: write `docs/PHASE_2_SESSION_4.md` capturing what shipped, deviations, open questions, and a Session 5 kickoff prompt at the bottom.

---
