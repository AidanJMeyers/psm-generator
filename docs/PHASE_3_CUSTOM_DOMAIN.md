# Phase 3 — Custom Domain Mini-Session

**Date:** 2026-04-14
**Session type:** Config-only mini-session between Session 11b and Session 12. Narrow scope: point `portal.affordabletutoringsolutions.org` at Firebase Hosting, flip `APP_BASE_URL`, redeploy the three Wise callables, smoke-test the new deep-link host.
**Parent docs:** [PHASE_3_SESSION_11b.md](PHASE_3_SESSION_11b.md) §Follow-ups #5 · [PHASE_3_SESSION_11.md](PHASE_3_SESSION_11.md) §Follow-ups #2
**Outcome:** `portal.affordabletutoringsolutions.org` is live over HTTPS, authorized for Firebase Auth, and `assignToWise`'s deep-link message now embeds the new host. `WISE_WRITE_ENABLED` still `false`. No code changes anywhere — every change this session was config.

---

## What shipped

### DNS (Hostinger, `affordabletutoringsolutions.org` zone)

Three new records on the `portal` subdomain. The existing `ftp` A record was left untouched.

| Type | Name | Value | TTL |
|---|---|---|---|
| TXT | `portal` | `hosting-site=psm-generator` | 300 |
| TXT | `_acme-challenge.portal` | *(Let's Encrypt challenge string from Firebase Advanced setup)* | 300 |
| A | `portal` | `199.36.158.100` | 300 |

Notes:
- Firebase Advanced setup mode was used (not Quick setup). Advanced does upfront DNS-01 cert validation via the `_acme-challenge` TXT; Quick setup would have deferred cert issuance until after the A record was live.
- Firebase issued **one** A record IP (`199.36.158.100`), not the two-IP redundant setup seen in older docs. Single A record was sufficient — domain is live and cert minted.
- Hostinger warned that "an A record already exists" when adding `portal` — the existing record was on `ftp`, unrelated, safe to proceed. Hostinger's warning fires on any new A record in the zone regardless of hostname overlap.
- ACME TXT propagation was slow on Firebase's first verification attempt (detected by `dig @8.8.8.8` within minutes, but Firebase's ACME verifier took ~7 minutes to pick it up — appears to be a Firebase-side negative-lookup cache). Second verification attempt succeeded without any DNS changes. Do not switch Advanced → Quick setup prematurely if this recurs; just retry Verify.

### Firebase Hosting

- **Custom domain:** `portal.affordabletutoringsolutions.org` added to the `psm-generator` Hosting site via Firebase console Advanced setup.
- **TLS cert:** Let's Encrypt cert minted via DNS-01 challenge. Verified live with `curl -I https://portal.affordabletutoringsolutions.org` → `HTTP/2 200`, no SSL errors.
- **Old aliases unchanged:** `psm-generator.web.app` and `psm-generator.firebaseapp.com` remain live as project-id aliases. Cannot be removed (immutable). The three Session 11b test messages in Kiran's Wise chat still point at `psm-generator.web.app` and still work — both hosts serve the same content.

### Firebase Authentication

- Added `portal.affordabletutoringsolutions.org` to the **Authorized domains** list in Firebase console → Authentication → Settings.
- This is a separate list from Hosting custom domains. Adding a custom domain to Hosting does NOT auto-add it to Auth. The first attempt to sign in on the new domain returned `auth/unauthorized-domain` until this step was done.
- `localhost`, `psm-generator.firebaseapp.com`, and `psm-generator.web.app` were left in the list — removing any of them would break sign-in on the old URLs where existing Wise deep-link messages still point.

### Functions config

Single line edit in [functions/.env](../functions/.env):

```diff
-APP_BASE_URL=https://psm-generator.web.app
+APP_BASE_URL=https://portal.affordabletutoringsolutions.org
```

`WISE_WRITE_ENABLED=false` and `DEV_TEST_RECIPIENT_EMAIL=kshay@affordabletutoringsolutions.org` unchanged. Session 11b's gate posture is fully preserved.

### Deploy

```
firebase deploy --only functions:reconcileStudentsWithWise,functions:assignToWise,functions:sendStudentMessage
```

Result (all three):
```
✔ functions[sendStudentMessage(us-central1)] Successful update operation.
✔ functions[reconcileStudentsWithWise(us-central1)] Successful update operation.
✔ functions[assignToWise(us-central1)] Successful update operation.
✔ Deploy complete!
```

