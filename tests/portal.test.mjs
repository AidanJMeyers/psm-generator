import test from 'node:test';
import assert from 'node:assert/strict';

// Pure helpers copied out of app.jsx for node --test. Keep in sync manually.
// Matches the pattern used by tests/diagnostic.test.mjs.

function pickPortalStudentId(entry){
  if(!entry) return "";
  const ids = Array.isArray(entry.studentIds) ? entry.studentIds : [];
  return ids[0] || "";
}

test('pickPortalStudentId: null entry → empty string', () => {
  assert.equal(pickPortalStudentId(null), "");
});

test('pickPortalStudentId: missing studentIds → empty string', () => {
  assert.equal(pickPortalStudentId({role:"student"}), "");
});

test('pickPortalStudentId: empty studentIds → empty string', () => {
  assert.equal(pickPortalStudentId({role:"student", studentIds:[]}), "");
});

test('pickPortalStudentId: single studentId → that id', () => {
  assert.equal(pickPortalStudentId({role:"student", studentIds:["abc123"]}), "abc123");
});

test('pickPortalStudentId: multiple studentIds → first one (Session 4 adds switcher)', () => {
  assert.equal(pickPortalStudentId({role:"parent", studentIds:["kid1","kid2"]}), "kid1");
});
