const assert = require('node:assert/strict');
const { formatGoalRate, commitmentsMessage, withoutHashtags } = require('./accountability.js');

assert.equal(formatGoalRate({ rate: 5, runits: 'w' }), '5 times per week');
assert.equal(formatGoalRate({ rate: 1, runits: 'd' }), '7 times per week');
assert.equal(formatGoalRate({ rate: 0.5, runits: 'w' }), '1 time per 2 weeks');
assert.equal(formatGoalRate({ rate: 1, runits: 'm' }), '1 time per 4.35 weeks');
assert.equal(formatGoalRate({ rate: -1, runits: 'm' }), '-1 time per 4.35 weeks');
assert.equal(formatGoalRate({ rate: null, runits: 'w' }), 'Rate unavailable');
assert.equal(formatGoalRate({ runits: 'w' }), 'Rate unavailable');
assert.equal(commitmentsMessage([]), '');
assert.equal(withoutHashtags('Take a #health walk #outside'), 'Take a walk');
assert.equal(commitmentsMessage([
  { slug: 'walk', title: 'Take a #health walk', rate: 5, runits: 'w' },
  { slug: 'read', title: 'Read a book #learning', rate: 0.5, runits: 'w' }
]), 'My commitments:\n\n1. walk — Take a walk\n   Rate: 5 times per week\n\n2. read — Read a book\n   Rate: 1 time per 2 weeks');

console.log('accountability export tests passed');
