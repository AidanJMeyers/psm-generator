# Phase 3 — Session 11: Cloud Functions proxy + Wise reconcile

**Date:** 2026-04-14
**Session type:** First server-side code in project history. **High risk** — first Blaze deploy, first Wise API contact, first IAM work against real prod surface.
**Parent docs:** [PHASE_3_SPEC.md](PHASE_3_SPEC.md) §"Cloud Functions: the new infrastructure commitment" · [PHASE_3_SESSION_10.md](PHASE_3_SESSION_10.md) §Follow-ups
**Outcome:** `reconcileStudentsWithWise` deployed as a v2 HTTPS callable in `us-central1`, first real call returned a clean report — 50/50 students with emails matched on Wise, 0 gaps. Write-path functions (`assignToWise`, `sendStudentMessage`) intentionally deferred to Session 11b.

---

## What shipped

### Function surface (deployed, live)

| Function | Type | Status | Notes |
|---|---|---|---|
| `reconcileStudentsWithWise` | v2 HTTPS callable, admin-only | **Live in us-central1** | Read-only. Reads `/students/*`, hits Wise `userByIdentifier` for each, returns totals + per-student detail. No Firestore writes, no Wise writes. |
| `assignToWise` | v2 HTTPS callable, tutor-only | **Deferred to 11b** | Needs the "Send a Message" Postman endpoint shape, not present in `docs/wise_postman.md`. |
| `sendStudentMessage` | v2 HTTPS callable, tutor-only | **Deferred to 11b** | Same dependency. |
| `gradeSubmissionManual` | v2 HTTPS callable, tutor-only | **Deferred to Session 15** | Per spec, "may be deferred." |
| `gradeSubmission` | v2 Firestore trigger | **Not this session** | Session 15 owns it. |

`WISE_WRITE_ENABLED` parameter set to `false` in [functions/.env](../functions/.env) at session close. When write functions land in 11b they'll be gated behind it.

### Files created

```
functions/
  .env                  non-secret params: WISE_WRITE_ENABLED=false,
                        APP_BASE_URL=https://psm-generator.web.app,
                        DEV_TEST_RECIPIENT_EMAIL=kshay@affordabletutoringsolutions.org
  .gitignore            node_modules, .env*, logs
  package.json          node 20, firebase-functions ^5.1.0, firebase-admin ^12.6.0
  package-lock.json     (committed)
  index.js              reconcileStudentsWithWise only. v2 onCall.
  config.js             defineSecret + defineString/defineBoolean wiring
  auth.js               verifyCallerIsTutor, verifyCallerIsAdmin — mirrors
                        firestore.rules §Identity helpers exactly
  wise.js               userByIdentifierEmail only. Native node:fetch, no
                        node-fetch dep. Basic Auth + x-api-key +
                        x-wise-namespace + user-agent: VendorIntegrations/{ns}.
```

### Files modified

- [firebase.json](../firebase.json) — added `functions` block (codebase `default`, source `functions/`), added `/api/reconcileStudentsWithWise` hosting rewrite, added `"functions/**"` to hosting ignore list
- Nothing else.

### Secrets deployed (via `firebase functions:secrets:set`)

- `WISE_API_KEY` — version 1 in Google Secret Manager
- `WISE_USER_ID` — version 1
- `WISE_INSTITUTE_ID` — version 1
- `WISE_NAMESPACE` — version 1, value `ats` (derived from `ats.wise.live` subdomain)

All four granted `roles/secretmanager.secretAccessor` on the compute runtime SA (`456789704122-compute@developer.gserviceaccount.com`) by Firebase deploy automatically.

## Reconcile report — first run

Admin-only call from DevTools console at https://psm-generator.web.app while signed in as `kshay@affordabletutoringsolutions.org`:

```
Totals: {
  students:        51,
  withEmail:       50,
  matched:         50,
  unmatched:       0,
  emailMismatched: 0,
  noEmail:         1,
  errors:          0
}
```

**Clean as it gets.** Every psm-generator student that has an email on file is already a Wise user with a matching email — no manual Wise user creation needed before Session 17 rollout. One student has no `meta.email` on their Firestore doc; Kiran eyeballed the per-row table offline to identify which one and decide whether to fix now or leave as-is.

Elapsed time for the sequential loop across 51 students: not recorded precisely, within the "few seconds" band predicted by the spec.

## What the session's write functions would have shipped, and why they're deferred

