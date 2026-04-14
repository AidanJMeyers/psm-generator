# Phase 2 — Session 5 Implementation Plan: SubmissionEditor + Draft Autosave

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students can type free-text answers to an assigned worksheet inside the portal, drafts autosave to `/students/{id}/submissions/{subId}` every 750ms, and clicking Submit locks the submission into an immutable read-only view. Parents viewing the same student see the submission read-only but never the editor.

**Architecture:** A new `SubmissionEditor` React component is reachable as a drill-in from `PortalHistoryTab` (per-assignment "Answer" / "View submission" button). State flow: `useSubmissionDraft(studentId, assignmentId)` does a one-shot query on mount to locate an existing submission; local React state holds the textarea contents; a debounced effect writes drafts via `.update()` on a doc reference generated once with `studentSubmissionsCollection(studentId).doc()`. Submit is a single `.update({status:"submitted", submittedAt})` after the autosave debounce has flushed. Parents route to the same component in `readOnly` mode. All writes go only to the `submissions/` subcollection — no dual-write, no legacy blob.

**Tech Stack:** Firebase Compat SDK (`firebase.firestore()`, `FieldValue.serverTimestamp()`, `collection.doc()` for auto-ids), React via Babel-standalone, inline `app.jsx` bundled by `build_index.py`, `node --test` for pure-helper unit tests.

---

## Decisions on the Session 5 open questions

These lock before any code is written. Kiran approves them as part of this plan.

1. **Question structure — Option (c).** Single free-text textarea. Students type answers in any format they like (`"1. B\n2. C\n3. A"` or prose). Stored as ONE element `responses: [{ questionIndex: 0, studentAnswer: "<full textarea contents>" }]`. This preserves forward-compatibility: a later session that introduces per-question parsing can split this single entry into N entries without a schema migration. The schema field name and array shape are exactly what Session 1 specified.
2. **Drill-in, not fourth tab.** The editor replaces the History tab's list view when an assignment is "opened." A ← Back button returns to the list. Rationale: submissions are per-assignment; making them a tab would force a second selector.
3. **`submissionId` generation.** On first write, call `studentSubmissionsCollection(studentId).doc()` (no args) to generate a stable auto-id client-side, hold it in a `useRef`, and reuse it for all subsequent writes within this editing session. Never generate a new id per keystroke.
4. **Opening an assignment that already has a submitted submission.** Read-only view. Shows the textarea contents as static text, a "Submitted on <date>" header, and no edit controls. No retake UI in Session 5.
5. **Opening an assignment with an existing draft.** Resume editing — the query picks up the draft doc, seeds the textarea, and subsequent writes update that same doc.
6. **Multiple existing submissions for the same assignment.** Canonical pick order: the first `status === "draft"` doc (students can only have one draft at a time in practice), else the most recent `submittedAt` doc. Implemented as a pure helper `pickLatestSubmission(docs)`.
7. **Autosave debounce.** 750ms after the last keystroke.
8. **Saving / Saved badges.** Deferred. Firestore compat SDK queues writes on flaky networks. Silence is acceptable for v1.
9. **Role gate.** Client-side check: the "Answer" button renders only when `currentUserEntry?.role === "student"`. Parents see "View submission" when a submission exists, nothing when it doesn't. The Firestore rules from Session 2 already enforce the same split server-side — client gate is for UX, not security.
10. **Tutor view in `AppInner`.** Out of scope. Tutors still see the existing `StudentProfile` which does not read `submissions/` at all. Session 6 wires the tutor-side review.

---

## File structure

Two files touched. No new files.

- **`app.jsx`** — additions only, no tutor-code modification:
  - `studentSubmissionsCollection(id)` ref helper next to `studentDocRef`/`notesDocRef` (~line 310).
  - Three pure helpers near the other portal helpers (~line 620): `pickLatestSubmission`, `canSubmitDraft`, `makeDraftPayload`.
  - `useSubmissionDraft(studentId, assignmentId)` hook below `usePortalStudent` (~line 367).
  - `SubmissionEditor` component below `PortalHistoryTab` (~line 3946).
  - `PortalHistoryTab` modified to manage `openAssignmentId` state and drill into `SubmissionEditor` when set. Assignment cards get a role-gated footer button.
- **`tests/portal.test.mjs`** — three new `test(...)` blocks for the three pure helpers. Keeps the "copy helper into test file verbatim" pattern used by `pickPortalStudentId` and `pickParentSelectedChildId`.

No new files. No `package.json`. No bundler.

---

## Critical reminders (repeat of the kickoff constraints for the executing engineer)

