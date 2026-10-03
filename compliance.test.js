const assert = require('node:assert/strict');
const compliance = require('./compliance.js');

assert.deepEqual(compliance.parseExclusions(' vacation, Travel\nSICK , vacation '), ['vacation', 'travel', 'sick']);
assert.deepEqual(compliance.parseExclusions(''), []);
assert.equal(compliance.excludedTerm({ comment: 'On VACATION this week' }, ['vacation']), 'vacation');
assert.equal(compliance.excludedTerm({ comment: 'Business travel day' }, ['vacation', 'travel']), 'travel');
assert.equal(compliance.excludedTerm({ comment: 'Ordinary work' }, ['vacation']), null);
assert.equal(compliance.isExcluded({ comment: 'Vacation' }), true);
assert.equal(compliance.isExcluded({ comment: null }), false);
assert.deepEqual(compliance.sumIncludedValues([
  { daystamp: '20260901', value: 2, comment: 'normal work' },
  { daystamp: '20260902', value: 50, comment: 'Vacation credit' },
  { daystamp: '20260801', value: 99, comment: '' },
  { daystamp: '20260903', value: '3', comment: 'back at it' }
], ['vacation'], '20260901', '20260914'), { total: 5, excluded: 1 });

console.log('compliance exclusion tests passed');

const goal = { kyoom: true, rate: 7, runits: 'w', datapoints: [
  { daystamp: '20260925', value: 7, comment: '' },
  { daystamp: '20260926', value: 70, comment: 'Vacation credit' },
  { daystamp: '20261001', value: 7, comment: '' },
  { daystamp: '20261002', value: 7, comment: '' }
] };
assert.deepEqual(compliance.rollingPerformance(goal, '20261002', 7, ['vacation']), { actual: 2, target: 1, compliance: 2, miss: -1, excluded: 1 });
assert.equal(compliance.rollingPerformance(goal, '20261002', 1, []).compliance, 7);
assert.equal(compliance.rollingPerformance(goal, '20260930', 7, []).compliance, 11);
assert.equal(compliance.rollingPerformance({ ...goal, datapoints: [] }, '20261002', 7).compliance, 0);
assert.equal(compliance.rollingPerformance({ ...goal, rate: -7, datapoints: [{ daystamp: '20261002', value: -7 }] }, '20261002', 7).compliance, 1);
assert.equal(compliance.rollingPerformance({ ...goal, kyoom: false }, '20261002', 7).compliance, null);
assert.equal(compliance.rollingPerformance({ ...goal, rate: 0 }, '20261002', 7).compliance, null);
assert.equal(compliance.rollingPerformance(goal, '20261002', 0).compliance, null);
assert.equal(compliance.shiftDaystamp('20260308', -1), '20260307');
assert.equal(compliance.shiftDaystamp('20261101', -1), '20261031');
assert.deepEqual(compliance.rollingSeries(goal, '20261001', '20261002', 7, ['vacation']).map(item => item.daystamp), ['20261001', '20261002']);
console.log('rolling compliance tests passed');