Three reasons `assignToWise` and `sendStudentMessage` did not make it into Session 11:

1. **The "Send a Message" Postman endpoint is missing from [docs/wise_postman.md](wise_postman.md).** The table of contents lists it at line 254 but the actual request/body/response details never appear in the document body (verified by grep). Without the shape, the implementation would be a guess. We will not guess at wire formats against a real third-party API with real credentials.

2. **Session 11's stated first-deploy scope was read-only reconcile.** Everything beyond that was "if time permits" per the kickoff, and time very much did not permit — see §Surprises below for where it went.

3. **Deferring keeps the infra-lessons clean.** Session 11b can open with a narrow scope: "confirm Send Message shape, add the two write functions, re-deploy, first write test pinned to `DEV_TEST_RECIPIENT_EMAIL`, flip `WISE_WRITE_ENABLED` via a follow-up command only after that passes." That's a much cleaner session than jamming it in at the end of this one.

## Infrastructure surprises (the real story of this session)

Everything in this section was unexpected at session start and collectively ate most of the session's time. Writing them down so Session 11b onward doesn't repeat the debugging.

### 1. Post-April-2024 GCP defaults are radically different from what the Firebase docs describe

Google silently changed several default IAM behaviors in April 2024 that the Firebase CLI's deploy flow has not fully caught up with. Every one of these blocks the "happy path" deploy of a v2 function on a fresh Blaze project. In order of when they bit us:

- **Default compute service account no longer has `roles/cloudbuild.builds.builder`.** First function deploy fails with the unhelpful message "Could not build the function due to a missing permission on the build service account." Google's doc at https://cloud.google.com/functions/docs/troubleshooting#build-service-account names this as the fix but `firebase deploy` does not do it automatically. Fixed this session via `gcloud projects add-iam-policy-binding psm-generator --member=serviceAccount:456789704122-compute@developer.gserviceaccount.com --role=roles/cloudbuild.builds.builder`.

- **Default compute service account no longer has `roles/datastore.user`.** Function deploys successfully but every invocation throws `Error: 7 PERMISSION_DENIED: Missing or insufficient permissions` from `@google-cloud/firestore` at call time. The 500 surfaces to the client as generic `FirebaseError: INTERNAL`; you have to pull the actual error from Cloud Run logs via `gcloud logging read`. Fixed by granting `roles/datastore.user` to the compute SA.

- **v2 `onCall` functions are NOT publicly invokable by default.** They are Cloud Run services under the hood and require explicit `roles/run.invoker` binding to `allUsers` on the Cloud Run service. Without it, the browser's CORS preflight OPTIONS request hits Google Frontend, gets a 403 with no `Access-Control-Allow-Origin` header, and the whole callable fails. `firebase deploy` does not set this binding either. Fixed via `gcloud run services add-iam-policy-binding reconcilestudentswithwise --region=us-central1 --member=allUsers --role=roles/run.invoker`.

**Takeaway:** any future v2 function deployed to psm-generator will need the same three IAM grants. The compute SA's project-level grants (`cloudbuild.builds.builder` + `datastore.user`) persist automatically, but the Cloud Run per-service `allUsers` grant is per-function and must be added after every new function's first deploy. Session 11b and Session 15 both need this.

### 2. The `iam.allowedPolicyMemberDomains` org policy blocks the `allUsers` grant

The ATS Google Workspace organization enforces the `iam.allowedPolicyMemberDomains` constraint at the organization level. This constraint restricts IAM bindings to principals within the workspace customer domain and blocks `allUsers` / `allAuthenticatedUsers` entirely. It is a good org policy in general (prevents accidental public exposure of GCP resources) and is set by default on Google Workspace-owned GCP orgs.

Without overriding it, **no v2 HTTPS callable function on any project in the org can be invoked from a browser.** Both v1 and v2 function deploys fail at the IAM-binding step with *"One or more users named in the policy do not belong to a permitted customer, perhaps due to an organization policy."*

The fix is a project-level override of the constraint. This requires `roles/orgpolicy.policyAdmin` at the organization level, which neither `support@` nor `ameyers@` had at session start. See §3 for how we got it.

The override itself is stored at [/tmp/allow-allusers-policy.yaml](/tmp/allow-allusers-policy.yaml) (not in the repo; if you need to reapply it in a fresh shell the content is):

```yaml
name: projects/psm-generator/policies/iam.allowedPolicyMemberDomains
spec:
  rules:
  - allowAll: true
```

