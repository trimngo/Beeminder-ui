const assert = require('node:assert/strict');
const summary = require('./dashboard-summary.js');
const projection = require('./projection.js');

const goals = [
  { safebuf: 0, doneToday: false, minutesPerUnit: 30, quantum: 1, datapoints: [{ comment: '#DERAIL' }] },
  { safebuf: -1, doneToday: false, minutesPerUnit: 15, quantum: 2, datapoints: [{ derail: true }] },
  { safebuf: 1, doneToday: false, minutesPerUnit: 90, quantum: 1, datapoints: [] },
  { safebuf: 0, doneToday: true, minutesPerUnit: 60, quantum: 1, datapoints: [] },
  { safebuf: 0, doneToday: false, minutesPerUnit: null, quantum: 1, datapoints: [] }
];

assert.equal(summary.estimatedMinutesToSafety(goals), 60);
assert.equal(summary.goalsMissingTimeToSafety(goals), 1);
assert.equal(summary.estimatedMinutesForGoals(goals), 210);
assert.equal(summary.goalsMissingTime(goals), 1);
assert.deepEqual(summary.workloadBreakdown(goals, true), [
  { slug: '', value: 30 }, { slug: '', value: 30 }
]);
assert.deepEqual(summary.workloadBreakdown(goals), [
  { slug: '', value: 90 }, { slug: '', value: 60 }, { slug: '', value: 30 }, { slug: '', value: 30 }
]);
assert.deepEqual(summary.penaltyBreakdown(goals, points => points.filter(point => point.derail || point.comment === '#DERAIL').length), [
  { slug: '', value: 5 }, { slug: '', value: 5 }
]);
const forecastGoals = [
  { rate: 1, runits: 'd', safebuf: 0, minutesPerUnit: 20, quantum: 1, doneToday: false, datapoints: [] },
  { rate: 1, runits: 'w', safebuf: 2, minutesPerUnit: 30, quantum: 1, doneToday: false, datapoints: [] },
  { rate: 1, runits: 'd', safebuf: 0, minutesPerUnit: 10, quantum: 1, doneToday: true, datapoints: [] }
];
assert.deepEqual(summary.sevenDayWorkload(forecastGoals, '20260829', projection.projectedWorkloadDeadlineOffsets), [20, 30, 60, 30, 30, 30, 30]);
assert.deepEqual(summary.sevenDayCommitmentCounts(forecastGoals, '20260829', projection.projectedWorkloadDeadlineOffsets), [1, 2, 3, 2, 2, 2, 2]);
const stableForecastGoal = { rate: 2, runits: 'w', safebuf: 1, minutesPerUnit: 15, quantum: 1, doneToday: false, datapoints: [] };
const beforeEntry = summary.sevenDayWorkload([stableForecastGoal], '20260829', projection.projectedWorkloadDeadlineOffsets);
stableForecastGoal.datapoints.push({ daystamp: '20260829', value: 20 });
assert.deepEqual(summary.sevenDayWorkload([stableForecastGoal], '20260829', projection.projectedWorkloadDeadlineOffsets), beforeEntry);
const preciseEmailGoal = { rate: 5, runits: 'w', safebuf: 2, minutesPerUnit: 10, quantum: 0.01, doneToday: false, datapoints: [] };
assert.deepEqual(summary.sevenDayWorkload([preciseEmailGoal], '20260829', projection.projectedWorkloadDeadlineOffsets), [0, 0, 10, 0, 10, 10, 0]);
assert.equal(summary.formatCompactDuration(0), '0m');
assert.equal(summary.formatCompactDuration(45), '45m');
assert.match(summary.formatCompactDuration(90), /^1[.,]5h$/);
assert.equal(summary.totalPenalties(goals, points => points.filter(point => point.derail || point.comment === '#DERAIL').length), 10);
assert.equal(summary.formatDuration(45), '45 min');
assert.match(summary.formatDuration(90), /^1[.,]5 hr$/);
assert.equal(summary.formatDuration(0), '0 min');
assert.equal(summary.remainingWorkdaySeconds(new Date('2026-08-29T20:00:00Z'), 'UTC'), 3600);
assert.equal(summary.remainingWorkdaySeconds(new Date('2026-08-29T22:00:00Z'), 'UTC'), 0);
assert.equal(summary.remainingWorkdaySeconds(new Date('2026-08-29T23:00:00Z'), 'America/New_York'), 7200);
assert.equal(summary.formatCountdown(3671), '1:01:11');
assert.equal(summary.formatCountdown(0), '0:00:00');
assert.equal(summary.workdayCountdownStatus(7201, 60), 'safe');
assert.equal(summary.workdayCountdownStatus(7200, 60), 'warning');
assert.equal(summary.workdayCountdownStatus(3600, 60), 'danger');
assert.equal(summary.workdayCountdownStatus(0, 60), 'expired');
assert.deepEqual(summary.workdayProgress(6.5 * 3600, 60), { remainingPercent: 50, requiredPercent: 100 / 13, warningPercent: 200 / 13 });
assert.deepEqual(summary.workdayProgress(99 * 3600, 99 * 60), { remainingPercent: 100, requiredPercent: 100, warningPercent: 100 });

console.log('dashboard summary tests passed');
