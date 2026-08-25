const assert = require('node:assert/strict');
const { safeDaysAtMost, compareMinutesPerUnit } = require('./goal-filters.js');

assert.equal(safeDaysAtMost({ safebuf: 2 }, ''), true);
assert.equal(safeDaysAtMost({ safebuf: 0 }, 0), true);
assert.equal(safeDaysAtMost({ safebuf: 1 }, 3), true);
assert.equal(safeDaysAtMost({ safebuf: 4 }, 3), false);

const quick = { slug: 'quick', minutesPerUnit: 5 };
const slow = { slug: 'slow', minutesPerUnit: 45 };
const unset = { slug: 'unset', minutesPerUnit: null };
assert.ok(compareMinutesPerUnit(quick, slow, 'asc') < 0);
assert.ok(compareMinutesPerUnit(quick, slow, 'desc') > 0);
assert.ok(compareMinutesPerUnit(unset, slow, 'asc') > 0);
assert.ok(compareMinutesPerUnit(unset, slow, 'desc') > 0);

console.log('goal filter tests passed');