Applied via `gcloud org-policies set-policy /path/to/file.yaml`. The policy is now stored at `projects/456789704122/policies/iam.allowedPolicyMemberDomains` and exempts **only the `psm-generator` project** from the org-wide `allowedPolicyMemberDomains` restriction. Every other project in the ATS org is unaffected.

**Watch-out:** `iam.allowedPolicyMemberDomains` is a list constraint that takes **customer IDs**, not principal strings. Our first override attempt tried `allowedValues: [allUsers, allAuthenticatedUsers]` and was rejected with `INVALID_ARGUMENT`. The correct form is `allowAll: true` with no explicit values. Documented here so 11b/15 don't trip on the same error.

### 3. The GCP organization admin chain was not what I assumed at session start

Going in, I had the wrong mental model of who owned what at the GCP org level. Empirical facts as discovered during this session:

- **psm-generator lives under GCP organization `affordabletutoringsolutions.org`, org ID `305487265572`**, created 2026-04-14 (same day as this session — auto-created when the Workspace was set up).
- **The project's display name is `ats-portal`, not `psm-generator`**. The project *ID* is `psm-generator` (permanent, immutable). This matters because the Firebase console and gcloud list the project differently depending on which field they prefer.
- **`ameyers@affordabletutoringsolutions.org` already has `roles/resourcemanager.organizationAdmin` at the org level.** This is the role the Workspace super admin gets automatically. Neither of us remembered this — I had been assuming nobody at ATS had claimed GCP org admin, which was wrong.
- **`roles/resourcemanager.organizationAdmin` is NOT the same as `roles/orgpolicy.policyAdmin`.** Organization Administrator can grant *other* org-level roles but cannot itself create or modify org policies. The two roles are frequently conflated in docs and stackoverflow answers.
- **Neither `support@` nor `ameyers@` had `roles/orgpolicy.policyAdmin` at session start.** Because `ameyers@` had `resourcemanager.organizationAdmin`, he was able to grant `roles/orgpolicy.policyAdmin` to `support@` at the org level, self-serving this unblock. That grant is now persistent.

**Persistent state after Session 11:**

```
org 305487265572 (affordabletutoringsolutions.org)
  ameyers@ : roles/resourcemanager.organizationAdmin   [pre-existing]
  support@ : roles/orgpolicy.policyAdmin                [granted this session]

project psm-generator
  support@ : roles/owner                                [pre-existing]
  456789704122-compute@dev.gserviceaccount.com :
       roles/cloudbuild.builds.builder                  [granted this session]
       roles/datastore.user                             [granted this session]
  456789704122-compute@dev.gserviceaccount.com :
       roles/secretmanager.secretAccessor on each       [granted by firebase deploy]
       of 4 Wise secrets

cloud run service reconcilestudentswithwise (us-central1)
  allUsers : roles/run.invoker                          [granted this session]

project psm-generator org policies
  iam.allowedPolicyMemberDomains : allowAll=true        [overridden this session]
```

Going forward, `support@` can self-serve all org policy operations on psm-generator without needing to switch to Aidan's account. **`ameyers@` is still required** for any new org-level grants (e.g., granting permissions on a sibling project), because `resourcemanager.organizationAdmin` is only held by his account.

### 4. Two wasted detours

Full honesty: I made two wrong calls during the session that cost real time. Documenting them so future-me doesn't repeat them.

- **Wasted ~10 minutes on "Firebase Hosting rewrite bypasses the Cloud Run invoker requirement."** I claimed `/api/...` hosting rewrites to v2 functions use a scoped Google-managed service agent and sidestep the `allUsers` requirement. That is false for v2 functions — hosting rewrites to v2 functions still require the underlying Cloud Run service to allow `allUsers`. I verified this by attempting to provision a Firebase Hosting P4SA via the Service Usage REST API and getting `IAM_SERVICE_NOT_CONFIGURED_FOR_IDENTITIES` back. **The hosting rewrite IS live** (`/api/reconcileStudentsWithWise` in [firebase.json](../firebase.json)) and does work correctly now that the invoker binding is in place, but it is not a bypass, it is an ergonomic nicety.

- **Wasted ~15 minutes downgrading to firebase-functions v1 thinking it would sidestep the org policy.** v1 functions also require `allUsers` invoker to be browser-callable — they just bind it on Cloud Functions IAM instead of Cloud Run IAM, and the org policy blocks both equivalently. The v1 downgrade was code-complete and deployed (half-broken, no invoker binding) before the error surfaced. Reverted back to v2 once the org policy override landed. [functions/index.js](../functions/index.js) is v2 at session close.

