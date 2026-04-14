# Phase 2 Session 6 Implementation Plan — Tutor Submission Review

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give tutors a new Submissions tab inside `StudentProfile` that lists a student's submissions grouped by assignment, lets the tutor mark each submission correct/incorrect and leave a note, and surfaces a derived "missed questions" summary at the top of the same tab.

**Architecture:** Read path is a live `onSnapshot` subscription on `/students/{id}/submissions` (`useTutorSubmissions` hook) scoped to the tutor StudentProfile view. Write path reuses the existing tutor override in [firestore.rules](../firestore.rules) — a direct `.update()` on each submission doc with `{correct, reviewerNotes, reviewedAt}` fields. Pure helpers for grouping, summarizing, and payload construction get unit tests; the UI is verified manually. No schema changes, no rules changes, no production ops.

**Tech Stack:** React 18 (CDN, Babel standalone), Firebase compat SDK v9 (already in `window.firebase`), `node --test` for unit tests. Same stack Sessions 2–5 shipped on.

---

## Design decisions (locks for this session)

These are the open questions from the Session 6 kickoff. The plan commits to one answer each; implementation follows these without re-debating.

### 1. Missed-question report lives as a header card on the Submissions tab
**Not** a separate tab, **not** a filter on Score Tracking. Reasoning: the report is derived purely from review state on submissions, so it needs to live where the review happens. A separate tab makes the tutor click twice. Score Tracking is numerical/exam-oriented; mixing narrative review data there crosses concerns. A header card at the top of Submissions keeps the summary + the detail in one scroll.

### 2. `correct` is a per-submission three-state field
Values: `true` (correct), `false` (incorrect), `undefined` (unreviewed). Per-submission, not per-response — Session 5 writes one response entry (`responses[0]`) with the full free-text answer, so per-response granularity is a lie until worksheet regeneration unlocks per-question data. Using `undefined` (field absent) as the unreviewed signal keeps existing Session 5 docs valid without a migration.

### 3. Tutor note is `reviewerNotes: string` — one free-form string per submission
Parity with the free-text student answer. No structured per-response notes. Matches the field name Session 1 anticipated in the §Schema block.

### 4. Reads are live via `onSnapshot`
~51 tutor sessions × small N submissions each is fine on the Firestore listener budget. Tutors reviewing while students are actively submitting is a real flow (pilot day), and a stale one-shot read would silently miss just-arrived submissions. Mirrors the `usePortalStudent` lifecycle.

### 5. Drafts are visible but not markable
Tutor sees drafts as "In progress" rows — same grouping card, dimmed style, no correct/incorrect buttons, no notes field. Tutor can tell something is happening without accidentally grading half-typed text. Server-side nothing prevents the tutor from writing `correct` on a draft (rules allow tutor writes unconditionally), but the UI just doesn't expose the controls.

---

## File structure

Every change lives in files that already exist. No new files.

- **Modify `app.jsx`:**
  - Add `useTutorSubmissions(studentId)` hook next to `usePortalStudent` (~line 340). Live `onSnapshot` on `studentSubmissionsCollection(id)`.
  - Add pure helpers next to `pickLatestSubmission` (~line 686): `groupSubmissionsByAssignment`, `summarizeSubmissions`, `formatSubmittedAt`, `makeReviewPayload`.
  - Add `SUBMISSIONS_PANEL_*` style constants above `StudentProfile` (~line 3230) so the JSX stays readable.
  - Add a new tab `{id:"submissions", label:"Submissions"}` to the tab array in `StudentProfile` (~line 3280). Add the conditional render branch `ptab==="submissions" && <TutorSubmissionsPanel .../>` after the existing branches.
  - Add `TutorSubmissionsPanel({student})` component definition below `StudentProfile` (before `ScoreHistoryPanel` at ~line 4497). Internally renders the summary header card, the grouped list, and a `TutorSubmissionRow` sub-component for each submission with its review controls.
- **Modify `tests/portal.test.mjs`:** append tests for the four new pure helpers. Keep the "copied out of app.jsx — keep in sync manually" pattern the file already uses.
- **Do not touch:** `firestore.rules`, `SubmissionEditor`, `PortalHistoryTab`, `useSubmissionDraft`, `StudentPortal`, `RoleRouter`, any student/parent code path.

---

## Task 1: `groupSubmissionsByAssignment` pure helper + tests

**Files:**
- Modify: `app.jsx` (add helper next to `pickLatestSubmission`, ~line 701)
- Test: `tests/portal.test.mjs` (append)

The grouping helper takes a flat list of submission docs and the student's `assignments[]` array, and returns one entry per assignment that has at least one submission, in newest-assignment-first order. Submissions without a matching assignment (tutor deleted it) go in a final `{assignment: null, ...}` bucket so the tutor can still see orphans.

- [ ] **Step 1: Write the failing tests in `tests/portal.test.mjs`**

