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
