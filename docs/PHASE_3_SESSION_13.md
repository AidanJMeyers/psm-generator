# Phase 3 — Session 13: Magic-link auth + deep-link handoff

**Date:** 2026-04-14
**Session type:** Client-side only. Additive auth path in `SignInScreen`, deep-link parser at module load, email-link completion handler in `App`, new `ConfirmEmailScreen` for cross-device re-entry, `pendingAssignment` handoff banner in `StudentPortal`. **No Firestore rules changes, no Cloud Functions changes, no worksheet data changes, no new components beyond `ConfirmEmailScreen`.**
**Parent docs:** [PHASE_3_SPEC.md](PHASE_3_SPEC.md) §"Auth model for students and parents" · [PHASE_3_SESSION_12.md](PHASE_3_SESSION_12.md) · [PHASE_3_SESSION_11b.md](PHASE_3_SESSION_11b.md)
**Outcome:** Students and parents can now sign in via Firebase `signInWithEmailLink` from a Wise-delivered deep link. Same-device and cross-device flows both work. `?a=&s=` params survive the email-link redirect round-trip and land in `sessionStorage.pendingAssignment` for `StudentPortal` to pick up on mount. Existing Google and password paths for tutors are untouched.

---

## Scope calibration — what the kickoff prompt said vs. what the spec actually required

The Session 13 kickoff prompt (drafted at the end of Session 12) framed this session as building a **new** `StudentPortal` component, a **new** routing split in `app.jsx`, and a **new** Firestore rules delta for student reads. The first read of the repo showed all three already existed:

