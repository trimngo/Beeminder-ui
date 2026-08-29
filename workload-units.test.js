const assert = require('node:assert/strict');
const workload = require('./workload-units.js');

assert.equal(workload.dailyTarget({ rate: 4, runits: 'd' }), 4);
assert.equal(workload.unitsForWorkBlock({ rate: 4, runits: 'd' }), 4);
assert.equal(workload.minutesForWorkBlock({ rate: 4, runits: 'd', minutesPerUnit: 30 }), 120);
assert.equal(workload.unitsForWorkBlock({ rate: 5, runits: 'w' }), 1);
assert.equal(workload.minutesForWorkBlock({ rate: 5, runits: 'w', minutesPerUnit: 30 }), 30);
assert.equal(workload.unitsForWorkBlock({ rate: 0, runits: 'd' }), 1);

console.log('workload unit tests passed');