No IAM work needed — `allUsers → run.invoker` bindings from Session 11/11b persisted across the redeploy as expected. No Node 22 bump (deprecation warning still fires but is unchanged from Session 11b and out of scope here; see Session 11b §Follow-ups #4).

## Smoke test

Same DevTools call as Session 11b §"Test call 1", run from `https://portal.affordabletutoringsolutions.org` after sign-in:

```js
const r = await firebase.app().functions("us-central1")
  .httpsCallable("assignToWise")({ studentId: "rnbw56f5", assignmentId: "s62qx0bh" });
```

Response:

```js
{
  ok: true,
  mode: "dev-redirect",
  chatId: "69de9c5798ee51775f230596",      // same chat from Session 11b — reused
  messageId: "69dea8950a215f6c8dc5df1c",   // new message, 4th in the chat
  reusedChat: true,
  deepLink: "https://portal.affordabletutoringsolutions.org/?a=s62qx0bh&s=rnbw56f5"
}
```

Acceptance criteria, all met:
- `mode === "dev-redirect"` — gate held, no real student touched.
- `deepLink` starts with `https://portal.affordabletutoringsolutions.org/` — the redeployed function is reading the updated `APP_BASE_URL` from its env.
- `reusedChat: true`, same `chatId` as Session 11b — idempotency preserved across the redeploy.
- Fourth message landed in the `kshay@` admin chat in Wise with the expected text:
  ```
  New worksheet: ComInfoIdeas-Easy (10Qs). Start: https://portal.affordabletutoringsolutions.org/?a=s62qx0bh&s=rnbw56f5
  ```
- Tapping the link in Wise opens the app at `portal.affordabletutoringsolutions.org/?a=s62qx0bh&s=rnbw56f5` with cert valid, app loaded, Synced badge present, 51 students / 23 assigned visible. No regressions.

### Side note on the DevTools call

The DevTools call failed once with `firebase.app(...).functions is not a function` because the functions-compat SDK is not loaded by `index.html` (see Session 11b §Follow-ups #3). Worked around in-session by injecting the script tag into the page manually:

```js
await new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions-compat.js';
  s.onload = resolve;
  s.onerror = reject;
  document.head.appendChild(s);
});
```

This is transient (DevTools-only, gone on refresh) and does not modify `index.html`. Session 11b §Follow-ups #3 (static script tag in `index.html`) remains outstanding and is still Session 16's scope.

## Out-of-scope changes that happened anyway

Two things landed this session that were not in the original kickoff. Both were explicit Kiran asks mid-session.

### Firebase project display name → `ats-portal`

Done by Kiran before session start. Cosmetic only. The underlying Firebase **project ID** remains `psm-generator` — this is immutable and affects:

- `.firebaserc` (`"default": "psm-generator"`) — do not touch
- `.github/workflows/deploy.yml` (`--project psm-generator`) — do not touch
- `psm-generator.web.app` and `psm-generator.firebaseapp.com` aliases — live forever
- Cloud Logging / Cloud Run / Firestore paths — all still reference `psm-generator`
- [functions/config.js:25](../functions/config.js#L25) default fallback for `APP_BASE_URL` — still `https://psm-generator.web.app`, harmless since `.env` overrides it

### GitHub repo rename `psm-generator` → `ats-portal`

Done mid-session. Required exactly two changes:

1. Rename on github.com via Settings → General → Repository name. GitHub auto-creates redirects from the old URL; all git history, PRs, issues, stars, collaborators, and Actions secrets (`FIREBASE_TOKEN`) preserved.
2. Local git remote update:
   ```
   git remote set-url origin https://github.com/kiranshay/ats-portal.git
   git fetch origin   # sanity check — succeeded cleanly
   ```

Local directory was also renamed from `~/projects/psm-generator/` to `~/projects/ats-portal/`.

What was **not** changed and must stay `psm-generator`:

- `.firebaserc`
- `.github/workflows/deploy.yml` `--project psm-generator` line
- `index.html` / `app.jsx` Firebase config object (project ID)
- `functions/config.js` fallback string (cosmetic, deferred)
- `README.md` live-URL references and project-id explainer (cosmetic, deferred)
- ~25 historical session docs (rewriting history is noise)

Rationale for the split: **Firebase project IDs are immutable**, so there is no version of this rename that also renames the Firebase side. Bundling any of the above "cosmetic" cleanups into this session would have bloated the diff and risked breaking the redeploy, which was the load-bearing step. The rename does not affect any deployed surface.

## State at session close

| Thing | State |
|---|---|
| `APP_BASE_URL` on deployed functions | `https://portal.affordabletutoringsolutions.org` |
| `WISE_WRITE_ENABLED` | `false` (unchanged from Session 11b) |
| `DEV_TEST_RECIPIENT_EMAIL` | `kshay@affordabletutoringsolutions.org` (unchanged) |
| Custom domain live over HTTPS | ✓ |
| Custom domain in Firebase Auth allowlist | ✓ |
| Old `psm-generator.web.app` alias | still live, still in Auth allowlist |
| `assignToWise` deep link host | new domain, verified end-to-end |
| Real students touched on Wise | still zero |
| GitHub repo | `github.com/kiranshay/ats-portal` |
| Firebase project ID | `psm-generator` (immutable, unchanged) |
| Firebase project display name | `ats-portal` |

## Follow-ups

Almost all of Session 11b's follow-ups carry forward unchanged. This session adds:

1. **[low priority, Session 12 or 13 opening commit] Cosmetic `psm-generator` → `ats-portal` cleanup.** Not load-bearing, not urgent. Safe to touch:
    - [README.md:5](../README.md#L5) — change `Live: https://psm-generator.web.app` to `Live: https://portal.affordabletutoringsolutions.org`
    - [README.md:60](../README.md#L60) — accurate as-is (it explains the immutable project ID); leave or add a parenthetical about the display name. Not urgent.
    - [functions/config.js:1](../functions/config.js#L1) — comment; can become "ats-portal Cloud Functions"
    - [functions/config.js:25](../functions/config.js#L25) — default fallback; can become `https://portal.affordabletutoringsolutions.org`. Note this only matters if `.env` is ever removed, which it shouldn't be.
    - Historical docs — do not touch, they are dated records.

2. **[Session 13 scope, unchanged] `index.html` title and header still say "PSM Generator".** Out of scope for this session per kickoff; Session 13 owns the StudentPortal split and is the right place to rename the app's user-facing brand to "ATS Portal" (or whatever the final product name is). Visible in the browser tab of the smoke-test screenshot.

3. **[unchanged from Session 11b §Follow-ups #3] `firebase-functions-compat.js` script tag in `index.html`.** Still Session 16's scope. This session's smoke test required a DevTools-injected script tag as a workaround.

4. **[unchanged from Session 11 §Follow-ups] Node 20 runtime deprecation 2026-04-30.** This session's redeploy emitted the warning and did not act on it. Any session that redeploys `functions/` after 2026-04-30 must bump `engines.node` to `"22"` first.

5. **[unchanged from Session 11b] Multi-worksheet title synthesis.** Live tests have only ever covered the single-worksheet branch of the deep-link message template. Still Session 16's scope.

## Checkpoint

Mini-session is complete when:

- [x] DNS TXT (ownership), TXT (ACME challenge), and A records live on Hostinger
- [x] `portal.affordabletutoringsolutions.org` serves over HTTPS with a valid Let's Encrypt cert (`curl -I` returns `HTTP/2 200`)
- [x] `portal.affordabletutoringsolutions.org` added to Firebase Auth authorized domains; Google sign-in works on the new host
- [x] [functions/.env](../functions/.env) `APP_BASE_URL` flipped to the new host
- [x] `reconcileStudentsWithWise`, `assignToWise`, `sendStudentMessage` redeployed to `us-central1` (all three "Successful update operation")
- [x] Smoke-test `assignToWise` call from the new domain returns `mode: "dev-redirect"` and `deepLink` starting with the new host
- [x] Fourth message arrived in Kiran's Wise admin chat with the new-host deep link
- [x] Tapping the link in Wise opens the app correctly on the new domain
- [x] `WISE_WRITE_ENABLED=false` at session close
- [x] GitHub repo renamed, local remote updated, `git fetch` clean
- [x] This doc committed to the repo

---

## Kickoff prompt for Session 12

> Copy the block below into a fresh Claude Code session after `/clear`.

---

I'm ready to start **Phase 3 Session 12** of ats-portal (formerly psm-generator): extraction + audit + PDF migration. This is the first Session 11–independent session of Phase 3 — all Node-side scripting + admin SDK, no new Cloud Functions, no client changes. Session 11 and 11b shipped the Wise read + write path; the custom domain mini-session flipped `APP_BASE_URL` to `https://portal.affordabletutoringsolutions.org`; Session 12 builds the data layer that auto-grading (Session 15) will actually join against.

**Confirm today's date with me at session start before doing anything else.**

### Repo + project naming

- GitHub repo: `github.com/kiranshay/ats-portal` (renamed from `psm-generator` during the custom domain mini-session)
- Local directory: `~/projects/ats-portal/`
- Firebase project ID: **still `psm-generator`** — immutable, do not attempt to rename. Display name is `ats-portal`.
- Any file that references `psm-generator` as a Firebase project ID, Hosting site alias, or GCP resource name is correct and must stay that way.

### Read these in order

1. **`docs/PHASE_3_SPEC.md`** — §"Worksheet data model" and §"Auto-grading design" for the shape `questionKeys/{id}` must take and the join bridge (`worksheets_catalog.json.questionIds[i]` ↔ `responses[i]` ↔ `questionKeys/{id}`).
2. **`docs/PHASE_3_CUSTOM_DOMAIN.md`** — the session between 11b and 12; captures the current `APP_BASE_URL`, the repo rename, and the immutable-project-ID split.
3. **`docs/PHASE_3_SESSION_11b.md`** — not load-bearing but shows the current state of `functions/` and the gate posture, useful context.
4. **`worksheets_catalog.json`** — current catalog shape, which entries have `stu` vs `key` URLs and which are still `[LINK PENDING]`.
5. **`build_index.py`** — how the catalog is currently built; Session 12's rewrite needs to stay compatible with this script.

### What Session 12 ships

- **`scripts/extract_answer_keys.mjs`** — Node script, uses `pdftotext` via `child_process.spawn`. Walks every `KEY_*.pdf` referenced in `worksheets_catalog.json`, extracts per-question answers, uploads to `questionKeys/{questionId}`. Produces a stable `questionId` naming scheme that the catalog can reference. MC answers A/D, free-response numerics, mixed-format worksheets all handled.
- **`scripts/audit_catalog.mjs`** — walks the catalog + the extraction output, produces a report of: (a) worksheets with successful extraction, (b) worksheets where the PDF parsed but answers didn't fit the expected shape (Full Length Exams are the expected pain point), (c) worksheets with missing PDFs. Writes `docs/PHASE_3_CATALOG_AUDIT.md`.
- **`scripts/migrate_stu_pdfs.mjs`** — uploads every matched `STU_*.pdf` to Firebase Storage at `worksheets/{slugified-title}.pdf`, rewrites `worksheets_catalog.json` `stu` field to the download URL.
- **Catalog rewrite** — `worksheets_catalog.json` gains `questionIds: [...]` and `answerFormat: "mc" | "fr" | "mixed"` per entry.
- **`questionKeys/{questionId}` collection** populated in Firestore.

### What NOT to do

- **Do NOT touch `functions/`.** Session 12 is pure Node scripting + admin SDK.
- **Do NOT touch `firestore.rules`.** Session 15 adds the rules delta for `questionKeys`; Session 12 writes via admin SDK which bypasses rules.
- **Do NOT migrate submissions or touch Phase 2's existing submission shape.** Session 14 owns the per-question `responses[]` shape migration.
- **Do NOT flip `WISE_WRITE_ENABLED`.** Orthogonal to this session.
- **Do NOT try to rename the Firebase project ID.** It's immutable. The GitHub repo and display name are already `ats-portal`; the project ID is `psm-generator` forever.

### Pause at

- **Before writing any script** — confirm with Kiran: (a) where the OneDrive `KEY_*.pdf` files live on Kiran's local filesystem, (b) whether `pdftotext` is installed on his machine, (c) the expected `questionId` naming scheme.
- **After `extract_answer_keys.mjs` runs successfully on 5-10 sample worksheets** — Kiran reviews the extracted shape in the console before we commit to bulk upload.
- **Before `migrate_stu_pdfs.mjs` uploads to Firebase Storage** — Kiran reviews the planned target paths and any catalog shape changes.

### Close out

Write `docs/PHASE_3_SESSION_12.md` + `docs/PHASE_3_CATALOG_AUDIT.md`. Kickoff prompt for Session 13 (magic link + StudentPortal).

### Constraints carrying forward

- **No slop.**
- **ats-portal commit override applies** (formerly psm-generator override): Claude may commit + push directly with short user-voice messages, no Co-Authored-By.
- **No bundler.**
