const assert = require('node:assert/strict');
const { queryTokens, goalTags, matchesGoalQuery } = require('./goal-search.js');

const metadataGoal = { slug: 'walk', title: 'Take a walk', fineprint: 'Go outside', hasMetadata: true, metadataTags: ['Health', 'outside'], doneToday: false };
const legacyGoal = { slug: 'read', title: 'Read a book #learning #deep', fineprint: '', hasMetadata: false, metadataTags: [], doneToday: true };

assert.deepEqual(queryTokens('#health -#work "take a walk"'), ['#health', '-#work', 'take a walk']);
assert.deepEqual(goalTags(metadataGoal), ['health', 'outside']);
assert.deepEqual(goalTags(legacyGoal), ['learning', 'deep']);
assert.equal(matchesGoalQuery(metadataGoal, '#health'), true);
assert.equal(matchesGoalQuery(metadataGoal, '#heal'), false);
assert.equal(matchesGoalQuery(metadataGoal, '-#health'), false);
assert.equal(matchesGoalQuery(metadataGoal, '#health -#work'), true);
assert.equal(matchesGoalQuery(metadataGoal, '#health #outside'), true);
assert.equal(matchesGoalQuery(metadataGoal, '#health #deep'), false);
assert.equal(matchesGoalQuery(legacyGoal, '#deep done:today'), true);
assert.equal(matchesGoalQuery(legacyGoal, '-#deep'), false);
assert.equal(matchesGoalQuery(metadataGoal, 'walk outside'), true);

console.log('goal search tests passed');
