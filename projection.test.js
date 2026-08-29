const assert = require('node:assert/strict');
const { estimatedActionValue, projectedDeadlineOffsets, projectedWorkloadDeadlineOffsets } = require('./projection.js');

const today = '20260822';
const goal = (rate, runits = 'w', datapoints = [{ daystamp: today, value: 1 }], extra = {}) =>
  ({ rate, runits, safebuf: 0, quantum: 0.01, datapoints, ...extra });
const offsets = input => [...projectedDeadlineOffsets(input, 30, today)];

assert.deepEqual(offsets(goal(5)).slice(0, 6), [0, 1, 2, 4, 5, 7]);
assert.deepEqual(offsets(goal(1)).slice(0, 5), [0, 7, 14, 21, 28]);
assert.deepEqual(offsets(goal(1, 'd')).slice(0, 5), [0, 1, 2, 3, 4]);
assert.deepEqual(offsets(goal(3)).slice(0, 5), [0, 2, 4, 7, 9]);
assert.deepEqual(offsets(goal(0)), [0]);
assert.deepEqual(offsets(goal(-1)), [0]);
assert.equal(estimatedActionValue(goal(5, 'w', [], { quantum: 0.25 }), today), 0.25);
assert.equal(estimatedActionValue(goal(5, 'w', [
  { daystamp: '20260820', value: 1 }, { daystamp: '20260819', value: 2 }, { daystamp: '20260818', value: 3 }
]), today), 2);
assert.deepEqual([...projectedWorkloadDeadlineOffsets(goal(5, 'w', [], { safebuf: 2, quantum: 0.01 }), 6, today)], [2, 4, 5]);
assert.deepEqual([...projectedWorkloadDeadlineOffsets(goal(4, 'd', [], { quantum: 0.01 }), 3, today)], [0, 1, 2, 3]);
const timestamp = day => Date.UTC(2026, 7, day) / 1000;
assert.deepEqual([...projectedWorkloadDeadlineOffsets(goal(7, 'w', [], {
  safebuf: 2,
  fullroad: [[timestamp(24), 0, 7], [timestamp(31), 0, 3.5]]
}), 8, today)], [2, 4, 6, 8]);
assert.deepEqual([...projectedWorkloadDeadlineOffsets(goal(5, 'w', [], {
  safebuf: 0,
  curval: 10,
  yaw: 1,
  fullroad: [[timestamp(22), 10.2, 5], [timestamp(29), 15.2, 5]]
}), 3, today)], [0, 2, 3]);
console.log('projection tests passed');
