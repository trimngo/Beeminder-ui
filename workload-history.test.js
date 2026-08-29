const assert = require('node:assert/strict');
const { workloadSeries, goalHue } = require('./workload-history.js');

const goals = [
  { slug: 'write', minutesPerUnit: 10, datapoints: [{ daystamp: '20260827', value: 2 }, { daystamp: '20260829', value: 1 }] },
  { slug: 'move', minutesPerUnit: 30, datapoints: [{ daystamp: '20260828', value: 1 }] },
  { slug: 'teachprep', rate: 4, runits: 'd', minutesPerUnit: 30, datapoints: [] },
  { slug: 'unset', minutesPerUnit: null, datapoints: [{ daystamp: '20260827', value: 99 }] }
];
const project = goal => new Set(goal.slug === 'write' ? [1, 3] : goal.slug === 'move' ? [2] : goal.slug === 'teachprep' ? [1, 2, 3] : []);
const series = workloadSeries(goals, '20260829', 3, project);
assert.equal(series.length, 17);
assert.equal(series[0].daystamp, '20260816');
assert.deepEqual(series.find(day => day.daystamp === '20260827').components, [{ slug: 'write', minutes: 20 }]);
assert.equal(series.find(day => day.daystamp === '20260828').actual, 30);
assert.equal(series.find(day => day.today).daystamp, '20260829');
assert.deepEqual(series.at(-3).components, [{ slug: 'write', minutes: 10 }, { slug: 'teachprep', minutes: 120 }]);
assert.deepEqual(series.at(-2).components, [{ slug: 'move', minutes: 30 }, { slug: 'teachprep', minutes: 120 }]);
assert.deepEqual(series.at(-1).components, [{ slug: 'write', minutes: 10 }, { slug: 'teachprep', minutes: 120 }]);
assert.equal(series.find(day => day.daystamp === '20260828').mean, 50 / 7);
assert.ok(series.find(day => day.daystamp === '20260828').upper > series.find(day => day.daystamp === '20260828').mean);
assert.equal(goalHue('write'), goalHue('write'));
assert.notEqual(goalHue('write'), goalHue('move'));
console.log('workload history tests passed');
