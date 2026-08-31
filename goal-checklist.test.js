const assert = require('node:assert/strict');
const checklist = require('./goal-checklist.js');

const parsed = checklist.parse('Weekly review\n- [ ] Clear inbox\n* [x] Plan tomorrow');
assert.equal(parsed.description, 'Weekly review');
assert.deepEqual(parsed.items, ['Clear inbox', 'Plan tomorrow']);

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
checklist.setChecked(storage, 'alice', 'review', parsed.signature, [1, 0, 1]);
assert.deepEqual(checklist.checkedItems(storage, 'alice', 'review', parsed.signature), [0, 1]);
assert.deepEqual(checklist.checkedItems(storage, 'bob', 'review', parsed.signature), []);

const edited = checklist.parse('Weekly review\n- [ ] Clear inbox\n- [ ] File notes');
assert.deepEqual(checklist.checkedItems(storage, 'alice', 'review', edited.signature), []);
checklist.setChecked(storage, 'alice', 'review', edited.signature, [0]);
checklist.clear(storage, 'alice', 'review');
assert.deepEqual(checklist.checkedItems(storage, 'alice', 'review', edited.signature), []);

console.log('goal checklist tests passed');
