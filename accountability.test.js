const assert = require('node:assert/strict');
const { formatGoalRate, commitmentsMessage, projectsDataExport, dailyPlanMessage, todayWinsMessage, withoutHashtags } = require('./accountability.js');

assert.equal(formatGoalRate({ rate: 5, runits: 'w' }), '5 times per week');
assert.equal(formatGoalRate({ rate: 1, runits: 'd' }), '7 times per week');
assert.equal(formatGoalRate({ rate: 0.5, runits: 'w' }), '1 time per 2 weeks');
assert.equal(formatGoalRate({ rate: 1, runits: 'm' }), '1 time per 4.35 weeks');
assert.equal(formatGoalRate({ rate: -1, runits: 'm' }), '-1 time per 4.35 weeks');
assert.equal(formatGoalRate({ rate: null, runits: 'w' }), 'Rate unavailable');
assert.equal(formatGoalRate({ runits: 'w' }), 'Rate unavailable');
assert.equal(commitmentsMessage([]), '');
assert.equal(withoutHashtags('Take a #health walk #outside'), 'Take a walk');
assert.equal(commitmentsMessage([
  { slug: 'walk', title: 'Take a #health walk', rate: 5, runits: 'w' },
  { slug: 'read', title: 'Read a book #learning', rate: 0.5, runits: 'w' }
]), 'My commitments:\n\n1. walk — Take a walk\n   Rate: 5 times per week\n\n2. read — Read a book\n   Rate: 1 time per 2 weeks');
assert.equal(todayWinsMessage([
  { slug: 'emails', title: 'reply to work emails', datapoints: [{ daystamp: '20260829', comment: 'Messaged Nadine\nAsked Fabio' }] },
  { slug: 'meditate', title: 'meditate for at least 20mins', datapoints: [{ daystamp: '20260829', comment: '' }] },
  { slug: 'old', title: 'not today', datapoints: [{ daystamp: '20260828', comment: 'Earlier' }] }
], '20260829'), 'Today’s wins\n\n1. emails — reply to work emails\n   - Messaged Nadine\n   - Asked Fabio\n\n2. meditate — meditate for at least 20mins');
assert.equal(todayWinsMessage([], '20260829'), '');

assert.equal(dailyPlanMessage([
  { slug: 'dara', title: 'Work on Anh Hai’s case', safebuf: 0, doneToday: false, rate: 2, runits: 'd', todayUnits: 1, minutesPerUnit: 30 },
  { slug: 'daily-plan', title: 'Send message to accountability buddy #planning', safebuf: -1, doneToday: false, rate: 1, runits: 'd', todayUnits: 0, minutesPerUnit: null },
  { slug: 'already-done', title: 'Finished task', safebuf: 0, doneToday: true, rate: 1, runits: 'd', minutesPerUnit: 20 },
  { slug: 'future', title: 'Not needed today', safebuf: 1, doneToday: false, rate: 1, runits: 'd', minutesPerUnit: 20 }
]), "*Today's plan*\n\n1. *Dara* — Work on Anh Hai’s case — *30 min*\n2. *Daily plan* — Send message to accountability buddy — *time not specified*");
assert.equal(dailyPlanMessage([]), '');

const completeExport = JSON.parse(projectsDataExport([{
  slug: 'write', title: 'Write a book', fineprint: 'At least 500 words', minutesPerUnit: 30,
  metadataTags: ['deep'], rate: 5, runits: 'w', deadline: -10800, safebuf: 2,
  fullroad: [[1700000000, 10, 5]], datapoints: [{ id: 'point-1', daystamp: '20261004', value: 500, comment: 'Chapter one' }]
}], { timeZone: 'America/Los_Angeles', complianceWindow: 7, complianceExclusions: ['vacation'] }, '2026-10-04T12:00:00.000Z'));
assert.equal(completeExport.format, 'bee-today-project-export');
assert.equal(completeExport.exportedAt, '2026-10-04T12:00:00.000Z');
assert.deepEqual(completeExport.context, { timeZone: 'America/Los_Angeles', complianceWindowDays: 7, complianceExclusions: ['vacation'] });
assert.equal(completeExport.projects[0].minutesPerUnit, 30);
assert.equal(completeExport.projects[0].fineprint, 'At least 500 words');
assert.deepEqual(completeExport.projects[0].datapoints, [{ id: 'point-1', daystamp: '20261004', value: 500, comment: 'Chapter one' }]);
assert.equal(projectsDataExport([]), '');

console.log('accountability export tests passed');
