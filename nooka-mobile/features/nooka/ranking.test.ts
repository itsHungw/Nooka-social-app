const assert = require('node:assert/strict');
const test = require('node:test');
const { explainTags, matchTags, rankSpots, spotTags } = require('./ranking.ts');

const synonyms = {
  quiet: ['quiet'],
  workFriendly: ['work', 'laptop'],
  openLate: ['late night', 'late'],
  niceView: ['view'],
};

test('matches tags from free text and from the picked intent', () => {
  assert.deepEqual(matchTags('somewhere quiet', synonyms).sort(), ['quiet']);
  assert.deepEqual(matchTags('', synonyms, 'lateNight').sort(), ['fast', 'openLate']);
  assert.deepEqual(matchTags('QUIET corner', synonyms, 'work').sort(), ['quiet', 'workFriendly']);
  assert.deepEqual(matchTags('   ', synonyms), []);
});

test('ranks the spot whose tags match the question first', () => {
  assert.equal(rankSpots(matchTags('quiet work', synonyms))[0], 'workshop');
  assert.equal(rankSpots(matchTags('late night', synonyms))[0], 'muoi43');
  assert.equal(rankSpots(matchTags('view', synonyms))[0], 'bloom');
  assert.equal(rankSpots([], {}, 2).length, 2);
});

test('user tags added after check-in move a spot up', () => {
  const quiet = matchTags('quiet', synonyms);
  assert.notEqual(rankSpots(quiet)[0], 'sansau');
  assert.equal(rankSpots(quiet, { sansau: { quiet: 400 } })[0], 'sansau');
  assert.equal(spotTags('sansau', { sansau: { quiet: 400 } })[0].count, 401);
  assert.equal(spotTags('sansau', { sansau: { outdoor: 2 } }).some((tag: { id: string }) => tag.id === 'outdoor'), true);
});

test('explanation puts the matched tag first', () => {
  assert.equal(explainTags('workshop', ['outdoor'])[0].id, 'outdoor');
  assert.equal(explainTags('workshop', [])[0].id, 'quiet');
});