- **Rebuild before reload.** After any `app.jsx` edit you must run `python3 build_index.py` before hard-refreshing the browser. Session 4 lost a review cycle to this. **Add a TodoWrite item per task that ends with "rebuild" if the task changes `app.jsx`.**
- **Local dev requires a real Firebase Auth session.** `?dev=1` fakes client auth but not Firebase Auth. Before testing the portal at `localhost/?dev=1&role=student&studentId=<id>`, sign in for real first at `localhost/` (no query params) → click Sign in with Google → complete workspace auth → then navigate to the dev-bypass URL. Same dance Session 3 documented — applies here because writes also need the real session.
- **Do not modify `firestore.rules`.** The Session 2 rules already specify the submission write contract exactly. If a task seems to need a rules change, STOP and raise it to Kiran — that's a spec deviation, not a Session 5 detail.
- **Do not touch `AppInner` or any tutor code path.**
- **Do not write to `psm-data/main` for submissions.** Ever. There is no dual-write for submissions.
- **Do not gate anything on `DUAL_WRITE_GRACE` or flip `USE_ALLOWLIST_AUTH`.**
- **`currentUserEntry.role === "student"` is the client-side editor gate.** Parents get a read-only `mode` on the same component and never see an editable textarea.
- **Use `firebase.firestore.FieldValue.serverTimestamp()` for `createdAt` / `updatedAt` / `submittedAt`.** This is the compat SDK pattern already used by `migrate_to_per_student.mjs`. Do not use `Date.now()` or `new Date()` — server timestamps keep ordering correct across clocks.
- **Commit override applies.** psm-generator policy: commit + push directly, short user-voice messages, no Co-Authored-By. One atomic commit per task below.

---

## Task 1: Add `studentSubmissionsCollection` ref helper

**Files:**
- Modify: `app.jsx:310` (add next to `studentDocRef`, `notesDocRef`)

- [ ] **Step 1: Add the helper**

After the `notesDocRef` definition, add:

```javascript
const studentSubmissionsCollection = (id) => window.db
  ? window.db.collection("students").doc(id).collection("submissions")
  : null;
```

No comment needed — the name is the docs.

- [ ] **Step 2: Rebuild**

Run: `python3 build_index.py`
Expected: writes updated `index.html`, no errors.

- [ ] **Step 3: Parse check**

Run: `node --test tests/*.mjs`
Expected: 45/45 still passing (no new tests yet, no behavior change).

- [ ] **Step 4: Commit**

```bash
git add app.jsx index.html
git commit -m "add studentSubmissionsCollection ref helper"
git push
```

---

## Task 2: Pure helper — `pickLatestSubmission` + tests

Picks which of N submission docs for the same assignment is the canonical one to render. Prefers any `status === "draft"` doc (invariant: student can only have one open draft at a time); otherwise returns the doc with the largest `submittedAt` (ISO or Firestore Timestamp — both sortable after `.toMillis()` normalization, see helper code).

**Files:**
- Modify: `tests/portal.test.mjs` (append)

- [ ] **Step 1: Write the failing tests**

Append to `tests/portal.test.mjs`:

```javascript
function pickLatestSubmission(docs){
  if(!Array.isArray(docs) || docs.length === 0) return null;
  const draft = docs.find(d => d && d.status === "draft");
  if(draft) return draft;
  const submitted = docs.filter(d => d && d.status === "submitted");
  if(submitted.length === 0) return null;
  const ms = (d) => {
    const t = d.submittedAt;
    if(!t) return 0;
    if(typeof t.toMillis === "function") return t.toMillis();
    if(typeof t === "string") return Date.parse(t) || 0;
    if(typeof t === "number") return t;
    return 0;
  };
  return submitted.slice().sort((a,b)=> ms(b) - ms(a))[0];
}

test('pickLatestSubmission: empty → null', () => {
  assert.equal(pickLatestSubmission([]), null);
});

test('pickLatestSubmission: null input → null', () => {
  assert.equal(pickLatestSubmission(null), null);
});

test('pickLatestSubmission: single draft → draft', () => {
  const d = {id:"a", status:"draft"};
  assert.equal(pickLatestSubmission([d]), d);
});

test('pickLatestSubmission: draft + submitted → draft wins', () => {
  const draft = {id:"a", status:"draft"};
  const sub = {id:"b", status:"submitted", submittedAt:"2026-04-10T00:00:00Z"};
  assert.equal(pickLatestSubmission([sub, draft]), draft);
});

test('pickLatestSubmission: two submitted → most recent', () => {
  const older = {id:"a", status:"submitted", submittedAt:"2026-01-01T00:00:00Z"};
  const newer = {id:"b", status:"submitted", submittedAt:"2026-04-01T00:00:00Z"};
  assert.equal(pickLatestSubmission([older, newer]).id, "b");
});

test('pickLatestSubmission: only submitted, missing submittedAt → first non-null', () => {
  const a = {id:"a", status:"submitted"};
  const out = pickLatestSubmission([a]);
  assert.equal(out.id, "a");
});
```

- [ ] **Step 2: Run tests — expect green**

Run: `node --test tests/*.mjs`
Expected: **51/51** (45 prior + 6 new). If the helper logic matches the test expectations, this lands green on first run — no red phase needed because the helper is defined inside the test file.

