# Auth Migration Plan — psm-generator

**Status:** Not started. Plan written 2026-04-13.
**Trigger:** Next session, after typography polish ships.
**Owner:** Kiran (Aidan in the loop on cutover timing).

---

## Why this exists

The `@affordabletutoringsolutions.org` Google Workspace is being wound down (cost vs. value — workspace licenses don't justify the tutor headcount). Only `support@affordabletutoringsolutions.org` will be retained. All ~51 tutors will lose their workspace accounts on an as-yet-undetermined date.

Today, psm-generator gates access at three layers via the workspace domain:

1. **`firestore.rules`** — server-side `request.auth.token.email.matches('.*@affordabletutoringsolutions[.]org$')`
2. **`SignInScreen`** in `app.jsx` — Google sign-in popup with `hd: ATS_DOMAIN` hint + client-side post-sign-in domain check
3. **`window.auth` init** — domain enforcement after `onAuthStateChanged`

When the workspace dies, all three break simultaneously. Tutors get locked out.

**Decision:** Replace the domain gate with a **Google sign-in + per-email allowlist** model, designed from the start to also accommodate the Phase 2 student/parent portal's role-based claims.

## Why allowlist, not email/password

(Recap from the planning conversation — keep this here so future-Kiran doesn't re-litigate it.)

- **Lower ops burden.** Email/password makes you the password-reset desk for 51 tutors.
- **Tutors prefer it.** Most already have Gmail; no new password to remember.
- **Easy admin.** Adding/removing a tutor is one Firestore doc write.
- **Seedable.** The Wise CSV import already captured tutor emails for most of the roster.
- **Phase 2 compatible.** Allowlist entries can carry role + linked-student-id metadata, so the same auth layer serves tutors AND the student/parent portal without a second migration.

## Design

### Allowlist schema

A Firestore collection `allowlist/{emailLowercase}` with documents shaped like:

```json
{
  "email": "jane@gmail.com",
  "role": "tutor",
  "studentId": null,
  "addedBy": "kiran@personal-email.com",
  "addedAt": "2026-04-20T...",
  "active": true
}
```

`role` values:
- `"admin"` — full access, can edit allowlist (you, Aidan)
- `"tutor"` — current tutor permissions
- `"student"` — Phase 2; read-only for one studentId
- `"parent"` — Phase 2; read-only for one or more studentIds

`studentId` is null for admin/tutor, set for student/parent. (Phase 2 may want `studentIds: []` for parents with multiple kids — design that into the schema NOW so we don't migrate twice.)

`active: false` is a soft-disable so you can revoke without deleting (audit trail).

### Firestore rules

```
match /databases/{database}/documents {
  // Allowlist itself: only admins can read/write.
  match /allowlist/{email} {
    allow read, write: if request.auth != null
      && exists(/databases/$(database)/documents/allowlist/$(request.auth.token.email))
      && get(/databases/$(database)/documents/allowlist/$(request.auth.token.email)).data.role == "admin"
      && get(/databases/$(database)/documents/allowlist/$(request.auth.token.email)).data.active == true;
  }

  // Main app data: any active allowlist entry can read.
  // Tutors and admins can write. Students/parents read-only (Phase 2).
  match /psm-data/main {
    allow read: if isActive();
    allow write: if isActive() && (role() == "tutor" || role() == "admin");
  }

  function isActive() {
    return request.auth != null
      && exists(/databases/$(database)/documents/allowlist/$(request.auth.token.email))
      && get(/databases/$(database)/documents/allowlist/$(request.auth.token.email)).data.active == true;
  }
  function role() {
    return get(/databases/$(database)/documents/allowlist/$(request.auth.token.email)).data.role;
  }
}
```

**Cost note:** every read/write does an `exists` + `get` on the allowlist doc. For ~51 active sessions this is fine. If it ever scales past a few hundred concurrent users, switch to custom claims (set on the Firebase Auth user via Admin SDK) which are signed into the JWT and require zero Firestore reads at rule-eval time. The allowlist collection becomes the source of truth that *populates* the claims, not what rules read directly. That's a known upgrade path; don't optimize prematurely.

### Client changes

**`SignInScreen`** ([app.jsx:616](app.jsx#L616)):
- Remove the `hd: ATS_DOMAIN` hint from the GoogleAuthProvider.
- After sign-in, no client-side domain check; instead, attempt a Firestore read. If it fails with `permission-denied`, show "Your account isn't authorized. Ask Kiran to add you to the allowlist." with the user's email visible so they can copy-paste it.
- Consider adding a "Sign out and try a different account" button on the error screen.

**`onAuthStateChanged` handler** ([app.jsx:681](app.jsx#L681)):
- Drop the domain check.
- Optimistic: assume the user is allowed and let the Firestore listener prove or disprove it. The `permission-denied` error from `onSnapshot` is the new gate signal.
- Show a brief loading state during this check.

**`window.auth` init** in `build_index.py`:
- No changes needed; the persistence setting stays.

### Admin UI for allowlist management

A new tab or modal (admins-only) where you can:
- See the current allowlist with role + active status
- Add an entry: email + role + studentId (with autocomplete from existing students for student/parent roles)
- Toggle active/inactive
- Bulk import from CSV (for the initial seed from Wise data)

Visibility: a new "Admins" tab in the header, only rendered if `currentUser.role === "admin"`. The role is read once on app boot from the user's allowlist entry and cached in React state.

This is critical infrastructure — without it, every tutor add/remove requires editing Firestore Console JSON by hand, which is user-hostile and error-prone.

## Migration cutover sequence

The dangerous part. Doing this wrong locks out every tutor.

**Phase A — Build alongside (no behavior change):**
1. Add `allowlist` collection in Firestore Console manually with you and Aidan as `admin` entries.
2. Implement allowlist-aware client code behind a feature flag: `const USE_ALLOWLIST_AUTH = false;`. When false, current domain-gate behavior is unchanged.
3. Implement the admin UI behind the same flag.
4. Deploy. Verify nothing changed for current tutors.

**Phase B — Dual-gate testing:**
5. Set `USE_ALLOWLIST_AUTH = true` locally (dev bypass mode). Verify the new flow with a personal Gmail. Add yourself to the allowlist and verify access. Remove yourself and verify the lockout error displays correctly.
6. Update `firestore.rules` to **OR** the old domain check with the new allowlist check:
   ```
   allow read, write: if isWorkspaceUser() || isAllowlisted();
   ```
   Deploy rules. Both auth paths now work simultaneously.
7. Seed the allowlist from the Wise CSV. Use a one-shot script (Node + `firebase-admin`) that reads `wise_export.csv`, dedupes by email, and writes one allowlist doc per tutor with `role: "tutor"`. Aidan can verify the list is complete.

**Phase C — Flip the flag:**
8. Set `USE_ALLOWLIST_AUTH = true` in production. Deploy.
9. **Tutors who use the same email** (whether `@affordabletutoringsolutions.org` or personal Gmail) experience zero change.
10. **Tutors whose workspace email differs from their seeded allowlist email** see the lockout screen with their email visible; they tell you which email they want, you add it to the allowlist, they reload.
11. Watch error rates / Slack for ~3 days.

**Phase D — Remove the old gate:**
12. Once stable, update `firestore.rules` to drop `isWorkspaceUser()` — only allowlist remains.
13. Remove `ATS_DOMAIN` and the workspace check from `app.jsx`. Delete the feature flag.
14. Deploy. Migration complete.

**Rollback plan at any phase:**
- **Phase B/C:** flip the feature flag off, deploy. Old domain gate still works because rules still OR both checks.
- **Phase D:** revert the rules deploy. Trickier — keep the previous rules file in git history with a clear commit message so it's easy to find.

## Risks

1. **Tutor uses workspace email + has no personal Gmail.** Probably zero of these (everyone has personal Gmail by 2026), but worth asking Aidan before Phase C.
2. **Wise CSV email field is missing for some tutors.** Audit the CSV before Phase B step 7. For any missing entries, Aidan provides them manually.
3. **Allowlist Firestore reads add latency.** Each app boot does one `get` on the allowlist doc. ~50ms p50. Cache the result in React state for the session; don't re-read on every page nav.
4. **Admin lockout.** If you accidentally remove your own admin entry, you're locked out and can only recover via Firebase Console manual edit. Mitigation: the admin UI refuses to let you delete yourself; CSV import refuses to overwrite admin entries.
5. **Migration day during active tutor session.** A tutor mid-session when you flip the rules deploy will see a write fail. Mitigation: do the cutover at a low-traffic time (Sunday morning) and post in Slack.

## Estimated effort

- **Phase A** (build alongside): 2-3 hours
- **Phase B** (rules dual-gate + seed): 1-2 hours
- **Phase C** (flip + monitor): 30 min flip + ~3 days monitoring
- **Phase D** (cleanup): 30 min

Total active work: ~5 hours across 2 sessions. Plus monitoring/coordination overhead.

## Open questions to resolve in the kickoff session

1. **What date does the workspace die?** Aidan should know the deadline.
2. **Who else needs admin?** You, Aidan, anyone else?
3. **Do any tutors definitely not have a personal Gmail?** Aidan check.
4. **Where does the allowlist seed CSV live?** Reuse the Wise import or a fresh Aidan-curated list?
5. **Should the admin UI live in the existing app or as a separate page?** I lean "existing app, new tab gated on `role === 'admin'`" but happy to flex.

## What this plan deliberately does NOT cover

- **Custom claims optimization** — switch to Firebase Auth custom claims later if scale demands. Allowlist-collection-based rules are simpler and fine for current scale.
- **OAuth provider beyond Google** — sticking with Google sign-in only. No Facebook, Apple, etc.
- **Two-factor auth** — Google handles 2FA on their side via the user's Google account. We don't add another layer.
- **Phase 2 portal implementation** — see `docs/PHASE_2_PORTAL_PROMPT.md`. This plan only ensures the auth layer is *ready* for Phase 2, not that Phase 2 is built.

## Kickoff prompt for next session

When starting the next session, paste this:

> Working on auth migration for psm-generator. Read `docs/AUTH_MIGRATION_PLAN.md` first — it has the full plan. Before touching code: (1) ask Kiran any unresolved questions from the "Open questions" section, (2) confirm the cutover phase we're starting in (probably Phase A), (3) plan first, code second. Do NOT skip to implementation without confirming the plan still matches reality (the workspace shutdown date may have shifted, the tutor roster may have changed, etc.).