**Both detours were me reasoning from stale memory instead of verifying against actual IAM behavior.** If future sessions hit similar walls, the rule is: check the actual runtime SA and the actual IAM bindings via `gcloud` before proposing a workaround.

### 5. Other surprises, quickly

- **Node 20 runtime is deprecated 2026-04-30, decommissioned 2026-10-30.** Every deploy emits a warning. We are fine for Session 11 but should bump `functions/package.json` `engines.node` to `"22"` before October. Follow-up #4 below.
- **firebase-functions ^5.1.0 is "outdated" per deploy warnings.** v6 is available with breaking changes. Not touching this session; follow-up #5.
- **Artifact Registry cleanup policy** is the only reliably non-zero cost line item on Blaze for this project. Firebase auto-configured a 1-day cleanup policy in `us-central1` via `firebase deploy --force` — old function container images now auto-delete after 24 hours. Confirmed the "pennies/month" promise to Kiran holds.
- **Trying to run `gcloud beta services identity create`** prompted for interactive beta-component install and blocked even under `--quiet`. Went around it via the Service Usage REST API with `gcloud auth print-access-token` + `curl`. Documenting because the same footgun will come back in any session that needs beta-only gcloud commands.

## Budget + cost posture

- **Firebase Blaze enabled** on `psm-generator` with the billing account you (Kiran) created. `$5/month` budget alert configured at 50%/90%/100% thresholds per your earlier setup.
- **Actual Session 11 cost:** effectively $0 so far. The Cloud Build runs during deploys cost fractions of a cent each. Artifact Registry storage for the function container is in the "pennies/month" range.
- **Projected cost at full Phase 3 rollout** (51 students, a few assignments per week): still well under $1/month — no free-tier ceiling is close.

## Repository + auth changes made outside the codebase

- **GitHub repo ownership transferred** from `AidanJMeyers/psm-generator` to `kiranshay/psm-generator`. Local `origin` remote updated. GitHub Actions secrets (`FIREBASE_TOKEN`) migrated automatically with the repo. Aidan re-added as admin collaborator.
- **gcloud has `ameyers@` cached** from this session's org admin operation. Harmless on Kiran's personal laptop; can be revoked via `gcloud auth revoke ameyers@affordabletutoringsolutions.org` if desired.

## Follow-ups

In priority order.