- [ ] **Step 3: Mirror the helper into `app.jsx`**

Add immediately after `pickParentSelectedChildId` (~line 637) in `app.jsx` — verbatim copy of the test file's `pickLatestSubmission` function.

- [ ] **Step 4: Rebuild**

Run: `python3 build_index.py`

- [ ] **Step 5: Commit**

```bash
git add app.jsx index.html tests/portal.test.mjs
git commit -m "add pickLatestSubmission helper + tests"
git push
```

---

## Task 3: Pure helper — `canSubmitDraft` + tests

Gate the Submit button. True only if a submission exists, its status is `"draft"`, and its `responses[0].studentAnswer` is non-empty after trim.

**Files:**
- Modify: `tests/portal.test.mjs` (append)
- Modify: `app.jsx` (append after `pickLatestSubmission`)

- [ ] **Step 1: Write the tests**

Append to `tests/portal.test.mjs`:

```javascript
function canSubmitDraft(submission){
  if(!submission) return false;
  if(submission.status !== "draft") return false;
  const r = Array.isArray(submission.responses) ? submission.responses[0] : null;
  const text = (r && typeof r.studentAnswer === "string") ? r.studentAnswer.trim() : "";
  return text.length > 0;
}

test('canSubmitDraft: null → false', () => {
  assert.equal(canSubmitDraft(null), false);
});

test('canSubmitDraft: submitted status → false', () => {
  assert.equal(canSubmitDraft({status:"submitted", responses:[{questionIndex:0, studentAnswer:"x"}]}), false);
});

test('canSubmitDraft: draft with empty answer → false', () => {
  assert.equal(canSubmitDraft({status:"draft", responses:[{questionIndex:0, studentAnswer:"   "}]}), false);
});

test('canSubmitDraft: draft with missing responses → false', () => {
  assert.equal(canSubmitDraft({status:"draft"}), false);
});

test('canSubmitDraft: draft with content → true', () => {
  assert.equal(canSubmitDraft({status:"draft", responses:[{questionIndex:0, studentAnswer:"1. B\n2. C"}]}), true);
});
```

- [ ] **Step 2: Run tests**

Run: `node --test tests/*.mjs`
Expected: **56/56**.

- [ ] **Step 3: Mirror helper into `app.jsx`**

Copy the same `canSubmitDraft` function into `app.jsx` right after `pickLatestSubmission`.

- [ ] **Step 4: Rebuild + commit**

```bash
python3 build_index.py
git add app.jsx index.html tests/portal.test.mjs
git commit -m "add canSubmitDraft gate + tests"
git push
```

---

## Task 4: Pure helper — `makeDraftPayload` + tests

Builds the plain-JS object written to Firestore on first create and every autosave update. Parameterized on assignment id, the current answers text, and whether this is the initial create (adds `createdAt`) or an update (only sets `updatedAt`). Never sets `status` to anything other than `"draft"`.

**Files:**
- Modify: `tests/portal.test.mjs`
- Modify: `app.jsx`

- [ ] **Step 1: Write the tests**

Append to `tests/portal.test.mjs`:

```javascript
// FieldValue stub so the test file can run without firebase-admin.
const SERVER_TS = Symbol("server-ts");
const FIELD_VALUE_STUB = { serverTimestamp: () => SERVER_TS };

function makeDraftPayload({assignmentId, answersText, isCreate, FieldValue}){
  const base = {
    assignmentId,
    responses: [{questionIndex: 0, studentAnswer: answersText || ""}],
    status: "draft",
    updatedAt: FieldValue.serverTimestamp(),
  };
  if(isCreate){
    base.createdAt = FieldValue.serverTimestamp();
  }
  return base;
}

test('makeDraftPayload: create sets createdAt + updatedAt', () => {
  const p = makeDraftPayload({assignmentId:"asg1", answersText:"1. B", isCreate:true, FieldValue:FIELD_VALUE_STUB});
  assert.equal(p.assignmentId, "asg1");
  assert.equal(p.status, "draft");
  assert.equal(p.responses.length, 1);
  assert.equal(p.responses[0].questionIndex, 0);
  assert.equal(p.responses[0].studentAnswer, "1. B");
  assert.equal(p.createdAt, SERVER_TS);
  assert.equal(p.updatedAt, SERVER_TS);
});

test('makeDraftPayload: update has updatedAt but no createdAt', () => {
  const p = makeDraftPayload({assignmentId:"asg1", answersText:"x", isCreate:false, FieldValue:FIELD_VALUE_STUB});
  assert.equal(p.createdAt, undefined);
  assert.equal(p.updatedAt, SERVER_TS);
});

test('makeDraftPayload: empty answer still produces a response entry', () => {
  const p = makeDraftPayload({assignmentId:"asg1", answersText:"", isCreate:true, FieldValue:FIELD_VALUE_STUB});
  assert.equal(p.responses[0].studentAnswer, "");
});

test('makeDraftPayload: status is always "draft" (never submitted)', () => {
  const p = makeDraftPayload({assignmentId:"asg1", answersText:"anything", isCreate:false, FieldValue:FIELD_VALUE_STUB});
  assert.equal(p.status, "draft");
});
```

