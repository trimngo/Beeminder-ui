const assert = require('node:assert/strict');
const { countDerails, estimatedPaid, isRecordedDerail } = require('./goal-stats.js');

assert.equal(isRecordedDerail({ is_derail: true }), true);
assert.equal(isRecordedDerail({ comment: '#DERAIL 2025-01-01' }), true);
assert.equal(isRecordedDerail({ comment: 'Nearly derailed, but recovered' }), false);
assert.equal(countDerails([{ comment: '#DERAIL' }, { derail: true }, { comment: 'ordinary entry' }]), 2);
assert.equal(estimatedPaid(3, 30), 15);
assert.equal(estimatedPaid(1, 5), 0);
assert.equal(estimatedPaid(7, 810), 1215);
assert.equal(estimatedPaid(3, 12), null);
assert.equal(estimatedPaid(4, 30), null);

console.log('goal stats tests passed');