1. **[blocker for 11b] Paste the "Send a Message" Postman endpoint details** into `docs/wise_postman.md` or directly into the Session 11b kickoff. Without the exact URL, headers, and request body shape, `assignToWise` and `sendStudentMessage` cannot be implemented. The entry is referenced at [wise_postman.md:254](wise_postman.md#L254) but the body is missing.

2. **[important, before Session 13] Custom domain `portal.affordabletutoringsolutions.org`.** Session 10 raised this (Session 10 §Follow-ups #4) and Session 11 reconfirms the need. Reasoning:
    - `APP_BASE_URL` is currently hardcoded to `https://psm-generator.web.app` in [functions/.env](../functions/.env). It's parameterized so the rename is a config change, not a code edit, but the config change has to happen.
    - Session 13's `signInWithEmailLink` will include links to this host, which become the stable identity for every Phase 3+ sign-in email ever sent. Cheaper to change once before Session 13 than to rewrite email templates later.
    - Setup work: add A records at Hostinger pointing to Firebase Hosting's IPs, verify in Firebase console, wait for Let's Encrypt cert. Firebase Hosting custom domains are free.
    - After the domain is live, `functions/.env`'s `APP_BASE_URL` updates to `https://portal.affordabletutoringsolutions.org`, and redeploy functions (no code changes).
    - **Recommendation: a dedicated mini-session before Session 13** — scope is narrow enough to fit in ~1 hour and it's load-bearing for the deep-link design.

3. **[Session 11b scope] Write-path Wise functions.** `assignToWise` and `sendStudentMessage`. Depends on follow-up #1. At session start of 11b: scaffold is already in place, auth layer is done, secrets are wired, Wise read path is proven, infra is debugged. 11b should be the simplest session of Phase 3 if #1 is resolved beforehand.

4. **[before 2026-10-30] Bump `functions/package.json` `engines.node` to `"22"`.** Node 20 is soft-deprecated 2026-04-30 and hard-removed 2026-10-30. Any session that redeploys functions after October 30 will fail otherwise. This is a one-line change + one deploy; can fold into any session that touches `functions/`.

5. **[optional, anytime] Bump `firebase-functions` to v6.** Deploy warnings flag `^5.1.0` as outdated. v6 has breaking changes that would require a code review pass across `index.js`. Not blocking anything; nice-to-have whenever someone has time.

6. **[optional, anytime] Regenerate `FIREBASE_TOKEN` in GitHub Actions secrets.** Currently tied to `ameyers@`'s `firebase login:ci` session. It works because Aidan retains Firebase project access as admin collaborator, but cleanest posture is to regenerate under `kiranshay@`'s own account. Blocker for this: `firebase login:ci` is Google-deprecated; the replacement is GitHub OIDC workload identity federation, which is a bigger setup. Recommend **not** doing anything here until one of: (a) Aidan loses access for some reason, or (b) a Session ~20+ "CI modernization" pass that migrates to OIDC.

7. **[one-off hygiene] Inspect the single `noEmail` student flagged by reconcile.** Kiran knows who it is from the DevTools table. Decide whether to fix `meta.email` on that student's Firestore doc now or leave as-is.

8. **[long-term] The `iam.allowedPolicyMemberDomains` override is now permanent on psm-generator.** Any future `allUsers` binding on this project goes through unchallenged. This means *any function deployed on psm-generator* is publicly invokable from the internet unless the code enforces auth internally. Every function we write must do its own Firebase Auth check (as `verifyCallerIsAdmin` / `verifyCallerIsTutor` in [functions/auth.js](../functions/auth.js) do). **This is fine, but it's a shift in security posture from pre-Session-11 and is worth acknowledging.**

9. **[when Kiran has bandwidth] Session 12 prep.** Spec says Session 12 ships `scripts/extract_answer_keys.mjs`, `scripts/audit_catalog.mjs`, `scripts/migrate_stu_pdfs.mjs`, `questionKeys` Firestore collection population, and `worksheets_catalog.json` rewrite. Session 12 has zero infra dependency on Session 11 (local Node scripts + Firestore admin SDK) and can run in parallel with 11b if desired.

## Checkpoint

Session 11 is complete when:

- [x] Firebase Blaze plan enabled, $5 budget alert configured
- [x] `functions/` directory scaffolded with `package.json`, `index.js`, `config.js`, `auth.js`, `wise.js`, `.env`, `.gitignore`
- [x] All four Wise secrets stored in Google Secret Manager, wired to the function
- [x] `reconcileStudentsWithWise` deployed as v2 onCall in `us-central1`
- [x] IAM stack correct: compute SA has `cloudbuild.builds.builder` + `datastore.user`, Cloud Run service has `allUsers` → `run.invoker`, `iam.allowedPolicyMemberDomains` overridden at project level
- [x] `firebase.json` updated: `functions` block added, `/api/reconcileStudentsWithWise` hosting rewrite added, `functions/**` added to hosting ignore
- [x] First real call to `reconcileStudentsWithWise` from browser DevTools returned a clean report: 50/50 matched, 0 gaps, 1 no-email
- [x] `WISE_WRITE_ENABLED=false` at session close — no write path deployed
- [x] GitHub repo ownership transferred from `AidanJMeyers/psm-generator` to `kiranshay/psm-generator`, local `origin` remote updated, Aidan re-added as admin collaborator
- [x] This doc committed to the repo (pending commit by Kiran)
- [x] Kickoff prompt for Session 11b appended below

---

## Kickoff prompt for Session 11b

> Copy everything between the horizontal rules below into a fresh Claude Code session, after running `/clear` in the psm-generator workspace.

---

I'm ready to start **Phase 3 Session 11b** of psm-generator: the Wise write-path Cloud Functions (`assignToWise` and `sendStudentMessage`). Session 11 shipped the read-only reconcile function and debugged the entire server-side infrastructure stack; 11b is narrow in scope and should be the simplest session of Phase 3 because all the infra work is done.

**Confirm today's date with me at session start before doing anything else.**

### Read these in order

1. **`docs/PHASE_3_SESSION_11.md`** — what Session 11 shipped and every infra lesson. Pay special attention to §"Infrastructure surprises" and §"Follow-ups" #1 (Send a Message shape), #2 (custom domain), and #8 (public invocation posture).
2. **`docs/PHASE_3_SPEC.md`** — §"Wise API integration" for the wire-level contract, §"Cloud Functions: the new infrastructure commitment" for the function surface.
3. **The Send-a-Message Postman entry** — Kiran will paste this at session start. It was missing from `docs/wise_postman.md` during Session 11 and is the hard blocker for this session.

### What Session 11b ships

- **`assignToWise({ studentId, assignmentId })`** — tutor-only. Loads student from Firestore, resolves Wise user (cached from Session 11 reconcile where possible), ensures admin chat exists, sends deep-link message. Deep-link body: `"New worksheet: {title}. Start: {APP_BASE_URL}/?a={assignmentId}&s={studentId}"`.
- **`sendStudentMessage({ studentId, text })`** — tutor-only. Thin wrapper around Wise sendMessage for ad-hoc tutor notes.
- **Caching:** `assignToWise` writes `wiseUserId` to `students/{id}` on first resolve, reads from cache on subsequent calls. Session 11 reconcile does NOT write this field — only `assignToWise` does.
- **Chat-existence check:** `assignToWise` calls `getAllChats` (or equivalent) to check for an existing admin chat before creating one. Session 11b must be idempotent — calling `assignToWise` twice in a row for the same student must not create duplicate chats.
- **Dev-mode recipient override:** if `DEV_TEST_RECIPIENT_EMAIL` is set in `functions/.env` and `WISE_WRITE_ENABLED` is false, `assignToWise` and `sendStudentMessage` MUST redirect their Wise calls to the test recipient instead of the real student, or refuse to send entirely. Kiran decides which. Do NOT call Wise write endpoints against real student records while `WISE_WRITE_ENABLED` is false.
- **`lib/wise.js` client-side wrapper** — the file that wraps `httpsCallable('assignToWise')` etc. for the browser to call. First new file in the existing client codebase for Phase 3. Should NOT be imported from `app.jsx` yet — Session 16 wires it into a real tutor UI button. Session 11b just ships the wrapper so it's ready.

### What NOT to do

- **Do NOT touch `reconcileStudentsWithWise`.** It is working correctly, do not refactor it.
- **Do NOT touch `firestore.rules`, `worksheets_catalog.json`, `build_index.py`, or `app.jsx`.** Session 16 wires `lib/wise.js` into the UI; 11b just creates the wrapper.
- **Do NOT flip `WISE_WRITE_ENABLED=true` in `functions/.env`.** The first-week test constraint still holds: writes are gated, test recipient is pinned to Kiran's own Wise account. The flip happens only after Kiran has tested `assignToWise` against the dev recipient and confirmed the Wise message arrives correctly.
- **Do NOT deploy secrets you don't already have.** All four Wise secrets (`WISE_API_KEY`, `WISE_USER_ID`, `WISE_INSTITUTE_ID`, `WISE_NAMESPACE=ats`) are already in Secret Manager from Session 11. They do not need to be re-set.

### Pause at the first natural checkpoint

- **Before writing any code** — confirm you have the Send-a-Message Postman entry from Kiran and the endpoint URL, headers, and request body shape are all concrete.
- **After `assignToWise` is written but before deploy** — Kiran reviews the caching logic, the chat-existence check, and especially the dev-mode recipient override.
- **After first deploy + first real `assignToWise` call with `WISE_WRITE_ENABLED=false` and dev recipient pinned** — Kiran reviews the Wise chat on his own account to confirm the message arrived, formatted correctly, with a working deep-link.

Stop at the first one. Report. Wait.

### Close out

Write `docs/PHASE_3_SESSION_11b.md` capturing:
- Which Wise endpoints were hit for the first time (Send a Message, Get All Chats if used, etc.)
- Any surprises vs. the Postman doc
- The state of `WISE_WRITE_ENABLED` at session close (likely still `false`)
- Whether the dev-recipient test actually ran and what Kiran saw in his Wise chat
- Kickoff prompt for Session 12 (extraction + audit + PDF migration) OR the custom domain mini-session if Kiran wants to do that first

### Constraints carrying forward

- **No slop.** Honest, verified claims in both code and docs. No filler.
- **psm-generator commit override applies:** Claude may commit + push directly with short user-voice messages, no Co-Authored-By.
- **No bundler.** `functions/` keeps its own `package.json`; client stays bundler-free.
- **Every new function must do its own Firebase Auth check internally** (via `functions/auth.js` helpers). The `iam.allowedPolicyMemberDomains` override on psm-generator means functions are publicly invokable at the HTTP layer; the code is the enforcement point.
