# Phase 3 — Session 10: Custom SMTP for Firebase Auth

**Date:** 2026-04-14
**Session type:** Infra configuration only. **Zero code changes.**
**Parent docs:** [PHASE_3_SPEC.md](PHASE_3_SPEC.md) · [PHASE_3_SESSION_8.md](PHASE_3_SESSION_8.md) §"Residual risk" / §A "Custom SMTP for Firebase Auth emails is a Phase 3 prerequisite"
**Outcome:** Firebase Auth emails now send through Postmark with DKIM-signed `affordabletutoringsolutions.org` sender identity. SPF, DKIM, DMARC all verified passing against Gmail/Google Workspace inbound. Hard-blocker for Session 13 (`signInWithEmailLink`) cleared.

---

## Vendor chosen: Postmark

Not SendGrid (which was the Session 9 spec's default). The call was made on one criterion: deliverability. Session 8 was literally an email-to-Gmail spam-classification incident, and Postmark's entire product differentiator is transactional-only IPs with aggressive marketing-sender refusal — which is the right posture when the thing you're building is a sign-in email flow. SendGrid's shared marketing/transactional infra has exactly the reputation shape that bit us in Session 8.

SES was eliminated on setup pain (sandbox mode, 24–48h production-access review, IAM flow) for what is a 100-email-per-month use case. Mailgun eliminated on price (no free tier since 2023).

Volume at Session 17 rollout will be ~51 students × ~2 sign-ins/month ≈ 100 emails/month, comfortably inside Postmark's free-forever 100/month tier. Swap cost to SendGrid or elsewhere later is ~30 minutes of DNS + Firebase Console reconfiguration if Postmark ever underperforms.

Account created under `support@affordabletutoringsolutions.org`, username `kiranshay`. Still in Postmark test mode at session close — restricts outbound recipients to verified domains, which is fine for Session 13+ (ATS addresses only) but needs to be cleared via Postmark's "Request approval" flow before Session 17 family rollout.

## Postmark configuration

- **Server:** "My First Server" (Postmark's auto-created default), server ID `18892309`. Not renamed — low-value cosmetic.
- **Message stream used:** `Default Transactional Stream` (Postmark's auto-created default, routes headerless SMTP). A stream named `psm-generator-production` was created earlier in the session based on an initial misread of Postmark's server/stream hierarchy; it is unused and sits dormant. Can be archived whenever; not hurting anything.
- **Sender Signature:** `support@affordabletutoringsolutions.org` (domain-level verification via DKIM/Return-Path — see DNS records below). Per-address confirmation email sent to `support@` and clicked.
- **Server API Token:** pasted into Firebase Auth SMTP settings. Same token serves as SMTP username and password (Postmark quirk — confirmed correct in Postmark's SMTP setup instructions).

## DNS records added to affordabletutoringsolutions.org

Domain registrar is **Hostinger** (not Google Domains — that was a misconception at session start; the domain was registered 2024-05-09, after Google Domains shut down, and Hostinger's default nameservers `ns1/ns2.dns-parking.com` had been misread by Claude as a Namecheap signature early in the session). Hostinger account is under Ryan Canavan (friend of ATS); domain registrant is Aidan Meyers. DNS edits were made by Kiran through Ryan's Hostinger account.

Two records added. Both additive. **No existing records were modified.**

### Record 1 — DKIM (TXT)

| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `20260414153015pm._domainkey` |
| Value | `k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0SwPH+auNXUlYXugCCWM8J0bGgUnkpnWIGy1VLpGPAjLJVTwXswxYagO6tcMTZy0KyptA3/ImeIYETDSJ8Hn8VrewgAuWASVYxz/v2tXuBcOWwJDOhMbhRsTwsv9FNJFTI3wAgbRLR5SRePufxKF7lqjLTkx5NXFu3m/eJDUYqwIDAQAB` |
| TTL | `14400` |

Verified live in public DNS at session close (`dig TXT 20260414153015pm._domainkey.affordabletutoringsolutions.org`). Coexists cleanly with the pre-existing `google._domainkey` TXT record (Google Workspace DKIM); multiple DKIM selectors on one domain is standard and each signer uses its own.

### Record 2 — Return-Path (CNAME)

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `pm-bounces` |
| Target | `pm.mtasv.net` |
| TTL | `3600` |

Verified live (`dig CNAME pm-bounces.affordabletutoringsolutions.org` → `pm.mtasv.net.` → resolves to Postmark IPs).

### Records NOT added — and why

- **No SPF merge.** Postmark no longer requires an SPF include on the sender domain; its Return-Path CNAME model (envelope sender `pm-bounces.affordabletutoringsolutions.org` inherits Postmark's managed SPF via the CNAME chain, and DMARC aligns via DKIM on the From: domain). The existing `v=spf1 include:_spf.google.com ~all` at the apex was left untouched. **This eliminated the single biggest risk of the session** — mis-merging SPF would have broken Google Workspace inbound mail for `support@`.
- **No DMARC change.** Existing record `v=DMARC1; p=none; rua=mailto:dmarc@affordabletutoringsolutions.org` left as-is. `p=none` is the most permissive mode and imposes zero rollout risk. DMARC passes via DKIM alignment (Postmark's DKIM signs with `d=affordabletutoringsolutions.org`, exact match to the `From:` domain).
- **No Firebase "Custom domain for email templates" records.** Mid-session, Firebase Auth's Templates UI redirected into its own custom-domain verification flow (which would have added `v=spf1 include:_spf.firebasemail.com ~all`, a `firebase=psm-generator` verification TXT, and two CNAMEs to `firebasemail.com` DKIM keys). These records would have routed outbound mail through Firebase's built-in mailer instead of Postmark — directly conflicting with the whole point of this session — and would have forced the SPF merge we specifically avoided. The flow was **canceled**, no records added. See §Surprises below for the gotcha that led us there.

## Firebase Auth configuration

### SMTP settings

Firebase Console → Authentication → Templates → SMTP settings:

| Field | Value |
|---|---|
| SMTP server | `smtp.postmarkapp.com` |
| Port | `587` |
| Username | Postmark Server API Token |
| Password | Postmark Server API Token (same value) |
| Sender email | `support@affordabletutoringsolutions.org` |
| Sender name | `ATS Portal` (cosmetic; see gotcha below — Firebase ignores this field when custom SMTP is active) |
| Security mode | `STARTTLS` |

Saved without error.

### Public-facing name

Firebase Console → Project settings → General → Public-facing name changed from `PSM Generator` (or similar default) to **`ATS Portal`**.

This is the setting Firebase Auth actually reads when custom SMTP is configured, per the behavior documented in Firebase GitHub issue #431 — the Templates → SMTP settings → Sender name field is silently ignored in custom-SMTP mode, and the Public-facing name is substituted instead. Empirically verified: before the rename, test emails showed `From: PSM Generator <support@affordabletutoringsolutions.org>`; after the rename, `From: ATS Portal <support@affordabletutoringsolutions.org>`.

### Per-template sender fields — left at Firebase defaults

No per-template From customization was done. The Templates UI shows each template with its own `Sender name` / `From` / `Reply-to` fields that default to `noreply@psm-generator.firebaseapp.com`, but those fields are **bypassed when custom SMTP is active** — the SMTP settings' Sender email wins. Verified empirically: the From on received test mail was `support@affordabletutoringsolutions.org` despite the Password reset template's per-template From still showing the `firebaseapp.com` default. This was the session's key unknown going in (Hypothesis A in the session's mid-decision), and it was confirmed by actual observation.

### Email link sign-in template — deferred to Session 13

The "Email link sign-in" template does not appear in Firebase's Templates list until Email link sign-in is enabled as an auth method under **Sign-in method**. Enabling that method is Session 13's job, not Session 10's, so no template customization happened this session. Session 13 will both enable the method and write the template copy.

## Test results

All three validation checks passed.

**Test methodology:** triggered a real password reset against Kiran's own ATS admin account via Authentication → Users → three-dot menu → Reset password. Password reset uses the same SMTP transport as email-link sign-in, so validating the former validates the latter's transport layer.

**Why not a test send to a personal Gmail account:** Postmark test mode restricts outbound recipients to verified domains. Sending to an ATS inbox is a strictly better test anyway — it routes through Google Workspace's inbound authenticators (which check SPF/DKIM/DMARC against the records we just added) and uses Gmail's real spam classifier as a pass/fail signal. We are effectively dogfooding Gmail's own anti-spam as our test harness.

| Check | Result |
|---|---|
| Delivered to Inbox (not Spam) | ✓ |
| SPF: PASS (from "Show original") | ✓ |
| DKIM: PASS, signed by `affordabletutoringsolutions.org` | ✓ |
| DMARC: PASS | ✓ |
| Password reset link opens Firebase reset page | ✓ |
| `From:` header displays `ATS Portal <support@affordabletutoringsolutions.org>` after Public-facing name rename | ✓ |

Postmark Activity tab shows the test send as Delivered; no rejections, no 422s.

## Rollback plan

If the Postmark + Firebase config breaks Firebase Auth outbound email in some unexpected way after Session 10 closes:

1. **Fastest revert (≈30 seconds):** Firebase Console → Authentication → Templates → SMTP settings → toggle "Customize SMTP" **off**. This instantly reverts Firebase Auth to its built-in default sender (`noreply@psm-generator.firebaseapp.com` via Google's infrastructure), matching the pre-Session-10 state. Deliverability degrades back to Session 8's flaky baseline but nothing breaks.
2. **DNS records can stay deployed indefinitely.** Postmark DKIM and Return-Path CNAME cost nothing to leave in the zone and cannot break Google Workspace mail. They only take effect when Firebase is configured to relay through Postmark — when Firebase's custom SMTP is toggled off, the records are inert.
3. **Postmark account can stay.** Free tier, no billing, no reason to delete.

Total rollback time: one toggle click in the Firebase Console. No DNS revert needed. No Postmark account deletion needed.

**What rollback does NOT recover from:** an accidental edit to the existing SPF or DMARC records. Neither was touched in this session, precisely so that no such recovery would ever be needed. If someone touches those in a future session, they own the rollback.

## Surprises and gotchas (for future sessions' benefit)

### 1. Firebase Auth Templates UI steers you into a trap if you try to customize per-template From

Attempting to change the `From:` address on any individual template (e.g., Password reset) to a non-`firebaseapp.com` domain triggers Firebase's **"Custom domain for email templates"** verification flow, which wants you to add SPF/DKIM records pointing at `firebasemail.com` — Firebase's own built-in mailer infrastructure. **This is a completely separate feature from Custom SMTP** and the two are mutually exclusive in terms of what actually routes outbound mail. If you're on Custom SMTP (as we are), adding those records is wasted work and dangerous (would require merging SPF with Google Workspace's existing record).

**The correct posture when using Custom SMTP:**
- Leave the per-template `Sender name` / `From` / `Reply-to` fields **alone**. They are not read in custom-SMTP mode.
- Set the sender identity in one place only: the **SMTP settings** modal's `Sender email` field.
- Set the display name by changing the project's **Public-facing name** in Project Settings → General. Not in the SMTP settings' Sender name field, which is silently ignored (Firebase GitHub issue #431).
- Ignore anything the Templates UI says about custom domains. It is UX for the other mode.

This is not documented anywhere in Firebase's own docs as far as a research subagent could find. The behavior was determined empirically during this session.

### 2. Postmark's SMTP setup instructions mention a `X-PM-Message-Stream` header that Firebase Auth cannot set

When you create a custom message stream in Postmark, its setup instructions say to route mail into that stream via a custom SMTP header. **Firebase Auth's SMTP config form does not expose custom headers.** Mail sent without the header routes to the server's default transactional stream (`Default Transactional Stream`), which is also transactional and works fine. The custom stream `psm-generator-production` created earlier in the session is unused as a result.

**Takeaway:** when setting up Postmark for use with a third-party SMTP relayer (Firebase Auth, and possibly others), stick with the server's default transactional stream. Don't create a custom stream unless you control the outbound headers.

### 3. `dns-parking.com` is Hostinger, not Namecheap

I misfiled the nameserver set at session start, which led to 10 minutes of wasted debugging looking for a Namecheap account that didn't exist. For future reference: `ns1/ns2.dns-parking.com` = Hostinger's default DNS. Always `whois` the domain before guessing registrar.

## Follow-ups

1. **Request Postmark "out of test mode" approval.** Postmark dashboard → "Request approval" button (top right of the server view). Postmark reviews manually, usually within a day, and looks for evidence of: verified domain (done), a successful test send through their infrastructure (done), non-abusive use case. Safe to request now. Must be cleared before Session 17 family rollout so outbound mail can reach non-ATS recipients (parents' personal Gmails, etc.).
2. **Archive the unused `psm-generator-production` message stream.** Cosmetic cleanup. Postmark dashboard → Servers → My First Server → Message Streams → `psm-generator-production` → Archive. Can be done anytime.
3. **Rename the Postmark server** from "My First Server" to `psm-generator`. Also cosmetic.
4. **Hosting URL rename — new follow-up raised this session.** Kiran asked about renaming the public hosting URL from `psm-generator.web.app` to something ATS-branded. The Firebase **project ID** is immutable — cannot be renamed. What *can* be done is adding a custom domain like `portal.affordabletutoringsolutions.org` to Firebase Hosting (DNS records at Hostinger, Let's Encrypt cert auto-provisioned). **Recommendation: do this as a dedicated ~1-hour session before Session 13**, because Session 13's `signInWithEmailLink` redirect target has to be an authorized domain in Firebase Auth, and whatever host is chosen becomes the stable identity for every future sign-in link. Cheaper to get it right before Session 13 wires it in than to change it after. Adding `ats-portal.web.app` as a second Firebase Hosting site is the lesser option and not recommended — it would still expose `.web.app` in URLs seen by students and parents. Full custom domain is the right move.
5. **Customize the Email link sign-in template copy.** Deferred to Session 13, when email-link sign-in is actually enabled as an auth method and the template becomes visible in the Templates list.

## Checkpoint

Session 10 is complete when:
- [x] Postmark account created and domain-verified via DKIM + Return-Path
- [x] DNS records added to Hostinger and verified live via `dig`
- [x] Firebase Auth SMTP settings configured and saved without error
- [x] Firebase project Public-facing name set to `ATS Portal`
- [x] Real test send (password reset) confirmed Inbox delivery, SPF/DKIM/DMARC all PASS, reset link functional
- [x] Rollback plan documented
- [x] This doc committed to the repo
- [x] Kickoff prompt for Session 11 appended below

---

## Kickoff prompt for Session 11

> Copy everything between the horizontal rules below into a fresh Claude Code session, after running `/clear` in the psm-generator workspace.

---

I'm ready to start **Phase 3 Session 11** of psm-generator: the Cloud Functions proxy and client-side `lib/wise.js` wrapper. This is the **highest-risk session in Phase 3** — it introduces server-side code to the project for the first time, commits the project to Firebase Blaze (billed) plan, and exposes a real attack surface against a real third-party API (Wise) with real credentials. Scope discipline matters more this session than any prior one.

**Confirm today's date with me at session start before doing anything else.**

### Read these in order

1. **`docs/PHASE_3_SPEC.md`** — the authoritative Phase 3 spec. Focus on §"Cloud Functions: the new infrastructure commitment", §"Wise API integration", and §"Session plan" (the Session 11 row specifically). Everything else is context.
2. **`docs/PHASE_3_SESSION_10.md`** — what shipped in Session 10 (SMTP), specifically the "Follow-ups" list which includes items that block or inform Session 11.
3. **The Wise Postman collection** (Kiran will paste or reference it) — the source of truth for endpoint shapes, auth headers, and rate limits.

### What Session 11 ships

Per the PHASE_3_SPEC.md session plan row:

- **Firebase Blaze plan enabled** on the `psm-generator` project. This is a one-way door — upgrading from Spark to Blaze is trivial, downgrading is not. Confirm with Kiran before clicking the button.
- **`functions/` directory scaffolded** at the repo root with its own `package.json` (Node server tooling, NOT a frontend bundler — the no-bundler constraint for the client app still stands).
- **Four HTTP-triggered Cloud Functions:**
  1. `assignToWise({ studentId, assignmentId })` — tutor-only, resolves Wise user, ensures chat, sends deep-link message
  2. `reconcileStudentsWithWise()` — admin-only, reports matched/unmatched/email-mismatched students, no auto-writes
  3. `sendStudentMessage({ studentId, text })` — tutor-only, wraps Wise sendMessage for ad-hoc notes (may be cut from Session 11 if time-constrained)
  4. `gradeSubmissionManual({ studentId, submissionId })` — tutor-only, re-runs grading (may be deferred to Session 15)
- **No Firestore trigger yet.** `gradeSubmission` is Session 15, not 11.
- **`lib/wise.js`** — client-side wrapper that calls the HTTP callables via `httpsCallable`. This is the ONLY new file in the existing client codebase for Session 11.
- **Secrets deployed** via `firebase functions:secrets:set` — `WISE_API_KEY`, `WISE_USER_ID`, `WISE_INSTITUTE_ID`, `WISE_NAMESPACE`. Never committed to the repo, never in client code, never logged.
- **First deploy is read-only.** Writes gated behind a `WISE_WRITE_ENABLED` flag that defaults to `false`. Only `reconcileStudentsWithWise()` (read-only) runs for real on first deploy; the write functions exist in code but refuse to hit Wise until the flag flips.
- **Test recipient pinned to Kiran's own Wise account** for any first-week write experiments — not real students.

### What NOT to do

- **Do NOT write the `gradeSubmission` Firestore trigger.** That's Session 15. Session 11 is HTTP callables + client wrapper only.
- **Do NOT touch `app.jsx` beyond importing `lib/wise.js`.** Session 11 ships the proxy layer; Session 16 wires a tutor UI button to `assignToWise`. They are separate.
- **Do NOT touch `firestore.rules`, `worksheets_catalog.json`, `functions/` secrets in the repo, or `build_index.py`.**
- **Do NOT upload any secrets, API keys, or credentials to the repo.** Use `firebase functions:secrets:set`.
- **Do NOT call Wise write endpoints against real student records** during development. Hardcode the test recipient to Kiran's own Wise account via a dev-mode recipient override.
- **Do NOT deploy functions with `WISE_WRITE_ENABLED=true`.** First deploy is read-only reconcile.
- **Do NOT widen `email_verified == true` in firestore.rules.** Still load-bearing.

### Constraints carrying forward

- **No slop.** Honest, verified claims in both code and docs. No filler.
- **psm-generator commit override applies:** Claude may commit + push directly with short user-voice messages, no Co-Authored-By.
- **No bundler.** `functions/` gets its own `package.json` — that's Node server tooling, not a frontend bundler. The client app stays bundler-free.
- **Custom domain URL is probably changing before Session 13.** If Session 11 deploys any Cloud Function that emits URLs (e.g., the deep-link in `assignToWise`'s message body), read `PHASE_3_SESSION_10.md` §Follow-ups #4 and either (a) parameterize the base URL via an env var so a later hosting rename is a config change not a code change, or (b) flag explicitly that the URL is pinned to `psm-generator.web.app` and will need a follow-up edit when the hosting rename happens.

### Pause at the first natural checkpoint

- **Before enabling Firebase Blaze plan** — Kiran approves the billing commitment explicitly. Not a silent click.
- **After the `functions/` scaffold + `package.json` exists but before any real Wise code is written** — Kiran reviews the directory shape and dependencies.
- **After `reconcileStudentsWithWise()` is written but before first deploy** — Kiran reviews the code, especially the auth/allowlist checks.
- **After the first read-only deploy succeeds and `reconcileStudentsWithWise()` returns a real report** — Kiran reviews the report and decides whether to proceed to the write-gated functions.

Stop at the first one. Report. Wait.

### Close out

Write `docs/PHASE_3_SESSION_11.md` capturing:
- What was deployed (which functions, read-only or write-enabled)
- The `reconcileStudentsWithWise()` report: matched, unmatched, email-mismatched counts
- Any Wise API surprises (endpoint shape differences, auth gotchas, rate-limit behavior)
- The state of `WISE_WRITE_ENABLED` at session close
- Kickoff prompt for Session 12 (extraction + audit + PDF migration)
