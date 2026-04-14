# Phase 3 — Session 8: Email/Password Auth for Non-Gmail Families

**Date:** 2026-04-14
**Risk:** Medium. First auth-provider expansion since the Phase A/B allowlist migration. Touches `SignInScreen`, `onAuthStateChanged`, `firestore.rules` compatibility, and `AdminsTab`. No production cutover required — email/password ships as an additional option on the existing sign-in screen, gated by the same allowlist.
**Parent docs:** [PHASE_2_SESSION_7.md](PHASE_2_SESSION_7.md) · [AUTH_MIGRATION_PLAN.md](AUTH_MIGRATION_PLAN.md) · [PHASE_2_SESSION_1.md](PHASE_2_SESSION_1.md)

## Goal

Let the 20+ families without Google accounts sign in to the portal with an email + password they set themselves. Admin-issued flow: Kiran creates the account, Firebase emails the family a setup link, they click, set a password, email is implicitly verified, they sign in. Everything downstream of sign-in (allowlist lookup, role routing, rules) is already provider-agnostic since Session 7 — this session only adds a second way to establish the Firebase Auth identity.

## Architectural decisions (locked at kickoff)

1. **Admin-issued, not self-service.** Kiran creates the account + allowlist entry in one admin action. No "I signed up but I'm locked out" dead zone.
2. **Email verification via password-reset completion.** Firebase auto-marks `emailVerified = true` when a user completes a password reset, which is how the load-bearing `email_verified == true` rule at [firestore.rules:72-74](../firestore.rules#L72-L74) is satisfied. No separate verification email is required in the happy path. A safety net `UnverifiedScreen` handles the edge case (user signs in before completing reset).
3. **Secondary Firebase app for account creation.** Client SDK's `createUserWithEmailAndPassword` signs the new user in as a side effect — using a secondary named app instance isolates that state so the admin stays signed in. Standard Firebase workaround.
4. **UI presentation: segmented tabs.** SignInScreen gets a two-tab segmented control at the top: "Google" (default) and "Email & password". Plain language chosen so a parent with no technical background picks the right button. No disclosure menus or dropdowns.
5. **Forgot-password link in the password tab.** Calls `sendPasswordResetEmail` on whatever email is already typed into the email field. Same mechanism as the admin-issued setup link.
6. **Fold the `USE_ALLOWLIST_AUTH` dead-branch cleanup into this session.** Session 7 follow-up A.4. Session 8 edits the exact same code surface; a dedicated cleanup commit up front leaves the sign-in file in a known-clean state before the new password code lands. Removes: `USE_ALLOWLIST_AUTH` constant, `ATS_DOMAIN` constant, all gated false-arms at lines 590/592/622/934/965-977/988/992/1027/1186-1192/1341.

## What ships

Three commits on `main`, local-only until Kiran tests in the browser and pushes manually:

1. **Dead-branch cleanup.** Removes `USE_ALLOWLIST_AUTH` flag and all gated dead code. No behavior change — every dead branch has been unreachable in prod since Session 7's flag flip. Baseline clean-up before the real work.
2. **Email/password sign-in (client).** `SignInScreen` tabbed between Google and password. New handlers `handleEmailSignIn`, `handleForgotPassword`. New `UnverifiedScreen` safety net for users who somehow arrive with `emailVerified === false`. `onAuthStateChanged` updated to route unverified users to `UnverifiedScreen` instead of silently signing them out. `build_index.py` exposes `window.firebaseConfig` so the admin create-account flow can bootstrap a secondary app.
3. **Admin "Create family account" in `AdminsTab`.** New checkbox on the existing add-entry form: "Also create a password account and email a setup link." When checked, the client (a) spins up a secondary Firebase app, (b) calls `createUserWithEmailAndPassword` with a random temp password, (c) signs out the secondary instance, (d) sends a password reset email via the primary app, (e) writes the allowlist entry as today, (f) disposes the secondary app. Graceful handling of `auth/email-already-in-use` (skip create, still send reset).

## What does NOT ship

- Rules changes. `firestore.rules` is already correct for email/password — the `email_verified` gate works identically across providers.
- `DUAL_WRITE_GRACE` flip. Queued for Phase 3 housekeeping session.
- Real family rollout. Still gated on tutors actually logging session data.
- Bulk CSV import of family accounts. One-at-a-time is fine for 20 families on a first pass; batch import is a follow-up if the UX proves painful.
- Any new auth provider beyond email/password.
- Any change to existing Google sign-in behavior.

## Test plan (manual, in-browser, by Kiran)

1. `?dev=1` bypass still works — no regression in dev tooling.
2. Google sign-in still works end-to-end with `kiranshay123@gmail.com`.
3. AdminsTab: tick "Create password account" checkbox, enter a throwaway email you control, pick role `tutor`, click Add. Verify: allowlist row appears, setup email arrives, admin remains signed in as `kiranshay123@gmail.com` throughout.
4. Click the setup link in the email, set a password. Return to the app.
5. On SignInScreen, switch to the "Email & password" tab, enter the throwaway email + new password, sign in. Verify: lands in the tutor view (or wherever that role routes), no `permission-denied` in devtools console.
6. Sign out. Click "Forgot password?" with the same email filled in. Verify: new reset email arrives.
7. `kiranshay123@gmail.com` sign-in still works after everything above.

## Rollback

Revert the three commits. No rules deploy, no migration, no data changes. Rollback is a `git revert` + rebuild + push.

## Session 8 close-out will document

- Actual vs planned (any mid-session deviations)
- Whether Firebase's "password reset completion auto-verifies email" held empirically
- Whether `auth/email-already-in-use` path ever fired during testing
- Any UX papercuts Kiran hit during manual testing
- Kickoff prompt for the next Phase 3 session (likely DUAL_WRITE_GRACE close + PDF/OneDrive migration kickoff)