```javascript
function groupSubmissionsByAssignment(submissions, assignments){
  const byId = new Map();
  const orderIdx = new Map();
  (assignments||[]).forEach((a, i) => {
    if(a && a.id) orderIdx.set(a.id, i);
  });
  (submissions||[]).forEach(s => {
    if(!s) return;
    const key = s.assignmentId || "__orphan__";
    if(!byId.has(key)) byId.set(key, []);
    byId.get(key).push(s);
  });
  const groups = [];
  byId.forEach((subs, key) => {
    const assignment = key === "__orphan__"
      ? null
      : (assignments||[]).find(a => a && a.id === key) || null;
    groups.push({assignment, assignmentId: key, submissions: subs});
  });
  groups.sort((a, b) => {
    const ai = orderIdx.has(a.assignmentId) ? orderIdx.get(a.assignmentId) : -1;
    const bi = orderIdx.has(b.assignmentId) ? orderIdx.get(b.assignmentId) : -1;
    // Newest assignment first (higher index first). Orphans (-1) go last.
    if(ai === -1 && bi === -1) return 0;
    if(ai === -1) return 1;
    if(bi === -1) return -1;
    return bi - ai;
  });
  return groups;
}

test('groupSubmissionsByAssignment: empty input → empty array', () => {
  assert.deepEqual(groupSubmissionsByAssignment([], []), []);
  assert.deepEqual(groupSubmissionsByAssignment(null, null), []);
});

test('groupSubmissionsByAssignment: groups by assignmentId', () => {
  const asgs = [{id:"a1"},{id:"a2"}];
  const subs = [
    {id:"s1", assignmentId:"a1"},
    {id:"s2", assignmentId:"a2"},
    {id:"s3", assignmentId:"a1"},
  ];
  const g = groupSubmissionsByAssignment(subs, asgs);
  assert.equal(g.length, 2);
  const a1 = g.find(x => x.assignmentId === "a1");
  assert.equal(a1.submissions.length, 2);
  assert.equal(a1.assignment.id, "a1");
});

test('groupSubmissionsByAssignment: newest-assignment-first order', () => {
  const asgs = [{id:"a1"},{id:"a2"},{id:"a3"}];
  const subs = [
    {id:"s1", assignmentId:"a1"},
    {id:"s2", assignmentId:"a3"},
    {id:"s3", assignmentId:"a2"},
  ];
  const g = groupSubmissionsByAssignment(subs, asgs);
  assert.deepEqual(g.map(x=>x.assignmentId), ["a3","a2","a1"]);
});

test('groupSubmissionsByAssignment: orphan submissions go in a null-assignment bucket at the end', () => {
  const asgs = [{id:"a1"}];
  const subs = [
    {id:"s1", assignmentId:"a1"},
    {id:"s2", assignmentId:"gone"},
  ];
  const g = groupSubmissionsByAssignment(subs, asgs);
  assert.equal(g.length, 2);
  assert.equal(g[0].assignmentId, "a1");
  assert.equal(g[1].assignment, null);
  assert.equal(g[1].submissions[0].id, "s2");
});

test('groupSubmissionsByAssignment: submissions without assignmentId bucketed as orphans', () => {
  const g = groupSubmissionsByAssignment([{id:"s1"}], [{id:"a1"}]);
  assert.equal(g.length, 1);
  assert.equal(g[0].assignment, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/portal.test.mjs`
Expected: 5 new tests FAIL with `groupSubmissionsByAssignment is not defined`.

- [ ] **Step 3: Add the same helper to `app.jsx` right after `pickLatestSubmission` (around line 701)**

```javascript
// Group submissions under their assignment. Newest-assignment-first (matches
// the tutor's mental model in the rest of StudentProfile). Submissions whose
// assignment has been deleted fall into a trailing {assignment:null} bucket
// so the tutor can still see and delete them.
function groupSubmissionsByAssignment(submissions, assignments){
  const byId = new Map();
  const orderIdx = new Map();
  (assignments||[]).forEach((a, i) => {
    if(a && a.id) orderIdx.set(a.id, i);
  });
  (submissions||[]).forEach(s => {
    if(!s) return;
    const key = s.assignmentId || "__orphan__";
    if(!byId.has(key)) byId.set(key, []);
    byId.get(key).push(s);
  });
  const groups = [];
  byId.forEach((subs, key) => {
    const assignment = key === "__orphan__"
      ? null
      : (assignments||[]).find(a => a && a.id === key) || null;
    groups.push({assignment, assignmentId: key, submissions: subs});
  });
  groups.sort((a, b) => {
    const ai = orderIdx.has(a.assignmentId) ? orderIdx.get(a.assignmentId) : -1;
    const bi = orderIdx.has(b.assignmentId) ? orderIdx.get(b.assignmentId) : -1;
    if(ai === -1 && bi === -1) return 0;
    if(ai === -1) return 1;
    if(bi === -1) return -1;
    return bi - ai;
  });
  return groups;
}
```

- [ ] **Step 4: Run tests to verify the new ones pass**

Run: `node --test tests/portal.test.mjs`
Expected: all tests PASS (60 prior + 5 new = 65).

- [ ] **Step 5: Commit**

