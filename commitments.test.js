const assert = require('node:assert/strict');
const C = require('./commitments');
const config = { version: 1, commitments: [
  { id: 'walk', name: 'Walk', days: [4], deadline: '21:00', strict: false },
  { id: 'write', name: 'Write', days: [4], deadline: '09:00', strict: true, unlockSecret: 'secret' }
] };
const morning = new Date(2026, 9, 1, 8, 0);
const night = new Date(2026, 9, 1, 22, 0);
assert.deepEqual(C.decode(C.encode(config)), C.normalize(config));
assert.equal(C.aggregate(config, { walk: 'completed', write: 'snoozed' }, morning).score, 1);
assert.equal(C.aggregate(config, { walk: 'completed' }, morning).strictFailure, false);
assert.equal(C.aggregate(config, { walk: 'completed' }, night).strictFailure, true);
assert.equal(C.aggregate(config, { walk: 'completed' }, night).score, 0);
assert.equal(C.requestId('20261001'), 'bee-commit-v1-20261001');
console.log('commitments tests passed');
