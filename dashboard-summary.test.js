const assert = require('node:assert/strict');
const summary = require('./dashboard-summary.js');

const goals = [
  { safebuf: 0, doneToday: false, minutesPerUnit: 30, quantum: 1, datapoints: [{ comment: '#DERAIL' }] },
  { safebuf: -1, doneToday: false, minutesPerUnit: 15, quantum: 2, datapoints: [{ derail: true }] },
  { safebuf: 1, doneToday: false, minutesPerUnit: 90, quantum: 1, datapoints: [] },
  { safebuf: 0, doneToday: true, minutesPerUnit: 60, quantum: 1, datapoints: [] },
  { safebuf: 0, doneToday: false, minutesPerUnit: null, quantum: 1, datapoints: [] }
];

assert.equal(summary.estimatedMinutesToSafety(goals), 60);
assert.equal(summary.goalsMissingTimeToSafety(goals), 1);
assert.equal(summary.totalPenalties(goals, points => points.filter(point => point.derail || point.comment === '#DERAIL').length), 10);
assert.equal(summary.formatDuration(45), '45 min');
assert.match(summary.formatDuration(90), /^1[.,]5 hr$/);
assert.equal(summary.formatDuration(0), '0 min');

console.log('dashboard summary tests passed');
