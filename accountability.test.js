const assert = require('node:assert/strict');
const { formatGoalRate, commitmentsMessage } = require('./accountability.js');

assert.equal(formatGoalRate({ rate: 5, runits: 'w' }), '5 times per week');
assert.equal(formatGoalRate({ rate: 1, runits: 'd' }), '1 time per day');
assert.equal(formatGoalRate({ rate: 1.5, runits: 'm' }), '1.5 times per month');
assert.equal(formatGoalRate({ rate: null, runits: 'w' }), 'Rate unavailable');
assert.equal(formatGoalRate({ runits: 'w' }), 'Rate unavailable');
assert.equal(commitmentsMessage([]), '');
assert.equal(commitmentsMessage([
  { slug: 'walk', title: 'Take a walk', rate: 5, runits: 'w' },
  { slug: 'read', title: 'Read a book', rate: 1, runits: 'd' }
]), 'My commitments:\n\n1. walk — Take a walk\n   Rate: 5 times per week\n\n2. read — Read a book\n   Rate: 1 time per day');

console.log('accountability export tests passed');
