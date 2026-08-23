const assert = require('node:assert/strict');
const { countDerails, totalPaid, isRecordedDerail } = require('./goal-stats.js');

assert.equal(isRecordedDerail({ is_derail: true }), true);
assert.equal(isRecordedDerail({ comment: '#DERAIL 2025-01-01' }), true);
assert.equal(isRecordedDerail({ comment: 'Nearly derailed, but recovered' }), false);
assert.equal(countDerails([{ comment: '#DERAIL' }, { derail: true }, { comment: 'ordinary entry' }]), 2);
assert.equal(totalPaid(0), 0);
assert.equal(totalPaid(1), 5);
assert.equal(totalPaid(3), 15);
assert.equal(totalPaid(7), 35);
assert.equal(totalPaid(-1), null);

console.log('goal stats tests passed');