- [ ] **Step 2: Run tests**

Run: `node --test tests/*.mjs`
Expected: **60/60**.

- [ ] **Step 3: Mirror helper into `app.jsx`**

Copy `makeDraftPayload` into `app.jsx` right after `canSubmitDraft`. In the app copy, the `FieldValue` argument is not needed at the call site because `app.jsx` calls `firebase.firestore.FieldValue.serverTimestamp()` directly — but to keep the shape identical to the tested version, pass `firebase.firestore.FieldValue` at the call site:

```javascript
// In app.jsx, no FieldValue parameter — closes over firebase global.
function makeDraftPayload({assignmentId, answersText, isCreate}){
  const FV = firebase.firestore.FieldValue;
  const base = {
    assignmentId,
    responses: [{questionIndex: 0, studentAnswer: answersText || ""}],
    status: "draft",
    updatedAt: FV.serverTimestamp(),
  };
  if(isCreate) base.createdAt = FV.serverTimestamp();
  return base;
}
```

The test version takes `FieldValue` as a parameter so it can be stubbed under `node --test`. Both produce the same shape — the shape is what's tested.

- [ ] **Step 4: Rebuild + commit**

```bash
python3 build_index.py
git add app.jsx index.html tests/portal.test.mjs
git commit -m "add makeDraftPayload helper + tests"
git push
```

---

## Task 5: `useSubmissionDraft` hook

One-shot query on mount that finds any existing submission for (studentId, assignmentId). Returns `{status, submission}` where status is `"loading" | "ready" | "not-found" | "error"`. Not a snapshot subscription — reads are one-time; writes are driven from component state and don't need round-trip echo. Idempotent on `(studentId, assignmentId)` change (refires the query).

**Files:**
- Modify: `app.jsx` (add after `usePortalStudent`, ~line 367)

- [ ] **Step 1: Add the hook**

```javascript
// One-shot lookup for an existing submission doc for (studentId, assignmentId).
// Not a subscription: the editor owns the live textarea state locally, and
// writes are fire-and-forget through a debounced effect. Re-queries when the
// assignment changes. See pickLatestSubmission for the canonical-pick policy.
//
// Same dev-bypass caveat as usePortalStudent: requires a real Firebase Auth
// session. The Firestore rules from Phase 2 Session 2 allow reads only for
// tutor/admin or linked student/parent, neither of which a ?dev=1-only session
// satisfies — sign in for real first.
function useSubmissionDraft(studentId, assignmentId){
  const [state, setState] = useState({status:"loading", submission:null});
  useEffect(()=>{
    if(!studentId || !assignmentId){
      setState({status:"not-found", submission:null});
      return;
    }
    const col = studentSubmissionsCollection(studentId);
    if(!col){
      setState({status:"error", submission:null});
      return;
    }
    let cancelled = false;
    setState({status:"loading", submission:null});
    col.where("assignmentId", "==", assignmentId).get()
      .then(snap => {
        if(cancelled) return;
        const docs = snap.docs.map(d => ({id:d.id, ...d.data()}));
        const picked = pickLatestSubmission(docs);
        setState({status: picked ? "ready" : "not-found", submission: picked});
      })
      .catch(err => {
        if(cancelled) return;
        console.warn("[portal] submission query error:", err);
        setState({status:"error", submission:null});
      });
    return ()=>{ cancelled = true; };
  }, [studentId, assignmentId]);
  return state;
}
```

- [ ] **Step 2: Rebuild**

Run: `python3 build_index.py`

- [ ] **Step 3: Parse check**

