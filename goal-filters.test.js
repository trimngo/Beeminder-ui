const assert = require('node:assert/strict');
const { safeDaysAtMost, compareTimeNeededToday } = require('./goal-filters.js');
const { projectedDeadlineOffsets } = require('./projection.js');

assert.equal(safeDaysAtMost({ safebuf: 2 }, ''), true);
assert.equal(safeDaysAtMost({ safebuf: 0 }, 0), true);
assert.equal(safeDaysAtMost({ safebuf: 1 }, 3), true);
assert.equal(safeDaysAtMost({ safebuf: 4 }, 3), false);

const quick = { slug: 'quick', rate: 1, runits: 'd', minutesPerUnit: 20, todayUnits: 0.5 };
const slow = { slug: 'slow', rate: 2, runits: 'd', minutesPerUnit: 15, todayUnits: 0 };
const unset = { slug: 'unset', minutesPerUnit: null };
assert.ok(compareTimeNeededToday(quick, slow, 'asc') < 0); // 10 minutes versus 30 minutes
assert.ok(compareTimeNeededToday(quick, slow, 'desc') > 0);
assert.ok(compareTimeNeededToday(unset, slow, 'asc') > 0);
assert.ok(compareTimeNeededToday(unset, slow, 'desc') > 0);
const projectedGoal = { slug: 'weekly', rate: 1, runits: 'w', safebuf: 2, quantum: 1, datapoints: [] };
assert.equal(require('./goal-filters.js').projectedOnDay(projectedGoal, 2, '20260829', projectedDeadlineOffsets), true);
assert.equal(require('./goal-filters.js').projectedOnDay(projectedGoal, 1, '20260829', projectedDeadlineOffsets), false);
const selectedDays = require('./goal-filters.js').projectedOnSelectedDays;
assert.equal(selectedDays(projectedGoal, [1, 2], '20260829', projectedDeadlineOffsets), true);
assert.equal(selectedDays(projectedGoal, [1, 3], '20260829', projectedDeadlineOffsets), false);
assert.equal(selectedDays({ ...projectedGoal, doneToday: true }, [0], '20260829', projectedDeadlineOffsets), true);
assert.equal(selectedDays({ ...projectedGoal, doneToday: true }, [1], '20260829', projectedDeadlineOffsets), false);
const matchesTags = require('./goal-filters.js').matchesTagStates;
assert.equal(matchesTags(['health', 'quick'], { health: 'include', deep: 'exclude' }), true);
assert.equal(matchesTags(['health', 'deep'], { health: 'include', deep: 'exclude' }), false);
assert.equal(matchesTags(['health'], { health: 'exclude' }), false);
assert.equal(matchesTags(['health'], { quick: 'include' }), false);

console.log('goal filter tests passed');
