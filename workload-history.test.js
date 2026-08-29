const assert = require('node:assert/strict');
const { workloadSeries } = require('./workload-history.js');

const goals = [
  { minutesPerUnit: 10, datapoints: [{ daystamp: '20260827', value: 2 }, { daystamp: '20260829', value: 1 }] },
  { minutesPerUnit: 30, datapoints: [{ daystamp: '20260828', value: 1 }] },
  { minutesPerUnit: null, datapoints: [{ daystamp: '20260827', value: 99 }] }
];
const project = goal => new Set(goal.minutesPerUnit === 10 ? [1, 3] : [2]);
assert.deepEqual(workloadSeries(goals, '20260829', 3, project), [
  { daystamp: '20260827', actual: 20, predicted: 0, today: false },
  { daystamp: '20260828', actual: 30, predicted: 0, today: false },
  { daystamp: '20260829', actual: 10, predicted: 0, today: true },
  { daystamp: '20260830', actual: 0, predicted: 10, today: false },
  { daystamp: '20260831', actual: 0, predicted: 30, today: false },
  { daystamp: '20260901', actual: 0, predicted: 10, today: false }
]);
console.log('workload history tests passed');
