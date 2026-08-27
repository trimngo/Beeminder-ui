const assert = require('node:assert/strict');
const calendar = require('./google-calendar.js');

assert.deepEqual(calendar.addMinutes('2026-08-27', '09:45', 30), { date: '2026-08-27', time: '10:15' });
assert.deepEqual(calendar.addMinutes('2026-08-27', '23:45', 30), { date: '2026-08-28', time: '00:15' });
assert.throws(() => calendar.addMinutes('2026-08-27', '09:00', 0), /greater than zero/);

const url = new URL(calendar.eventUrl({
  title: 'Morning pages & review', date: '2026-08-27', time: '09:00', duration: 30,
  timeZone: 'America/New_York', details: 'morning-pages\nSafe for 2 days'
}));
assert.equal(url.origin, 'https://calendar.google.com');
assert.equal(url.searchParams.get('action'), 'TEMPLATE');
assert.equal(url.searchParams.get('text'), 'Morning pages & review');
assert.equal(url.searchParams.get('dates'), '20260827T090000/20260827T093000');
assert.equal(url.searchParams.get('ctz'), 'America/New_York');
assert.equal(url.searchParams.get('details'), 'morning-pages\nSafe for 2 days');

console.log('Google Calendar tests passed');
