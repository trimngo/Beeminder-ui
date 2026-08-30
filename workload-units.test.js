const assert = require('node:assert/strict');
const workload = require('./workload-units.js');

assert.equal(workload.dailyTarget({ rate: 4, runits: 'd' }), 4);
assert.equal(workload.unitsForWorkBlock({ rate: 4, runits: 'd' }), 4);
assert.equal(workload.minutesForWorkBlock({ rate: 4, runits: 'd', minutesPerUnit: 30 }), 120);
assert.equal(workload.unitsForWorkBlock({ rate: 5, runits: 'w' }), 1);
assert.equal(workload.minutesForWorkBlock({ rate: 5, runits: 'w', minutesPerUnit: 30 }), 30);
assert.equal(workload.unitsForWorkBlock({ rate: 0, runits: 'd' }), 1);
const teachprep = { rate: 4, runits: 'd', minutesPerUnit: 30, datapoints: [{ daystamp: '20260830', value: 1 }] };
assert.equal(workload.enteredUnitsOnDay(teachprep, '20260830'), 1);
assert.equal(workload.isWorkBlockComplete(teachprep, '20260830'), false);
assert.equal(workload.remainingUnitsForWorkBlock({ ...teachprep, todayUnits: 1 }), 3);
assert.equal(workload.minutesForRemainingWorkBlock({ ...teachprep, todayUnits: 1 }), 90);
teachprep.datapoints.push({ daystamp: '20260830', value: 3 });
assert.equal(workload.isWorkBlockComplete(teachprep, '20260830'), true);
assert.equal(workload.isWorkBlockComplete({ rate: 1, runits: 'd', datapoints: [{ daystamp: '20260830', value: 0.5 }] }, '20260830'), false);
assert.equal(workload.isWorkBlockComplete({ rate: 0, runits: 'd', datapoints: [{ daystamp: '20260830', value: 0 }] }, '20260830'), true);

console.log('workload unit tests passed');