Run: `node --test tests/*.mjs`
Expected: **60/60** (hook isn't unit-tested directly — covered by the manual checkpoint and by the pure helpers underneath).

- [ ] **Step 4: Commit**

```bash
git add app.jsx index.html
git commit -m "add useSubmissionDraft one-shot query hook"
git push
```

---

## Task 6: `SubmissionEditor` component — scaffold (read-only mode first)

Ship the component in its simplest form: takes `{studentId, assignment, readOnly, onClose}`, shows the assignment header, a back button, and (for now) a plain textarea plus a disabled Submit button. No writes yet. This lets us verify the drill-in navigation in isolation before adding persistence.

**Files:**
- Modify: `app.jsx` (add after `PortalHistoryTab`, before `PortalTrendsTab` or wherever fits — suggest right after `PortalHistoryTab` at ~line 3946)

- [ ] **Step 1: Add the component**

```javascript
// Per-assignment submission entry. Drill-in from PortalHistoryTab. Parents
// reach this in readOnly mode — never editable. Students in editable mode
// autosave drafts to /students/{id}/submissions/{subId} on a 750ms debounce
// and lock to "submitted" via a single write when they click Submit.
function SubmissionEditor({studentId, assignment, readOnly, onClose}){
  const {status, submission} = useSubmissionDraft(studentId, assignment.id);
  const [text, setText] = useState("");
  const submissionIdRef = useRef(null);
  const [localStatus, setLocalStatus] = useState("draft"); // mirrors server status once submitted
  const [submittedAt, setSubmittedAt] = useState(null);

  // Seed local text from the loaded submission once the hook resolves.
  useEffect(()=>{
    if(status !== "ready" || !submission) return;
    submissionIdRef.current = submission.id;
    const r = Array.isArray(submission.responses) ? submission.responses[0] : null;
    setText((r && r.studentAnswer) || "");
    setLocalStatus(submission.status || "draft");
    setSubmittedAt(submission.submittedAt || null);
  }, [status, submission]);

  if(status === "loading"){
    return (
      <div style={{...CARD, padding:"40px 24px", textAlign:"center"}}>
        <div style={{fontFamily:"var(--font-display)", color:"var(--ink-mute)"}}>Loading…</div>
      </div>
    );
  }
  if(status === "error"){
    return (
      <div style={{...CARD, padding:"40px 24px", textAlign:"center"}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif", fontStyle:"italic", color:"#8C2E2E"}}>
          Couldn't load this submission. Try reloading.
        </div>
        <button onClick={onClose} style={BACK_BTN_STYLE}>← Back</button>
      </div>
    );
  }

  const isLocked = readOnly || localStatus === "submitted";

  return (
    <div style={{...CARD, padding:"24px 22px"}}>
      <button onClick={onClose} style={BACK_BTN_STYLE}>← Back to assignments</button>
      <div style={{fontFamily:"'Fraunces',Georgia,serif", fontSize:22, fontWeight:600, color:"#0F1A2E", marginTop:14, marginBottom:6, letterSpacing:-.2}}>
        {assignment.date || assignment.dateAssigned || "Assignment"}
      </div>
      {isLocked && submittedAt && (
        <div style={{fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#66708A", textTransform:"uppercase", letterSpacing:1, marginBottom:14}}>
          Submitted {typeof submittedAt === "string" ? submittedAt.slice(0,10) : (submittedAt.toDate ? submittedAt.toDate().toISOString().slice(0,10) : "")}
        </div>
      )}
      {isLocked ? (
        <div style={{whiteSpace:"pre-wrap", fontFamily:"'Fraunces',Georgia,serif", fontSize:15, color:"#0F1A2E", lineHeight:1.55, padding:"14px 0", borderTop:"1px solid rgba(15,26,46,.08)", borderBottom:"1px solid rgba(15,26,46,.08)"}}>
          {text || <span style={{color:"#66708A", fontStyle:"italic"}}>No answer recorded.</span>}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={e=>setText(e.target.value)}
          placeholder={"Type your answers here. Example:\n\n1. B\n2. C\n3. A"}
          style={{
            width:"100%", minHeight:260, padding:"14px 16px", borderRadius:8,
            border:"1px solid rgba(15,26,46,.2)", fontFamily:"'IBM Plex Mono',monospace",
            fontSize:14, lineHeight:1.6, color:"#0F1A2E", resize:"vertical",
          }}
        />
      )}
      {!isLocked && (
        <div style={{marginTop:16, display:"flex", justifyContent:"flex-end"}}>
          <button disabled style={SUBMIT_BTN_STYLE_DISABLED}>Submit</button>
        </div>
      )}
    </div>
  );
}

const BACK_BTN_STYLE = {
  border:"none", background:"none", cursor:"pointer", padding:0,
  fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:1,
  textTransform:"uppercase", color:"#9A5B1F",
};
const SUBMIT_BTN_STYLE = {
  border:"none", background:"#0F1A2E", color:"#fff", padding:"12px 22px",
  borderRadius:8, fontFamily:"'Fraunces',Georgia,serif", fontSize:14,
  fontWeight:600, cursor:"pointer", letterSpacing:-.1,
};
const SUBMIT_BTN_STYLE_DISABLED = {
  ...SUBMIT_BTN_STYLE, background:"#C9CEDC", cursor:"not-allowed",
};
```

- [ ] **Step 2: Rebuild**

Run: `python3 build_index.py`

- [ ] **Step 3: Parse check**

Run: `node --test tests/*.mjs`
Expected: **60/60** still green.

- [ ] **Step 4: Commit**

```bash
git add app.jsx index.html
git commit -m "scaffold SubmissionEditor component (no writes yet)"
git push
```

---

## Task 7: Wire drill-in from `PortalHistoryTab`

Add `openAssignmentId` state to `PortalHistoryTab`. When set, render `SubmissionEditor` instead of the assignment list. Add a role-gated footer button to each assignment card: "Answer →" when student, "View submission" when parent (and a submission exists), nothing otherwise.

`PortalHistoryTab` needs `studentId` and `currentUserEntry` now — update its caller in `StudentPortal` accordingly.

**Files:**
- Modify: `app.jsx` — `PortalHistoryTab` signature and body, and one line at the `PortalHistoryTab` call site in `StudentPortal` (~line 3602)

- [ ] **Step 1: Update the `StudentPortal` call site**

Change:
```javascript
{tab==="history"  && <PortalHistoryTab student={student}/>}
```
to:
```javascript
{tab==="history"  && <PortalHistoryTab student={student} studentId={studentId} currentUserEntry={currentUserEntry}/>}
```

- [ ] **Step 2: Rewrite `PortalHistoryTab` to manage drill-in state**

Replace the existing function signature and prepend the drill-in branch. Keep the list-rendering body unchanged except for the new footer button on each card.

```javascript
function PortalHistoryTab({student, studentId, currentUserEntry}){
  const [openAssignmentId, setOpenAssignmentId] = useState(null);
  const assignments = (student.assignments||[]).filter(a=>!a.deleted);
  const role = currentUserEntry?.role || null;
  const canEdit = role === "student";

  if(openAssignmentId){
    const asg = assignments.find(a => a.id === openAssignmentId);
    if(!asg){
      // Assignment vanished (deleted by tutor mid-session). Fall back to list.
      setOpenAssignmentId(null);
      return null;
    }
    return (
      <SubmissionEditor
        studentId={studentId}
        assignment={asg}
        readOnly={!canEdit}
        onClose={()=>setOpenAssignmentId(null)}
      />
    );
  }

  if(assignments.length===0){
    return (
      <div style={{...CARD, padding:"60px 40px", textAlign:"center"}}>
        <div style={{fontFamily:"'Fraunces',Georgia,serif",fontStyle:"italic",fontSize:22,color:"#66708A",letterSpacing:-.2,marginBottom:10}}>
          No assignments yet.
        </div>
        <div style={{fontSize:13,color:"#66708A",lineHeight:1.55}}>
          Your tutor will start assigning practice here.
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {assignments.slice().reverse().map(asg=>{
        const worksheets = (asg.worksheets||[]).filter(w=>!w.deleted);
        const welledDomain = (asg.welledDomain||[]).filter(w=>!w.deleted);
        const practiceExams = (asg.practiceExams||[]).filter(e=>!e.deleted);
        return (
          <div key={asg.id} style={{...CARD, padding:20}}>
            {/* ... existing header + worksheets + welled + exams blocks unchanged ... */}

            {/* NEW: role-gated footer */}
            {canEdit && (
              <div style={{marginTop:14, paddingTop:12, borderTop:"1px solid rgba(15,26,46,.08)", display:"flex", justifyContent:"flex-end"}}>
                <button
                  onClick={()=>setOpenAssignmentId(asg.id)}
                  style={{
                    border:"1px solid rgba(154,91,31,.4)", background:"#fff", color:"#9A5B1F",
                    padding:"8px 16px", borderRadius:6, cursor:"pointer",
                    fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:1,
                    textTransform:"uppercase",
                  }}
                >Answer →</button>
              </div>
            )}
            {!canEdit && role === "parent" && (
              <div style={{marginTop:14, paddingTop:12, borderTop:"1px solid rgba(15,26,46,.08)", display:"flex", justifyContent:"flex-end"}}>
                <button
                  onClick={()=>setOpenAssignmentId(asg.id)}
                  style={{
                    border:"1px solid rgba(15,26,46,.2)", background:"#fff", color:"#0F1A2E",
                    padding:"8px 16px", borderRadius:6, cursor:"pointer",
                    fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:1,
                    textTransform:"uppercase",
                  }}
                >View submission</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**IMPORTANT:** keep all the existing inner markup (header row with date + pills, worksheets block, welledDomain block, practiceExams block) exactly as it is today at `app.jsx:3884-3939`. Only the footer button and the early-return drill-in block are new.

- [ ] **Step 3: Rebuild**

Run: `python3 build_index.py`

- [ ] **Step 4: Parse check**

Run: `node --test tests/*.mjs`
Expected: **60/60**.

- [ ] **Step 5: Commit**

```bash
git add app.jsx index.html
git commit -m "history tab: drill-in to SubmissionEditor with role-gated button"
git push
```

---

## 🛑 CHECKPOINT A — stop here, wait for Kiran

After Task 7, pause and report. Kiran verifies:

1. Hard-refresh `localhost/?dev=1&role=student&studentId=<id>` (after signing in for real first).
2. Click the History tab.
3. Confirm each assignment card has an "Answer →" button.
4. Click Answer on an assignment with at least one worksheet.
5. Confirm the editor renders with a header, empty textarea, Back button, and disabled Submit button.
6. Click Back → list returns, clicks work idempotently.
7. Flip to `role=parent&studentId=<id>` → confirm parent sees "View submission" button OR no button (depending on whether a submission exists). Never sees an editable textarea.
8. Confirm tutor flow at `?dev=1` (no role) still reaches `AppInner` and is unaffected.

If any step fails: stop, diagnose, do not proceed to Task 8. This is the first review gate.

---

## Task 8: Autosave — on-change, debounced 750ms

Wire the textarea to write drafts. First change creates the doc with `studentSubmissionsCollection(id).doc()` auto-id held in `submissionIdRef`. Subsequent changes `.update()` the same doc. Debounce 750ms. Cancel pending writes on unmount. No saving badges.

**Files:**
- Modify: `app.jsx` — `SubmissionEditor` body (add effect)

- [ ] **Step 1: Add the autosave effect**

Inside `SubmissionEditor`, after the existing `useEffect` that seeds local state, add:

```javascript
// Tracks whether the current text has been flushed to Firestore. Used by
// Submit to wait for in-flight autosaves. A plain boolean inside a ref so
// setting it doesn't cause re-renders.
const isDirtyRef = useRef(false);
const pendingTimerRef = useRef(null);

// Fire a single write. Creates the doc on first write (no submissionIdRef),
// updates thereafter. Always writes status:"draft" via makeDraftPayload.
const writeDraft = async (answersText) => {
  if(isLocked) return;
  const col = studentSubmissionsCollection(studentId);
  if(!col) return;
  try{
    if(!submissionIdRef.current){
      const newRef = col.doc(); // auto-id, no network round trip
      submissionIdRef.current = newRef.id;
      await newRef.set(makeDraftPayload({
        assignmentId: assignment.id,
        answersText,
        isCreate: true,
      }));
    } else {
      await col.doc(submissionIdRef.current).update(
        makeDraftPayload({
          assignmentId: assignment.id,
          answersText,
          isCreate: false,
        })
      );
    }
    isDirtyRef.current = false;
  } catch(err){
    console.warn("[portal] draft write error:", err);
    // Leave isDirtyRef true so the next change (or Submit) retries.
  }
};

// Debounced autosave. Fires 750ms after the last keystroke.
useEffect(()=>{
  if(isLocked) return;
  if(status !== "ready" && status !== "not-found") return;
  isDirtyRef.current = true;
  if(pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  pendingTimerRef.current = setTimeout(()=>{
    writeDraft(text);
  }, 750);
  return ()=>{
    if(pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [text, status, isLocked]);
```

Two notes on the code above:
- `writeDraft` is defined inside the component body each render. That's fine — it only runs from the debounce timer, never in render. Capturing the latest `text` via the effect's dependency array is correct.
- The `status !== "ready" && status !== "not-found"` guard prevents autosave from firing while the initial query is still loading (would race with the seed effect).

- [ ] **Step 2: Rebuild + parse check**

```bash
python3 build_index.py
node --test tests/*.mjs
```
Expected: **60/60**.

- [ ] **Step 3: Commit**

```bash
git add app.jsx index.html
git commit -m "SubmissionEditor: debounced draft autosave"
git push
```

---

## Task 9: Submit-lock behavior

Enable the Submit button when `canSubmitDraft()` returns true. On click, flush any pending autosave, then issue a single `.update({status:"submitted", submittedAt: serverTimestamp()})`. Flip local state to render the read-only view.

**Files:**
- Modify: `app.jsx` — `SubmissionEditor`

- [ ] **Step 1: Replace the disabled placeholder button with a real one**

Replace the existing Submit block:

```javascript
{!isLocked && (
  <div style={{marginTop:16, display:"flex", justifyContent:"flex-end"}}>
    <button disabled style={SUBMIT_BTN_STYLE_DISABLED}>Submit</button>
  </div>
)}
```

with:

```javascript
{!isLocked && (() => {
  const syntheticDraft = {
    status: "draft",
    responses: [{questionIndex:0, studentAnswer:text}],
  };
  const enabled = canSubmitDraft(syntheticDraft);
  const [submitting, _setSubmitting] = [submittingState, setSubmittingState]; // see note below
  return (
    <div style={{marginTop:16, display:"flex", justifyContent:"flex-end", gap:12}}>
      <button
        disabled={!enabled || submitting}
        onClick={handleSubmit}
        style={(enabled && !submitting) ? SUBMIT_BTN_STYLE : SUBMIT_BTN_STYLE_DISABLED}
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
})()}
```

**Hook state note:** the destructure above is pseudocode — hooks can't be called inside an IIFE. Instead, add this state declaration at the top of `SubmissionEditor` alongside the other `useState` calls:

```javascript
const [submittingState, setSubmittingState] = useState(false);
```

And define `handleSubmit` as a regular function inside the component body:

```javascript
const handleSubmit = async () => {
  if(isLocked || submittingState) return;
  if(!canSubmitDraft({status:"draft", responses:[{questionIndex:0, studentAnswer:text}]})) return;
  setSubmittingState(true);
  try{
    // Flush any pending autosave first so the submitted doc has the latest text.
    if(pendingTimerRef.current){
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    await writeDraft(text); // ensures the doc exists and has the latest answers
    const id = submissionIdRef.current;
    if(!id) throw new Error("no submission id after flush");
    await studentSubmissionsCollection(studentId).doc(id).update({
      status: "submitted",
      submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    setLocalStatus("submitted");
    setSubmittedAt(new Date().toISOString()); // display-only until next reload re-reads the server value
  } catch(err){
    console.warn("[portal] submit error:", err);
    alert("Could not submit. Try again.");
  } finally {
    setSubmittingState(false);
  }
};
```

And simplify the JSX block back to:

```javascript
{!isLocked && (
  <div style={{marginTop:16, display:"flex", justifyContent:"flex-end", gap:12}}>
    <button
      disabled={!canSubmitDraft({status:"draft", responses:[{questionIndex:0, studentAnswer:text}]}) || submittingState}
      onClick={handleSubmit}
      style={(canSubmitDraft({status:"draft", responses:[{questionIndex:0, studentAnswer:text}]}) && !submittingState) ? SUBMIT_BTN_STYLE : SUBMIT_BTN_STYLE_DISABLED}
    >
      {submittingState ? "Submitting…" : "Submit"}
    </button>
  </div>
)}
```

- [ ] **Step 2: Rebuild + parse check**

```bash
python3 build_index.py
node --test tests/*.mjs
```
Expected: **60/60**.

- [ ] **Step 3: Commit**

```bash
git add app.jsx index.html
git commit -m "SubmissionEditor: submit-lock transitions draft to submitted"
git push
```

---

## 🛑 CHECKPOINT B — stop here, wait for Kiran

Full end-to-end flow verification. Kiran:

1. Hard-refresh `?dev=1&role=student&studentId=<id>` after a real sign-in.
2. Drill into an assignment. Type a few characters. Wait ~1 second.
3. Open Firebase Console → `/students/{id}/submissions/` — confirm a new doc appeared with `{assignmentId, responses:[{questionIndex:0, studentAnswer:"..."}], status:"draft", createdAt, updatedAt}`.
4. Type more. Wait. Confirm the same doc's `studentAnswer` and `updatedAt` update (no new doc).
5. Click Submit. Confirm button disables, doc flips to `status:"submitted"` with `submittedAt` stamped.
6. Reload the page. Navigate back to the same assignment. Confirm read-only view with "Submitted <date>" header and no textarea.
7. Flip to `role=parent&studentId=<id>` on a fresh tab. Navigate to the same assignment via View submission. Confirm read-only view renders. Confirm NO textarea and NO Submit button.
8. Confirm tutor `?dev=1` flow still clean.

If all checks pass, Session 5 is complete. If anything fails, stop and diagnose — do not close out.

---

## Task 10: Close out — write `docs/PHASE_2_SESSION_5.md`

After Kiran signs off on Checkpoint B.

**Files:**
- Create: `docs/PHASE_2_SESSION_5.md`

- [ ] **Step 1: Write the closeout doc**

Follow the structure of `docs/PHASE_2_SESSION_4.md`:
- Frontmatter + date
- What shipped (task list with commit hashes)
- What did not ship (tutor-side review, auto-grading, retake UI, saving badges, per-question parsing)
- Deviations from plan (if any — note them honestly, not performatively)
- Open questions and risks
- Checkpoint box
- **Kickoff prompt for Session 6** at the bottom (tutor missed-question review UI inside `StudentProfile`)

- [ ] **Step 2: Commit**

```bash
git add docs/PHASE_2_SESSION_5.md
git commit -m "Phase 2 Session 5 closeout"
git push
```

---

## Self-review notes

- **Spec coverage:** every item in the kickoff's "What's in scope" list maps to a task — (1) SubmissionEditor → Task 6, (2) useSubmissionDraft → Task 5, (3) draft autosave → Task 8, (4) submit-lock → Task 9, (5) role gate → Task 7 (parent path) + Task 6 (readOnly), (6) per-question entry → Decision 1 + Task 4, (7) test coverage → Tasks 2/3/4.
- **No placeholders.** Every step shows code or an exact command.
- **Type consistency:** `submissionIdRef`, `pendingTimerRef`, `isDirtyRef`, `writeDraft`, `handleSubmit`, `submittingState`, `localStatus`, `submittedAt` are named consistently across Tasks 6/8/9.
- **Frequent commits.** 9 commits over 9 work tasks, plus 1 closeout commit. Two hard checkpoints.
- **Rebuild step** is inside every task that touches `app.jsx`, per the Session 4 lesson.

---

**Plan complete.** Awaiting Kiran's approval before any code is written.