| Kickoff framing | Actual repo state |
|---|---|
| "Build `StudentPortal` component" | Already exists at [app.jsx:4024](../app.jsx#L4024) from Phase 2 Session 3. Has score tracking, assignment history, score trends. |
| "Routing split in `app.jsx` — query param vs path vs subdomain" | `RoleRouter` at [app.jsx:1004](../app.jsx#L1004) already dispatches by allowlist role. Students → `StudentPortal`, tutors → `AppInner`. Same bundle, same URL, no URL-based routing needed. |
| "Firestore rules delta for students reading their own `students/{id}`, `assignments/`, `submissions/`" | All of this shipped in Phase 2. `StudentPortal` already works under the existing rules. Session 15 owns the *only* remaining rules delta (`questionKeys`). |
| "Session 12 drift decision: how does `StudentPortal` load worksheet data?" | `StudentPortal` doesn't load per-worksheet data in Session 13 at all. That's Session 14's `SubmissionEditor`. Drift stays deferred. |

Per [PHASE_3_SPEC.md Session plan row 13](PHASE_3_SPEC.md#session-plan), the actual scope is narrower:

> "New sign-in path in `SignInScreen`, deep-link URL parser, `sessionStorage.pendingAssignment`, updated `SignInScreen` copy, same-device and cross-device flows tested, dev bypass (`?dev=1`) still works"

Session 13 shipped exactly that scope and nothing more.

---

## What shipped

### 1. Module-level deep-link plumbing — [app.jsx:914-969](../app.jsx#L914)

```js
const AUTH_CONTINUE_HOST = (()=>{
  if(typeof location === "undefined") return "https://portal.affordabletutoringsolutions.org";
  const h = location.hostname;
  if(h === "localhost" || h === "127.0.0.1") return location.origin;
  return "https://portal.affordabletutoringsolutions.org";
})();

const PENDING_ASSIGNMENT_KEY = "psm-pending-assignment";
const EMAIL_FOR_SIGNIN_KEY = "psm-email-for-signin";

function stashPendingAssignmentFromUrl(){ ... }
stashPendingAssignmentFromUrl();  // runs once at module load

function buildAuthContinueUrl(){ ... }
```

**Design decisions:**

- **`AUTH_CONTINUE_HOST` is hardcoded to the custom domain in prod, `location.origin` on localhost.** Per pause-point #3 in the session kickoff: Kiran confirmed "Hard-code `https://portal.affordabletutoringsolutions.org/`" — but dev on `localhost:8765` must still work. The branch handles both without a build-time flag. In production, `location.origin` will equal the hardcoded value anyway (the app is served from `portal.affordabletutoringsolutions.org`), so the branch is effectively a no-op in prod. The only reason the hardcode is load-bearing: if somebody ever opens `https://psm-generator.web.app` directly (the default Firebase Hosting URL), the continue URL still sends them back to the custom domain. This prevents the exact bug Session 11b follow-up #5 flagged: deep-link messages in Wise chat history that point at `.web.app` instead of the custom domain.

- **`stashPendingAssignmentFromUrl()` runs at module load, not inside a React effect.** Rationale: the deep-link parse needs to happen *before* any component mounts, because the module-load code and the email-link completion `useEffect` both call it. Running it at module load guarantees the first `StudentPortal` render already sees the `sessionStorage` value, with no flash of empty state.

- **The parser is called twice in the full flow.** First on initial deep-link arrival (`.../?a=asgn&s=stu`). Second after the email-link redirect (`.../?a=asgn&s=stu&apiKey=...&oobCode=...&mode=signIn`) — Firebase preserves query params on the continue URL, and the completion handler re-parses them after stripping Firebase's own params out of the URL bar via `history.replaceState`.

- **`PENDING_ASSIGNMENT_KEY` is in `sessionStorage`, not `localStorage`.** The handoff is one-shot — a pending assignment from this sign-in session should not persist across tab restarts. `localStorage` would leak context to unrelated future sessions on shared devices.

- **`EMAIL_FOR_SIGNIN_KEY` is in `localStorage`.** Firebase's cross-device protection *requires* the email to persist on the requesting device specifically so that the redirect leg can replay it. `sessionStorage` would wipe it on the redirect and force every completion through `ConfirmEmailScreen` unnecessarily.

### 2. `SignInScreen` gains a third mode: `"emaillink"` — [app.jsx:576](../app.jsx#L576)

New props: `onEmailLinkSignIn`, `initialMode`.

New state: `linkEmail` (separate from the password path's `email` so switching tabs doesn't cross-wire inputs).

**Tab row now has three buttons** in order: `Google | Email link | Password`. The `Email link` tab is the middle tab, which is intentional — when `hasPendingAssignment` is true, `initialMode="emaillink"` makes it the default, and middle placement keeps tutors' muscle memory for Google (leftmost) intact.

**Role-disambiguation caption under the tab row:**

```
Students & parents: use Email link. Tutors: use Google or Password.
```

Audience labels are **bold**, tab names are **underlined**. This was a mid-session correction after Kiran pointed out that a student landing cold on `SignInScreen` (no deep link) has no UI signal telling them which of three tabs applies to them. Two alternatives were rejected:

1. **Hide tabs by role.** We don't know the role pre-auth, so impossible.
2. **Reorder tabs to put Email link first.** Rejected: would disrupt Aidan and Gmail tutors' muscle memory, and the cold-entry case is a small fraction of the high-traffic path (students normally arrive via Wise deep link, which already uses `initialMode`).

The caption is 11px `ink-mute` color, below the tab row but above the mode-specific form. Quiet but legible. Does not appear inside the forms themselves, so it doesn't add noise to the flow a user has already committed to.

### 3. `App` component — incoming email-link completion — [app.jsx:1262](../app.jsx#L1262)

A new `useEffect` on mount detects `firebase.auth().isSignInWithEmailLink(location.href)` and handles two cases:

**Case A: same-device (localStorage has `emailForSignIn`).** Call `signInWithEmailLink(stored, location.href)`. On success, strip Firebase's `apiKey/oobCode/mode/continueUrl/lang` params via `history.replaceState`, re-stash `pendingAssignment` (the `a`/`s` params are still in the URL after the strip), and let `onAuthStateChanged` route from there as it does for Google/password sign-ins.

**Case B: cross-device (no stored email).** Can't complete sign-in — Firebase requires replaying the exact email the link was sent to. Set `needsEmailConfirm = true`, which routes `App` to the new `ConfirmEmailScreen`. User types their email, `handleConfirmEmail` replays it, same post-success cleanup as Case A.

**Error handling** distinguishes:
- `auth/invalid-action-code` / `auth/expired-action-code` — stale or reused link. Message: "This sign-in link has expired or already been used. Ask your tutor to resend it, or request a new one below."
- `auth/invalid-email` — email stored doesn't match the link (should be rare; means the user typed a different email than the one they used to request). Message: "The email stored on this device doesn't match the link."
- Generic fallthrough with the raw Firebase error.

The effect runs *only* on cold mount (empty dep array). If the user is already signed in and navigates back to a URL containing a stale `oobCode`, `isSignInWithEmailLink` returns false anyway because Firebase validates the code server-side.

### 4. `handleEmailLinkSignIn(email)` — outgoing link send — [app.jsx:1386](../app.jsx#L1386)

Calls `window.auth.sendSignInLinkToEmail(email, { url: buildAuthContinueUrl(), handleCodeInApp: true })`, then persists the email to `localStorage[EMAIL_FOR_SIGNIN_KEY]` so the same-device case works.

**Error cases with user-visible text:**
- `auth/invalid-email` → "That doesn't look like a valid email."
- `auth/unauthorized-continue-uri` → "This domain isn't authorized for email-link sign-in. Ask Kiran to add it in Firebase." (This is the error you get if the authorized domains list is missing the host — Kiran added `portal.affordabletutoringsolutions.org` to Firebase Auth → Settings → Authorized domains mid-session, before any `sendSignInLinkToEmail` was ever called, so this path has not been hit in anger.)
- `auth/missing-continue-uri` / `auth/invalid-continue-uri` → "Internal: bad continue URL. Report this to Kiran." (Should be unreachable; `buildAuthContinueUrl` always returns a valid URL.)

On success, sets `signInInfo` to the non-error banner below the form: "Sign-in link sent to {email}. Check your inbox (and spam). The link opens this page."

### 5. `ConfirmEmailScreen` — cross-device re-entry — [app.jsx:800](../app.jsx#L800)

Single-purpose screen rendered when the App mounts on a URL containing a Firebase email-link but `localStorage` has no `emailForSignIn`. Displays:

- Heading: "Confirm your email"
- Body: "Type the email address this sign-in link was sent to. We need to match the link to the right account before signing you in."
- Single email input
- "Sign in" button → `handleConfirmEmail` → `signInWithEmailLink` → `onAuthStateChanged` routes from there

**This is the answer to spec open question:** *"Cross-device email-link sign-in UX. Firebase requires re-entering the email on the opening device. How do we explain this to parents who forward the link to their kid?"* The answer: an explicit screen rather than an inline prompt in `SignInScreen`, because by the time Firebase has validated the URL we already know this is the return leg — there's no reason to show tab-chooser UI.

### 6. `StudentPortal` — `pendingAssignment` handoff banner — [app.jsx:4316](../app.jsx#L4316)

On mount, reads `sessionStorage[PENDING_ASSIGNMENT_KEY]`. Validates that the stashed `s` (studentId from the deep link) matches the portal's current `studentId` — mismatches are silently ignored (prevents parent-with-multiple-children from seeing the wrong child's assignment). A matching value renders a banner above the tab bar:

> **Your tutor sent you a worksheet**
> Assignment `asgn999` is ready. The in-browser worksheet editor is shipping in the next update — until then, use Assignment History to track your progress.
> [Dismiss]

**The banner renders in all three StudentPortal states**: the happy path (student loaded), the `error` state, and the `not-found` state. This was a mid-session correction after testing with a fabricated `studentId=test123` showed the banner only rendering in the happy path — defensive UI should surface the deep-link context even when Firestore reads fail, so a student who sees "Couldn't load your student record" still knows *why* they're there and can screenshot the banner for support.

**Dismiss button** clears both the React state and `sessionStorage` so the banner doesn't re-appear on tab change. The handoff is one-shot.

**The banner does not auto-open an editor.** Per the Session 13 kickoff: "Do NOT build the bubble-sheet editor. That's Session 14. Session 13's 'Start' button opens a placeholder." The banner *is* the placeholder. Session 14 replaces it with a real `SubmissionEditor` mount.

---

## The four pause points

At session kickoff I walked through four pause points with Kiran before touching code. Resolutions:

### 1. Deep-link scheme: `?a=<assignmentId>&s=<studentId>` query params

**Confirmed.** Per spec §"Open questions": "For the 51-student trusted pilot, query params are fine. Trigger: Session 13 if anyone objects." No objections. Signed tokens deferred to Phase 4+ if a security review ever demands them.

### 2. Cross-device UX copy

**Confirmed.** Wording: "Confirm the email this link was sent to. We need to match the link to the right account before signing you in." Lives in `ConfirmEmailScreen`.

### 3. Auth continue URL

**Confirmed hardcoded to `https://portal.affordabletutoringsolutions.org/`**, with a `localhost` fallback to `location.origin`. Implementation in `AUTH_CONTINUE_HOST`.

### 4. Email pre-fill when `?s=` is present

**Confirmed no pre-fill.** Rules forbid public reads of `students/{id}`, so fetching the email pre-auth is impossible without a Cloud Function — overkill for the marginal UX gain. Students type their email once, Firebase does the rest.

---

## Firebase Authorized domains — the one config change outside the code

At session kickoff, `portal.affordabletutoringsolutions.org` was **not** in the Firebase Auth Authorized domains list. `sendSignInLinkToEmail` rejects continue URLs whose host isn't on that list with `auth/unauthorized-continue-uri`, which would have blocked every outbound email.

**Important distinction that bit this session nearly:** Firebase Hosting's "custom domains" list (where Session 11b's mini-session added `portal.affordabletutoringsolutions.org`) is **separate** from Firebase Auth's "Authorized domains" list. Adding a custom domain to Hosting does *not* auto-sync it to Auth. The two lists are maintained independently.

**Kiran added the domain manually at session start** via Firebase Console → Authentication → Settings → Authorized domains → Add domain. No propagation wait — effect is immediate. After the add, the list for `psm-generator` contains:

- `localhost` (Firebase default)
- `psm-generator.firebaseapp.com` (Firebase default)
- `psm-generator.web.app` (Firebase default)
- `portal.affordabletutoringsolutions.org` (Session 13 add)

No code changes track this — it's pure Firebase console config. Documenting here so future sessions know where to look if `auth/unauthorized-continue-uri` ever fires.

---

## The one UX gap discovered mid-session

Walked through the SignInScreen in browser and realized: **a student who lands on `SignInScreen` cold (no deep link) sees three tabs and has no idea which one applies to them.** The existing copy ("Access is limited to authorized users") doesn't mention the role split.

Three fixes considered:

1. **Role-aware tab visibility.** Hide tabs based on user role. Impossible — we don't know the role pre-auth.
2. **Reorder tabs with Email link first.** Disrupts tutors' muscle memory, and `initialMode="emaillink"` already handles the deep-link-arrival case.
3. **One-line caption below the tab row.** Quiet, minimal, explains the split.

**Shipped fix #3.** Caption reads: *"**Students & parents**: use Email link. **Tutors**: use Google or Password."* Audience labels bold, tab names underlined (initial version had tab names bold, Kiran flagged the emphasis was on the wrong half — fixed in a followup edit).

**Why this isn't in the spec:** because the spec was written assuming SignInScreen had two tabs (Google + password). Adding a third tab surfaces an information-scent problem the spec didn't anticipate. This is the kind of gap that only shows up when you look at the actual screen.

---

## Testing performed

### Syntax verification

`@babel/cli` + `@babel/preset-react` compile of the full `app.jsx` (6,173 lines after Session 13) to `/tmp/app.check.js` (12,975 lines post-transform). Zero errors, zero warnings. Compiled twice across the session: once after the initial banner landed in only the happy-path return, once after the banner was extracted to a reusable variable and rendered in all three StudentPortal states.

### Local smoke test

Python `http.server` on port 8765 serving the built `index.html`. Three manual tests run by Kiran in his browser:

**Test 1: deep-link banner.** `http://localhost:8765/?dev=1&role=student&studentId=test123&a=asgn999&s=test123`

First result: "Couldn't load your student record" error screen, **no banner**. Root cause: dev bypass passes `studentId=test123` through, but `usePortalStudent` reads a real Firestore doc that doesn't exist for that ID, so it returns `status=error` and the happy-path return (where the banner lived) was never reached.

Fix: extracted the banner to a `pendingAssignmentBanner` local variable and rendered it in the error and not-found PortalShell children too. Re-tested. Banner now renders in the error state with the `asgn999` assignment ID visible. Correct.

**Test 2: three-tab sign-in.** `http://localhost:8765/` (no params)

SignInScreen renders with three tabs: Google (selected by default) | Email link | Password. Caption below the tab row reads "Students & parents: use Email link. Tutors: use Google or Password." with the audience labels bold and the tab names underlined. Clicking Email link switches to the `emaillink` mode form showing email input + "Send sign-in link" button. No regressions in Google or Password modes. Confirmed visually.

**Test 3: tutor view unchanged.** `http://localhost:8765/?dev=1&role=tutor`

Tutor `AppInner` renders normally. No regressions. Confirmed visually.

### What was NOT tested this session

- **Live email send via SMTP.** Session 10 configured Firebase Auth SMTP, and the spec assumed it was ready. No actual `sendSignInLinkToEmail` call was made against a real email address during Session 13 — testing it end-to-end requires a deploy to prod (the dev bypass path skips auth entirely, and localhost `sendSignInLinkToEmail` calls go to real Firebase and would send real emails, which would be wasteful for a smoke test). **Session 13 does not prove email delivery works.** That proof lands in Session 16 when the tutor "assign to Wise" button is wired to real flows, or sooner if Kiran manually triggers a send via DevTools from the deployed app.
- **Cross-device flow (`ConfirmEmailScreen`).** Requires a real email arriving on a second device. Not exercised.
- **The `auth/invalid-action-code` / `auth/expired-action-code` error paths.** Require a real expired link to test.
- **The `auth/unauthorized-continue-uri` error path.** Would require removing the authorized domain, which is destructive.
- **Firebase's re-auth-from-stale-URL behavior.** Spec notes that Firebase validates `oobCode` server-side, so a stale URL on a logged-in user is a no-op; not verified empirically.

These gaps are acceptable for Session 13 because the code paths are straight-through Firebase API calls with narrow failure surfaces, and Session 16's tutor button provides the first real end-to-end test against a deployed environment.

---

## Surprises

### 1. `StudentPortal` already existed

The Session 12 kickoff framed Session 13 as building `StudentPortal` from scratch. The repo has had `StudentPortal` since Phase 2 Session 3. The scope that remained was genuinely just the auth path plus the sessionStorage handoff. **Re-reading the actual code before starting is worth more than trusting the kickoff prompt.** Future sessions should do the same.

### 2. Banner-only-in-happy-path was wrong

First banner placement was inside the `ready` state return only. Browser-test immediately caught this with a fabricated studentId. **Defensive UI should surface the context of *why* a user is on a screen, even when the screen itself is a fallback.** Cost: one extraction refactor, ~25 lines moved.

### 3. The role-disambiguation caption was a surprise need

The session plan had no line item for SignInScreen copy changes. Walking through the screen in the browser surfaced it. **The spec was written against a two-tab SignInScreen; adding the third tab is a meaningful information-scent change that needed its own UX fix.** Kiran caught it immediately on first look: *"that's for parents and students right? The third tab of password is for them as well or something?"* — exactly the confusion the caption is supposed to prevent. Shipped mid-session.

### 4. Firebase Auth authorized domains ≠ Firebase Hosting custom domains

These are two separate lists. Session 11b's custom domain mini-session added `portal.affordabletutoringsolutions.org` to Hosting. Session 13 had to separately add it to Auth. **Documented in the "Firebase Authorized domains" section above.** Not a blocker because Kiran handled it at session start, but worth calling out for any future Firebase-adjacent session.

### 5. The Babel compile is a surprisingly good smoke test

`@babel/preset-react` catches JSX tree imbalances, stray commas, wrong prop shapes, and any syntax bugs that would break at `type="text/babel"` load time in the browser. Running it after each significant edit saved two round-trips to the browser that would otherwise have been "refresh, see white screen, open DevTools, find the Babel error, fix, refresh again." The setup is a one-time `npm install @babel/cli @babel/core @babel/preset-react` in `/tmp/babel-check/` and after that `npx babel --presets=@babel/preset-react app.jsx -o /tmp/app.check.js` takes ~2 seconds.

---

## State of `WISE_WRITE_ENABLED` at session close

**Still `false`.** Orthogonal to Session 13 — this session only touched client-side auth code. No Wise calls made, no Cloud Function redeploys, no functions/.env edits. Flip remains a separate decision tied to Session 17 rollout.

---

## Follow-ups

1. **[Session 14 scope] Replace the `pendingAssignmentBanner` with a real editor open.** The banner currently says "The in-browser worksheet editor is shipping in the next update." Session 14 reads the same `sessionStorage` key and mounts `SubmissionEditor` against the referenced assignment+student tuple. After that, the banner JSX in this session can be deleted entirely (or kept as a fallback for submission-not-found).

2. **[Session 14 or 16 test] Actually send a real email-link and click it.** Session 13 never exercised the outbound path against real Firebase. Should happen before any student hits the flow in anger. Easiest trigger: open the deployed app at `https://portal.affordabletutoringsolutions.org/?a=test&s=test` in Kiran's own browser, click Email link, type his own email, confirm the arrival in his inbox, click the link, watch the same-device flow complete.

3. **[Session 16 test] Cross-device flow end-to-end.** Same as above but the email is forwarded to a second device (or opened on phone while requested on desktop). Should route through `ConfirmEmailScreen`, not `SignInScreen`.

4. **[Session 14 or later] `initialMode` should also respond to URL params beyond `a`/`s`.** Right now `initialMode` is derived from `hasPendingAssignment` (the presence of a stashed pending assignment). A direct `?signin=emaillink` override for testing / support links would be cheap to add but isn't strictly needed. Defer until someone asks.

5. **[Session 15 scope, unchanged from spec] `questionKeys` Firestore rules.** Session 13 didn't touch `firestore.rules` — still on Session 15's plate.

6. **[Low priority] Delete the `.bak*` catalog backup files** from Session 12. Carried forward from Session 12 follow-up #8. Still not a blocker for Session 13 or 14.

7. **[Observational] Monitor orphaned Firebase Auth users.** Spec §"Edge cases" notes that `signInWithEmailLink` creates a Firebase Auth user even if the email is not in the allowlist. These users are harmless (rules block every read/write without an allowlist entry) but they accumulate. If the count grows meaningfully (>50), a one-off admin SDK cleanup script could delete Auth users with no allowlist entry. Not Session 13's problem.

---

## Checkpoint

Session 13 is complete when:

- [x] `AUTH_CONTINUE_HOST`, `PENDING_ASSIGNMENT_KEY`, `EMAIL_FOR_SIGNIN_KEY` module-level constants defined
- [x] `stashPendingAssignmentFromUrl()` runs at module load and inside completion handlers
- [x] `buildAuthContinueUrl()` preserves `?a=&s=` on the continue URL
- [x] `SignInScreen` has three tabs (Google / Email link / Password) with role-disambiguation caption
- [x] `handleEmailLinkSignIn(email)` sends the link and persists the email to localStorage
- [x] `useEffect` in `App` detects and completes incoming email-link URLs
- [x] `ConfirmEmailScreen` handles the cross-device re-entry case
- [x] Post-sign-in URL cleanup (`apiKey`, `oobCode`, `mode`, `continueUrl`, `lang` stripped) with `history.replaceState`
- [x] `StudentPortal` reads `pendingAssignment` on mount, validates `s` matches `studentId`, renders banner above all three return paths
- [x] Banner has a working Dismiss button that clears both React state and `sessionStorage`
- [x] Babel compile of `app.jsx` is clean
- [x] Manual browser tests: deep-link banner, three-tab sign-in, tutor view unchanged
- [x] `portal.affordabletutoringsolutions.org` added to Firebase Auth Authorized domains
- [x] Dev bypass (`?dev=1`) still works (confirmed via role=student and role=tutor)
- [x] This doc committed to the repo

---

## Kickoff prompt for Session 14

> Copy the block below into a fresh Claude Code session after `/clear`.

---

I'm ready to start **Phase 3 Session 14** of ats-portal: the bubble-sheet `SubmissionEditor` + in-browser PDF viewer. Session 13 (magic-link auth + deep-link handoff) shipped the auth path and a placeholder banner on the student portal that reads `sessionStorage.pendingAssignment` on mount. Session 14 replaces the banner with a real editor.

**Confirm today's date with me at session start before doing anything else.**

### Repo + project naming

- GitHub repo: `github.com/kiranshay/ats-portal`
- Local directory: `~/projects/ats-portal/`
- Firebase project ID: **still `psm-generator`** — immutable.
- App lives at `https://portal.affordabletutoringsolutions.org`.

### Read these in order

1. **`docs/PHASE_3_SPEC.md`** §"Worksheet data model" and §"Session plan" row 14.
2. **`docs/PHASE_3_SESSION_13.md`** — auth path, `pendingAssignment` handoff contract, the banner Session 14 is replacing.
3. **`docs/PHASE_3_SESSION_12.md`** §"Portal / catalog drift" (Follow-up #1) — **this is now load-bearing for Session 14**, unlike Session 13. The `SubmissionEditor` needs per-question metadata (`questionIds[]`, `answerFormat`) and the decision about whether to load from `WS_RAW` vs `worksheets_catalog.json` vs Firestore must be resolved before building the editor.
4. **`worksheets_catalog.json`** — per-row `questionIds[]`, `answerFormat`, Firebase Storage `stu` URLs. All 131 supported rows enriched.
5. **[app.jsx:4316](../app.jsx#L4316)** — `StudentPortal` where the `pendingAssignmentBanner` currently lives. Session 14 wires the Start action to mount `SubmissionEditor`.
6. **[app.jsx:4024](../app.jsx#L4024)** — `StudentPortal` component structure, for knowing where to mount the editor route.

### What Session 14 ships

- **`SubmissionEditor` component** — hybrid MC grid + free-response input, driven by `answerFormat`. Renders one row per question with the right input type (A–D radio, numeric input, or both for `"mixed"`).
- **In-browser PDF viewer** using the `pdf.js` script already loaded in `index.html`. Shows the STU PDF alongside the answer entry area. Firebase Storage URLs come from `worksheets_catalog.json.stu`.
- **Per-question `responses[]` shape** on the submission doc, replacing or augmenting the Phase 2 textarea path.
- **Phase 2 textarea fallback** — any worksheet without `questionIds[]` (the 19 unsupported rows) still works via the old path.
- **Replace the `pendingAssignmentBanner`** in `StudentPortal` with the new editor mount. Keep the banner JSX commented or delete it entirely — Session 13 explicitly said the banner is a placeholder.
- **Resolve the Session 12 catalog drift.** Session 12 §"Portal / catalog drift" Follow-up #1 recommended option 3: port `WS_RAW` entries into the catalog and retire `WS_RAW`. Session 14 either executes that or explicitly defers it with a written reason.

### What NOT to do

- **Do NOT rewrite `SignInScreen`, `ConfirmEmailScreen`, or the auth path.** Session 13's work is frozen.
- **Do NOT change `questionKeys/{id}` data.** Session 12 owns it.
- **Do NOT flip `WISE_WRITE_ENABLED`.** Still gated.
- **Do NOT implement auto-grading.** That's Session 15.
- **Do NOT resolve row [116] Percentages duplicate unless it actively blocks SubmissionEditor rendering.** Pre-existing catalog quality issue.

### Pause at

- **Before deciding the catalog data source** (`WS_RAW` vs `worksheets_catalog.json` vs Firestore). This is the load-bearing Session 12 drift decision.
- **Before touching `firestore.rules`.** Session 14 may need a rules delta for `worksheets` reads depending on where the editor loads catalog data from. Walk through the read-path with Kiran.
- **Before wiring the Firebase Storage PDF URL into `pdf.js`.** Session 12's uploads use the default Firebase Storage rules (`allow read: if false`). Kiran needs to decide whether Session 14 adds a Storage rules delta now or defers to Session 15. Without it, `pdf.js` cannot fetch the STU PDF client-side.
- **Before committing any new `responses[]` shape.** Confirm the schema with Kiran so Session 15's grader has a stable join target.

### Close out

Write `docs/PHASE_3_SESSION_14.md` + kickoff prompt for Session 15 (auto-grading trigger + Wise post-back).

### Constraints carrying forward

- **No slop.**
- **ats-portal commit override applies:** Claude may commit + push directly with short user-voice messages, no Co-Authored-By.
- **No bundler.**
- **Every new function must do its own Firebase Auth check internally.**
- **Run `gcloud auth application-default login` before any admin SDK commit** — not expected for Session 14 (client-side only) but carrying forward in case catalog migration needs it.
