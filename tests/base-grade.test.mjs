import assert from 'node:assert/strict';
import test from 'node:test';
import { Store } from '../server/store.mjs';
import { execute } from '../shared/domain.mjs';
import { ensureRecordReferences } from '../shared/references.mjs';
import { createSeed } from '../shared/seed.mjs';

function fixture() {
  const state = createSeed('2026-09-11');
  const actor = state.users.find(user => user.role === 'ADMIN');
  const base = state.bases.find(row => row.code === 'PW12');
  const [first, blank, already] = state.items.filter(row => row.baseId === base.id);
  base.grade = first.grade = 'PRIME';
  delete blank.grade;
  already.grade = 'REGAL';
  const otherScope = { ...first, id: 'other-grade-scope', code: 'OTHER-PW12', scope: 'LAE_DOMESTIC', grade: 'ELITE' };
  state.items.push(otherScope);
  ensureRecordReferences(state);
  return { state, actor, base, first, blank, already };
}

const saveGrade = (base, grade = 'REGAL', expectedGrade = 'PRIME') => ({
  type: 'SAVE_BASE_META', payload: { baseId: base.id, grade, expectedGrade },
});

test('grade propagates only to linked LAE Import variants with prior or blank grades', () => {
  const { state, actor, base, first, blank, already } = fixture();
  const saved = execute(state, saveGrade(base, ' regal ', 'prime'), actor).state;
  const ids = new Set([first.id, blank.id]);
  assert.deepEqual({ ...saved, events: state.events, revision: state.revision }, {
    ...state,
    bases: state.bases.map(row => row.id === base.id ? { ...row, grade: 'REGAL' } : row),
    items: state.items.map(row => ids.has(row.id) ? { ...row, grade: 'REGAL' } : row),
  });
  assert.equal(saved.revision, state.revision + 1);
  assert.deepEqual(saved.events.slice(0, state.events.length), state.events);
  const added = saved.events.slice(state.events.length);
  assert.deepEqual(added.map(event => [event.entityType, event.entityId, event.action]), [
    ['base', base.id, 'PLM_PRODUCT_UPDATED'],
    ['item', first.id, 'ITEM_GRADE_UPDATED'],
    ['item', blank.id, 'ITEM_GRADE_UPDATED'],
  ]);
  for (const [index, old] of [base, first, blank].entries()) {
    assert.deepEqual(added[index].oldValue, old);
    assert.deepEqual(added[index].newValue, { ...old, grade: 'REGAL' });
  }
  assert.deepEqual(saved.items.find(row => row.id === already.id), already);
});

test('a divergent linked variant or stale prior grade rejects the entire update', () => {
  const { state, actor, base, already } = fixture();
  already.grade = 'ELITE';
  const before = structuredClone(state);
  assert.throws(() => execute(state, saveGrade(base), actor),
    error => error.code === 'CONFLICT' && error.message.includes(already.code));
  assert.throws(() => execute(state, saveGrade(base, 'REGAL', 'ELITE'), actor),
    error => error.code === 'CONFLICT' && /base grade changed/.test(error.message));
  assert.deepEqual(state, before);
});

test('initial and repeated grades create audit events only for records that change', () => {
  const { state, actor, base, first, blank, already } = fixture();
  delete base.grade;
  delete first.grade;
  const command = saveGrade(base, 'REGAL', '');
  const saved = execute(state, command, actor).state;
  const added = saved.events.slice(state.events.length);
  assert.deepEqual(added.map(event => event.entityId), [base.id, first.id, blank.id]);
  assert.ok(added.every(event => event.oldValue.grade === undefined && event.newValue.grade === 'REGAL'));
  assert.equal(saved.items.find(item => item.id === already.id).grade, 'REGAL');
  const repeated = execute(saved, saveGrade(base, 'REGAL', 'REGAL'), actor).state;
  assert.deepEqual(repeated.events, saved.events);
  assert.deepEqual(repeated.bases, saved.bases);
  assert.deepEqual(repeated.items, saved.items);
});

test('existing metadata edits keep their behavior and grade edits require valid inputs and access', () => {
  const { state, actor, base } = fixture();
  const lastEvent = execute(state, { type: 'SAVE_BASE_META', payload: { baseId: base.id, productName: 'Updated name' } }, actor)
    .state.events.at(-1);
  assert.equal(lastEvent.newValue.productName, 'Updated name');
  assert.equal(lastEvent.newValue.grade, 'PRIME');
  for (const input of [{ grade: 'REGAL' }, { grade: null, expectedGrade: 'PRIME' }, { grade: ' ', expectedGrade: 'PRIME' }]) {
    assert.throws(() => execute(state, { type: 'SAVE_BASE_META', payload: { baseId: base.id, ...input } }, actor),
      error => error.code === 'VALIDATION');
  }
  const viewer = { ...actor, role: 'VIEWER' };
  assert.throws(() => execute(state, saveGrade(base), viewer), error => error.code === 'FORBIDDEN');
  base.scope = 'LAE_DOMESTIC';
  assert.throws(() => execute(state, saveGrade(base), actor), /LAE Import products only/);
});

test('SQLite replay does not duplicate grade events and fresh stale requests roll back', () => {
  const { state, actor, base } = fixture();
  const store = new Store(':memory:', state);
  try {
    const command = saveGrade(base);
    const revision = store.revision();
    const before = store.read();
    const first = store.transact(command, actor.id, revision, 'grade-save-request-1');
    const replay = store.transact(command, actor.id, revision, 'grade-save-request-1');
    assert.equal(replay.replayed, true);
    assert.deepEqual(replay.state, first.state);
    assert.equal(store.revision(), revision + 1);
    assert.equal(first.state.events.length - before.events.length, 3);
    assert.throws(() => store.transact(command, actor.id, store.revision(), 'grade-save-request-2'),
      error => error.code === 'CONFLICT' && /base grade changed/.test(error.message));
    assert.throws(() => store.transact(saveGrade(base, 'ELITE', 'REGAL'), actor.id, revision, 'grade-save-request-1'),
      error => error.code === 'CONFLICT' && /different content/.test(error.message));
    assert.deepEqual(store.read(), first.state);
    assert.equal(store.requestReceipt(actor.id, 'grade-save-request-2'), undefined);
  } finally {
    store.close();
  }
});
