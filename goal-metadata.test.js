const assert = require('node:assert/strict');
const { parse, serialize, normalizeTags, legacyTitleParts } = require('./goal-metadata.js');

assert.deepEqual(parse('Morning pages'), { rawTitle: 'Morning pages', title: 'Morning pages', minutes: null, tags: [], hasMetadata: false });
assert.deepEqual(parse('{"minutes":30,"tags":["writing","morning"]} Morning pages'), {
  rawTitle: '{"minutes":30,"tags":["writing","morning"]} Morning pages', title: 'Morning pages', minutes: 30, tags: ['writing', 'morning'], hasMetadata: true
});
assert.deepEqual(parse('{"m":30,"t":["writing"]} Morning pages'), {
  rawTitle: '{"m":30,"t":["writing"]} Morning pages', title: 'Morning pages', minutes: 30, tags: ['writing'], hasMetadata: true
});
assert.equal(parse('{"m":15} Read').minutes, 15);
assert.deepEqual(parse('{"t":["deep"]} Read').tags, ['deep']);
assert.equal(parse('{not json} Keep this visible').title, '{not json} Keep this visible');
assert.equal(parse('{"unrelated":true} Keep this visible').hasMetadata, false);
assert.equal(parse('{"minutes":0,"tags":[]} Invalid metadata').hasMetadata, false);
assert.deepEqual(normalizeTags(['#health', 'health', ' deep ', '']), ['health', 'deep']);
assert.deepEqual(legacyTitleParts('Take a walk #health #outside'), { title: 'Take a walk', tags: ['health', 'outside'] });
assert.deepEqual(legacyTitleParts('Write #morning pages'), { title: 'Write pages', tags: ['morning'] });
assert.equal(serialize('Strength training', '', ['#health', 'gym']), '{"t":["health","gym"]} Strength training');
assert.equal(serialize('Read', 12.5, ['learning']), '{"m":12.5,"t":["learning"]} Read');
assert.equal(serialize('Read', 12.5, []), '{"m":12.5} Read');
assert.equal(serialize('Read', '', []), 'Read');
assert.equal(serialize('First line\nSecond line', 10, []), '{"m":10} First line\nSecond line');
assert.equal(parse('{"m":10} First line\nSecond line').title, 'First line\nSecond line');
assert.throws(() => serialize('Read', 0, []), /greater than zero/);

console.log('goal metadata tests passed');