```bash
cd /Users/kiranshay/projects/psm-generator
git add app.jsx tests/portal.test.mjs
git commit -m "add groupSubmissionsByAssignment helper + tests"
git push
```

---

## Task 2: `summarizeSubmissions` pure helper + tests

**Files:**
- Modify: `app.jsx` (below `groupSubmissionsByAssignment`)
- Test: `tests/portal.test.mjs` (append)

Produces the counts used by the missed-question header card. Draft submissions are excluded from the reviewed/correct/incorrect counts (they can't be reviewed yet). `missed` is the list of submitted-and-marked-incorrect docs, in the order given.

- [ ] **Step 1: Write the failing tests**

```javascript
function summarizeSubmissions(submissions){
  const list = Array.isArray(submissions) ? submissions.filter(Boolean) : [];
  const drafts = list.filter(s => s.status === "draft");
  const submitted = list.filter(s => s.status === "submitted");
  const correct = submitted.filter(s => s.correct === true);
  const incorrect = submitted.filter(s => s.correct === false);
  const unreviewed = submitted.filter(s => s.correct !== true && s.correct !== false);
  return {
    total: list.length,
    submittedCount: submitted.length,
    draftCount: drafts.length,
    correctCount: correct.length,
    incorrectCount: incorrect.length,
    unreviewedCount: unreviewed.length,
    missed: incorrect,
  };
}

test('summarizeSubmissions: empty → all zeros', () => {
  const s = summarizeSubmissions([]);
  assert.equal(s.total, 0);
  assert.equal(s.submittedCount, 0);
  assert.equal(s.correctCount, 0);
  assert.equal(s.incorrectCount, 0);
  assert.equal(s.unreviewedCount, 0);
  assert.equal(s.draftCount, 0);
  assert.deepEqual(s.missed, []);
});

test('summarizeSubmissions: draft excluded from reviewed counts but counted in total', () => {
  const s = summarizeSubmissions([{status:"draft"}]);
  assert.equal(s.total, 1);
  assert.equal(s.draftCount, 1);
  assert.equal(s.submittedCount, 0);
  assert.equal(s.unreviewedCount, 0);
});

test('summarizeSubmissions: submitted without correct field is unreviewed', () => {
  const s = summarizeSubmissions([{status:"submitted"}]);
  assert.equal(s.submittedCount, 1);
  assert.equal(s.unreviewedCount, 1);
  assert.equal(s.correctCount, 0);
  assert.equal(s.incorrectCount, 0);
});

test('summarizeSubmissions: correct true/false split', () => {
  const s = summarizeSubmissions([
    {id:"a", status:"submitted", correct:true},
    {id:"b", status:"submitted", correct:false},
    {id:"c", status:"submitted", correct:false},
    {id:"d", status:"submitted"},
    {id:"e", status:"draft"},
  ]);
  assert.equal(s.total, 5);
  assert.equal(s.submittedCount, 4);
  assert.equal(s.draftCount, 1);
  assert.equal(s.correctCount, 1);
  assert.equal(s.incorrectCount, 2);
  assert.equal(s.unreviewedCount, 1);
  assert.equal(s.missed.length, 2);
  assert.deepEqual(s.missed.map(x=>x.id), ["b","c"]);
});

test('summarizeSubmissions: nullish entries filtered', () => {
  const s = summarizeSubmissions([null, undefined, {status:"submitted", correct:true}]);
  assert.equal(s.total, 1);
  assert.equal(s.correctCount, 1);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/portal.test.mjs`
Expected: 5 new tests FAIL with `summarizeSubmissions is not defined`.

- [ ] **Step 3: Add the helper to `app.jsx`**

```javascript
// Counts that drive the missed-question header card. Drafts are excluded
// from reviewed/correct/incorrect counts because they can't be graded yet
// (the student hasn't finalized them). `missed` is the subset of submitted
// docs marked incorrect, in encounter order.
function summarizeSubmissions(submissions){
  const list = Array.isArray(submissions) ? submissions.filter(Boolean) : [];
  const drafts = list.filter(s => s.status === "draft");
  const submitted = list.filter(s => s.status === "submitted");
  const correct = submitted.filter(s => s.correct === true);
  const incorrect = submitted.filter(s => s.correct === false);
  const unreviewed = submitted.filter(s => s.correct !== true && s.correct !== false);
  return {
    total: list.length,
    submittedCount: submitted.length,
    draftCount: drafts.length,
    correctCount: correct.length,
    incorrectCount: incorrect.length,
    unreviewedCount: unreviewed.length,
    missed: incorrect,
  };
}
```

- [ ] **Step 4: Run tests — all pass (70 total)**

Run: `node --test tests/portal.test.mjs`

- [ ] **Step 5: Commit**

```bash
git add app.jsx tests/portal.test.mjs
git commit -m "add summarizeSubmissions helper + tests"
git push
```

---

## Task 3: `formatSubmittedAt` display helper + tests

**Files:**
- Modify: `app.jsx` (below `summarizeSubmissions`)
- Test: `tests/portal.test.mjs` (append)

Normalizes the `submittedAt` field (which can be a Firestore `Timestamp`, an ISO string, or `null`) into a `YYYY-MM-DD` display string, or `""` if unknown. Reused by both the summary card and the row display.

- [ ] **Step 1: Write the failing tests**

```javascript
function formatSubmittedAt(value){
  if(!value) return "";
  if(typeof value === "string") return value.slice(0, 10);
  if(typeof value.toDate === "function"){
    try { return value.toDate().toISOString().slice(0, 10); }
    catch { return ""; }
  }
  if(value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
}

test('formatSubmittedAt: null/undefined → empty', () => {
  assert.equal(formatSubmittedAt(null), "");
  assert.equal(formatSubmittedAt(undefined), "");
});

test('formatSubmittedAt: ISO string truncated to date', () => {
  assert.equal(formatSubmittedAt("2026-04-14T12:34:56.000Z"), "2026-04-14");
});

test('formatSubmittedAt: Firestore Timestamp via toDate', () => {
  const ts = { toDate: () => new Date("2026-03-01T00:00:00Z") };
  assert.equal(formatSubmittedAt(ts), "2026-03-01");
});

test('formatSubmittedAt: JS Date', () => {
  assert.equal(formatSubmittedAt(new Date("2026-01-15T00:00:00Z")), "2026-01-15");
});

test('formatSubmittedAt: junk → empty', () => {
  assert.equal(formatSubmittedAt(42), "");
  assert.equal(formatSubmittedAt({}), "");
});
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Add the helper to `app.jsx` (same code block as the test)**

- [ ] **Step 4: Run — all tests pass (75 total)**

- [ ] **Step 5: Commit**

```bash
git add app.jsx tests/portal.test.mjs
git commit -m "add formatSubmittedAt display helper + tests"
git push
```

---

## Task 4: `makeReviewPayload` write-payload helper + tests

**Files:**
- Modify: `app.jsx` (below `formatSubmittedAt`)
- Test: `tests/portal.test.mjs` (append)

Builds the tutor's review write payload. Rules out the "reset to unreviewed" case explicitly: passing `correct: null` clears the field via `FieldValue.delete()` and omits `reviewedAt` (so the doc no longer looks reviewed on reload). Same `FieldValue` injection pattern as `makeDraftPayload`'s test harness.

- [ ] **Step 1: Write the failing tests**

```javascript
const DELETE_TS = Symbol("delete-sentinel");
const FIELD_VALUE_STUB_V2 = {
  serverTimestamp: () => SERVER_TS,
  delete: () => DELETE_TS,
};

function makeReviewPayload({correct, reviewerNotes, FieldValue}){
  const payload = {
    reviewerNotes: typeof reviewerNotes === "string" ? reviewerNotes : "",
  };
  if(correct === true || correct === false){
    payload.correct = correct;
    payload.reviewedAt = FieldValue.serverTimestamp();
  } else {
    payload.correct = FieldValue.delete();
    payload.reviewedAt = FieldValue.delete();
  }
  return payload;
}

test('makeReviewPayload: correct=true sets reviewedAt', () => {
  const p = makeReviewPayload({correct:true, reviewerNotes:"nice work", FieldValue:FIELD_VALUE_STUB_V2});
  assert.equal(p.correct, true);
  assert.equal(p.reviewerNotes, "nice work");
  assert.equal(p.reviewedAt, SERVER_TS);
});

test('makeReviewPayload: correct=false sets reviewedAt', () => {
  const p = makeReviewPayload({correct:false, reviewerNotes:"", FieldValue:FIELD_VALUE_STUB_V2});
  assert.equal(p.correct, false);
  assert.equal(p.reviewedAt, SERVER_TS);
});

test('makeReviewPayload: correct=null clears both correct and reviewedAt', () => {
  const p = makeReviewPayload({correct:null, reviewerNotes:"", FieldValue:FIELD_VALUE_STUB_V2});
  assert.equal(p.correct, DELETE_TS);
  assert.equal(p.reviewedAt, DELETE_TS);
});

test('makeReviewPayload: missing reviewerNotes coerced to empty string', () => {
  const p = makeReviewPayload({correct:true, FieldValue:FIELD_VALUE_STUB_V2});
  assert.equal(p.reviewerNotes, "");
});

test('makeReviewPayload: reviewerNotes preserved verbatim (including whitespace)', () => {
  const p = makeReviewPayload({correct:true, reviewerNotes:"  trailing  ", FieldValue:FIELD_VALUE_STUB_V2});
  assert.equal(p.reviewerNotes, "  trailing  ");
});
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Add the helper to `app.jsx`**

```javascript
// Tutor review write payload. Three-state: true/false set the field and stamp
// reviewedAt; null clears both via FieldValue.delete() so the doc reverts to
// "unreviewed" cleanly on reload. reviewerNotes is always written (empty
// string if none provided) to keep the field stable.
function makeReviewPayload({correct, reviewerNotes}){
  const FV = firebase.firestore.FieldValue;
  const payload = {
    reviewerNotes: typeof reviewerNotes === "string" ? reviewerNotes : "",
  };
  if(correct === true || correct === false){
    payload.correct = correct;
    payload.reviewedAt = FV.serverTimestamp();
  } else {
    payload.correct = FV.delete();
    payload.reviewedAt = FV.delete();
  }
  return payload;
}
```

Note: the `app.jsx` copy closes over `firebase.firestore.FieldValue` (same pattern as `makeDraftPayload`). The test copy takes `FieldValue` as an injected parameter so it runs under `node --test` without a live Firebase. Keep them in sync manually.

- [ ] **Step 4: Run tests — all pass (80 total)**

- [ ] **Step 5: Commit**

```bash
git add app.jsx tests/portal.test.mjs
git commit -m "add makeReviewPayload helper + tests"
git push
```

---

## Task 5: `useTutorSubmissions` live subscription hook

**Files:**
- Modify: `app.jsx` — add hook right after `useSubmissionDraft` (~line 410)

Live subscription scoped to one student's submissions collection. Returns `{status, submissions, error}` with statuses `"loading" | "ready" | "error"`. `submissions` is always an array (empty when none). Lifecycle mirrors `usePortalStudent`: re-subscribe when `studentId` changes; unsubscribe on unmount.

- [ ] **Step 1: Add the hook below `useSubmissionDraft`**

```javascript
// Tutor-side live view of one student's submissions. Unlike useSubmissionDraft,
// this is an onSnapshot subscription because the tutor may be reviewing while
// the student is actively submitting — a one-shot .get() would miss the arrival.
// Scoped to one student; the tutor view never needs a cross-student listener.
function useTutorSubmissions(studentId){
  const [state, setState] = useState({status:"loading", submissions:[], error:null});
  useEffect(()=>{
    if(!studentId){
      setState({status:"ready", submissions:[], error:null});
      return;
    }
    const col = studentSubmissionsCollection(studentId);
    if(!col){
      setState({status:"error", submissions:[], error:new Error("Firestore not initialized")});
      return;
    }
    setState({status:"loading", submissions:[], error:null});
    const unsub = col.onSnapshot(
      (snap)=>{
        const docs = snap.docs.map(d => ({id:d.id, ...d.data()}));
        setState({status:"ready", submissions:docs, error:null});
      },
      (err)=>{
        console.warn("[tutor] submissions snapshot error:", err);
        setState({status:"error", submissions:[], error:err});
      }
    );
    return ()=>unsub();
  }, [studentId]);
  return state;
}
```

- [ ] **Step 2: Run tests — still 80 passing (no new tests, but nothing should regress)**

Run: `node --test tests/portal.test.mjs`

- [ ] **Step 3: Rebuild and sanity-check**

Run: `python3 build_index.py`
Expected: index rebuilds cleanly, no JSX syntax error.

- [ ] **Step 4: Commit**

```bash
git add app.jsx
git commit -m "add useTutorSubmissions live subscription hook"
git push
```

---

## Task 6: Add the Submissions tab to `StudentProfile` (empty panel scaffold)

**Files:**
- Modify: `app.jsx` — tab array at ~line 3280, add conditional render branch, add `TutorSubmissionsPanel` stub below `StudentProfile`.

This task only wires the tab and renders an empty loading-state card. Task 7 fills in the real panel. The goal here is to ship a visible tab that a subagent can verify renders, with zero risk of breaking any existing tab.

- [ ] **Step 1: Add the tab entry**

In the `StudentProfile` tabs array at ~line 3280, add `{id:"submissions", label:"Submissions"}` after `{id:"history", label:"Assignment History"}`:

```javascript
{[
  {id:"history",label:"Assignment History"},
  {id:"submissions",label:"Submissions"},
  {id:"diagnostics",label:"Diagnostics"},
  {id:"preassign",label:"Pre-Assign"},
  {id:"scores",label:"Score History"},
].map(pt=>{
```

- [ ] **Step 2: Add the render branch**

Find the existing `{ptab==="history"&&(` block inside `StudentProfile` (~line 3292). Immediately after its closing `)}`, add:

```javascript
{/* SUBMISSIONS (Phase 2 Session 6) */}
{ptab==="submissions"&&<TutorSubmissionsPanel student={p}/>}
```

- [ ] **Step 3: Add a stub `TutorSubmissionsPanel` component**

Place it directly above `ScoreHistoryPanel` (~line 4497). Task 7 fleshes it out; for now:

```javascript
function TutorSubmissionsPanel({student}){
  const {status, submissions, error} = useTutorSubmissions(student.id);
  if(status === "loading"){
    return (
      <div style={{...CARD, padding:"60px 40px", textAlign:"center"}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontStyle:"italic",fontSize:20,color:"#66708A"}}>Loading submissions…</div>
      </div>
    );
  }
  if(status === "error"){
    return (
      <div style={{...CARD, padding:"60px 40px", textAlign:"center"}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontStyle:"italic",fontSize:20,color:"#8C2E2E"}}>Couldn't load submissions.</div>
        <div style={{fontSize:12,color:"#66708A",marginTop:8}}>{error?.message||""}</div>
      </div>
    );
  }
  if(!submissions.length){
    return (
      <div style={{...CARD, padding:"60px 40px", textAlign:"center"}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontStyle:"italic",fontSize:20,color:"#66708A",letterSpacing:-.2}}>No submissions yet.</div>
        <div style={{fontSize:12,color:"#66708A",marginTop:10,lineHeight:1.55}}>When this student answers assignments in the portal, they'll show up here.</div>
      </div>
    );
  }
  return (
    <div style={{...CARD, padding:20}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:"#66708A",letterSpacing:1,textTransform:"uppercase"}}>
        {submissions.length} submission{submissions.length===1?"":"s"} — full UI in Task 7
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rebuild**

Run: `python3 build_index.py`

- [ ] **Step 5: Manual verification (CHECKPOINT A — stop here for Kiran)**

Kiran loads the tutor app, opens a student who has Session 5 test submissions, and confirms:
- New "Submissions" tab appears between Assignment History and Diagnostics.
- Clicking it renders either the count line or the "No submissions yet" empty state.
- All four existing tabs still behave identically.
- `node --test tests/*.mjs` still green (80 tests).

**Stop here.** Report status. Do not proceed to Task 7 until Kiran confirms.

- [ ] **Step 6: Commit once Kiran approves Checkpoint A**

```bash
git add app.jsx
git commit -m "submissions tab scaffold in StudentProfile"
git push
```

---

## Task 7: Fill in `TutorSubmissionsPanel` — summary card, grouped list, review controls

**Files:**
- Modify: `app.jsx` — replace the Task 6 stub body; add `TutorSubmissionRow` sub-component.

This is the big UI task. The panel renders:
1. A **summary header card** showing reviewed/unreviewed/correct/incorrect counts.
2. A **grouped list** — one card per assignment (from `groupSubmissionsByAssignment`), each containing the submissions for that assignment sorted newest-first.
3. A **row per submission** — `TutorSubmissionRow` — with:
   - Status pill (`Draft (in progress)` / `Submitted <date>`).
   - Pre-wrapped student answer text.
   - For **submitted** docs only: three buttons (`Correct`, `Incorrect`, `Clear`) and a `reviewerNotes` textarea with a Save button. Drafts show neither.
4. No optimistic updates: the write goes through, and the live `onSnapshot` echoes the change back as the new source of truth. The row keeps its notes textarea state locally, and seeds it from the doc on first mount / when the doc changes.

- [ ] **Step 1: Replace the `TutorSubmissionsPanel` body**

Keep the loading/error/empty branches from Task 6 exactly. Replace only the final "real content" `return` with:

```javascript
const groups = useMemo(
  ()=>groupSubmissionsByAssignment(submissions, student.assignments||[]),
  [submissions, student.assignments]
);
const summary = useMemo(()=>summarizeSubmissions(submissions), [submissions]);
return (
  <div>
    {/* Summary header — missed-question report lives here by design (see plan) */}
    <div style={{...CARD, padding:"20px 22px", marginBottom:16}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:1.4,color:"#66708A",textTransform:"uppercase",marginBottom:8}}>Missed-Question Report</div>
      <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"baseline"}}>
        <TutorSummaryStat value={summary.submittedCount} label="Submitted"/>
        <TutorSummaryStat value={summary.correctCount} label="Correct" tone="#4C7A4C"/>
        <TutorSummaryStat value={summary.incorrectCount} label="Missed" tone="#8C2E2E"/>
        <TutorSummaryStat value={summary.unreviewedCount} label="Unreviewed" tone="#9A5B1F"/>
        {summary.draftCount>0 && <TutorSummaryStat value={summary.draftCount} label="In progress" tone="#66708A"/>}
      </div>
      {summary.incorrectCount===0 && summary.submittedCount>0 && (
        <div style={{marginTop:12,fontFamily:"'Fraunces',Georgia,serif",fontStyle:"italic",fontSize:13,color:"#66708A"}}>
          Nothing marked incorrect yet.
        </div>
      )}
    </div>

    {/* Grouped list */}
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {groups.map(group => (
        <div key={group.assignmentId} style={{...CARD, padding:20}}>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:14,paddingBottom:12,borderBottom:"1px solid rgba(15,26,46,.08)",gap:12,flexWrap:"wrap"}}>
            <div style={{fontFamily:"'Fraunces',Georgia,serif",fontSize:18,fontWeight:600,color:"#0F1A2E",letterSpacing:-.2}}>
              {group.assignment
                ? (group.assignment.date || group.assignment.dateAssigned || "Undated session")
                : "Orphaned submissions (assignment deleted)"}
            </div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#66708A",letterSpacing:1,textTransform:"uppercase"}}>
              {group.submissions.length} attempt{group.submissions.length===1?"":"s"}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {group.submissions.map(sub => (
              <TutorSubmissionRow key={sub.id} studentId={student.id} submission={sub}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
```

- [ ] **Step 2: Add `TutorSummaryStat` helper component above `TutorSubmissionsPanel`**

```javascript
function TutorSummaryStat({value, label, tone}){
  return (
    <div style={{textAlign:"left"}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:26,fontWeight:600,color:tone||"#0F1A2E",letterSpacing:-.3,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#66708A",letterSpacing:1.2,textTransform:"uppercase",marginTop:6,fontWeight:500}}>{label}</div>
    </div>
  );
}
```

- [ ] **Step 3: Add `TutorSubmissionRow` below `TutorSubmissionsPanel`**

```javascript
function TutorSubmissionRow({studentId, submission}){
  const isDraft = submission.status === "draft";
  const answerText = (()=>{
    const r = Array.isArray(submission.responses) ? submission.responses[0] : null;
    return (r && typeof r.studentAnswer === "string") ? r.studentAnswer : "";
  })();
  const [notes, setNotes] = useState(submission.reviewerNotes || "");
  const [saving, setSaving] = useState(false);
  // Reseed local notes if the doc updates from elsewhere (another tutor session).
  const lastSeenNotesRef = useRef(submission.reviewerNotes || "");
  useEffect(()=>{
    const incoming = submission.reviewerNotes || "";
    if(incoming !== lastSeenNotesRef.current){
      lastSeenNotesRef.current = incoming;
      setNotes(incoming);
    }
  }, [submission.reviewerNotes]);

  const writeReview = async (nextCorrect) => {
    if(saving) return;
    setSaving(true);
    try{
      await studentSubmissionsCollection(studentId).doc(submission.id).update(
        makeReviewPayload({correct: nextCorrect, reviewerNotes: notes})
      );
    } catch(err){
      console.warn("[tutor] review write error:", err);
      alert("Couldn't save review. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveNotesOnly = async () => {
    if(saving) return;
    setSaving(true);
    try{
      // Preserve current correct state by passing it through.
      const currentCorrect = submission.correct === true || submission.correct === false
        ? submission.correct
        : null;
      await studentSubmissionsCollection(studentId).doc(submission.id).update(
        makeReviewPayload({correct: currentCorrect, reviewerNotes: notes})
      );
    } catch(err){
      console.warn("[tutor] notes save error:", err);
      alert("Couldn't save notes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const pillStyle = isDraft
    ? {...mkPill("transparent","#66708A"),border:"1px solid rgba(102,112,138,.35)"}
    : submission.correct === true
      ? {...mkPill("transparent","#4C7A4C"),border:"1px solid rgba(76,122,76,.4)"}
      : submission.correct === false
        ? {...mkPill("transparent","#8C2E2E"),border:"1px solid rgba(140,46,46,.4)"}
        : {...mkPill("transparent","#9A5B1F"),border:"1px solid rgba(154,91,31,.4)"};

  const pillLabel = isDraft
    ? "Draft — in progress"
    : submission.correct === true
      ? `Correct — ${formatSubmittedAt(submission.submittedAt)||"submitted"}`
      : submission.correct === false
        ? `Incorrect — ${formatSubmittedAt(submission.submittedAt)||"submitted"}`
        : `Unreviewed — ${formatSubmittedAt(submission.submittedAt)||"submitted"}`;

  return (
    <div style={{padding:"14px 0",borderTop:"1px solid rgba(15,26,46,.06)",opacity:isDraft?0.65:1}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
        <span style={pillStyle}>{pillLabel}</span>
      </div>
      <div style={{whiteSpace:"pre-wrap",fontFamily:"'Fraunces',Georgia,serif",fontSize:14,color:"#0F1A2E",lineHeight:1.55,padding:"10px 14px",background:"#FAF7F2",borderRadius:4,border:"1px solid rgba(15,26,46,.08)"}}>
        {answerText || <span style={{color:"#66708A",fontStyle:"italic"}}>No answer text.</span>}
      </div>
      {!isDraft && (
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          <button
            disabled={saving}
            onClick={()=>writeReview(true)}
            style={{...mkBtn(submission.correct===true?"#4C7A4C":"transparent", submission.correct===true?"#FAF7F2":"#4C7A4C"),border:"1px solid rgba(76,122,76,.5)",padding:"6px 14px",fontSize:10,letterSpacing:.4,textTransform:"uppercase"}}
          >Correct</button>
          <button
            disabled={saving}
            onClick={()=>writeReview(false)}
            style={{...mkBtn(submission.correct===false?"#8C2E2E":"transparent", submission.correct===false?"#FAF7F2":"#8C2E2E"),border:"1px solid rgba(140,46,46,.5)",padding:"6px 14px",fontSize:10,letterSpacing:.4,textTransform:"uppercase"}}
          >Incorrect</button>
          {(submission.correct===true || submission.correct===false) && (
            <button
              disabled={saving}
              onClick={()=>writeReview(null)}
              style={{...mkBtn("transparent","#66708A"),border:"1px solid rgba(15,26,46,.18)",padding:"6px 14px",fontSize:10,letterSpacing:.4,textTransform:"uppercase"}}
            >Clear</button>
          )}
        </div>
      )}
      {!isDraft && (
        <div style={{marginTop:12}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#66708A",letterSpacing:1.2,textTransform:"uppercase",marginBottom:6}}>Tutor notes</div>
          <textarea
            value={notes}
            onChange={e=>setNotes(e.target.value)}
            placeholder="Feedback for this attempt…"
            style={{width:"100%",minHeight:68,padding:"10px 12px",borderRadius:4,border:"1px solid rgba(15,26,46,.18)",fontFamily:"'IBM Plex Sans',system-ui,sans-serif",fontSize:12,lineHeight:1.5,color:"#0F1A2E",resize:"vertical",boxSizing:"border-box"}}
          />
          <div style={{marginTop:8,display:"flex",justifyContent:"flex-end"}}>
            <button
              disabled={saving || notes === (submission.reviewerNotes||"")}
              onClick={saveNotesOnly}
              style={{...mkBtn(B2,"#FAF7F2"),padding:"6px 14px",fontSize:10,letterSpacing:.4,textTransform:"uppercase",opacity:(saving||notes===(submission.reviewerNotes||""))?0.5:1}}
            >Save notes</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rebuild**

Run: `python3 build_index.py`

- [ ] **Step 5: Run tests — still 80 passing, no regressions**

Run: `node --test tests/portal.test.mjs`

- [ ] **Step 6: Manual verification (CHECKPOINT B — STOP here for Kiran)**

Kiran opens a student that has at least one Session 5 submission, navigates to the new Submissions tab, and verifies:
- Summary header card renders with correct counts (Submitted / Correct / Missed / Unreviewed, plus In progress if drafts exist).
- Grouped list shows the submission under its assignment header, newest assignment first.
- Student answer text renders pre-wrapped.
- Clicking "Incorrect" updates the pill and the summary header counts (via live `onSnapshot` echo).
- Typing a note and clicking "Save notes" persists — reload the tab, the note is still there.
- Clicking "Clear" on a marked submission reverts it to "Unreviewed".
- Drafts show the "Draft — in progress" pill, dimmed, with no buttons and no notes field.
- `?dev=1` tutor dev flow still opens `StudentProfile` unchanged for the other four tabs.

**Stop here.** Report status. Wait for Kiran to push the commit or tell you to continue.

- [ ] **Step 7: Commit once Kiran approves Checkpoint B**

```bash
git add app.jsx
git commit -m "tutor submissions panel — summary, grouping, review controls"
git push
```

---

## Task 8: Session closeout doc

**Files:**
- Create: `docs/PHASE_2_SESSION_6.md`

Follow the exact structure of [docs/PHASE_2_SESSION_5.md](./PHASE_2_SESSION_5.md):

- Header (date 2026-04-14, parent docs, one-paragraph outcome summary).
- **What shipped** — numbered list matching the tasks above, with commit hashes.
- **What did not ship** — auto-grading, per-question marking, rules changes, student/parent impact, retake UI.
- **Deviations from plan** — anything that drifted from this doc. If none, say so.
- **Open questions and risks** — anything discovered during implementation. At minimum:
  - Parent role can technically read submissions (already noted in Session 5); tutor review UI doesn't change that.
  - Concurrent tutor edits: second tutor wins last-write. Not a problem at current staffing.
  - "Clear" on a submission nukes the note's `reviewedAt` but preserves `reviewerNotes` — intentional but flag it.
- **Checkpoint checklist** — mirror Session 5's format.
- **Kickoff prompt for Session 7** at the bottom, between horizontal rules, covering: real student/parent allowlist rollout, pilot scope decision, Aidan-email coordination, the previously-deferred open questions from Sessions 1–6.

- [ ] **Step 1: Write the doc**

- [ ] **Step 2: Commit**

```bash
git add docs/PHASE_2_SESSION_6.md
git commit -m "phase 2 session 6 closeout"
git push
```

---

## Self-review checklist (run before handing the plan to Kiran)

- [x] Every task has exact file paths.
- [x] Every code step shows the actual code, not "similar to above."
- [x] Task 1–4 tests precede their implementations (TDD).
- [x] Checkpoints A and B match the kickoff prompt's "pause at first natural checkpoint" list.
- [x] The four open questions from the kickoff are answered up-front in "Design decisions."
- [x] No `firestore.rules` edits. No rules deploy. No `USE_ALLOWLIST_AUTH` / `DUAL_WRITE_GRACE` flips.
- [x] Tutor-only code — no student/parent portal code touched.
- [x] `python3 build_index.py` step appears after every `app.jsx` change that will be loaded in the browser.
- [x] Commits use short user-voice messages with no Co-Authored-By trailer (psm-generator override).
- [x] `TutorSummaryStat` defined before `TutorSubmissionsPanel` references it.
- [x] `TutorSubmissionRow` handles three-state `correct` consistently with `summarizeSubmissions` and `makeReviewPayload`.
- [x] Test helper copies of `groupSubmissionsByAssignment`, `summarizeSubmissions`, `formatSubmittedAt`, `makeReviewPayload` match the `app.jsx` copies modulo `FieldValue` injection (same pattern as existing `makeDraftPayload` tests).
