import assert from 'node:assert/strict';
import test from 'node:test';

import { audienceCanPost, toggleAudienceFriend } from './checkin-audience.ts';

test('selected-friends visibility requires at least one friend', () => {
  assert.equal(audienceCanPost('SELECTED_FRIENDS', []), false);
  assert.equal(audienceCanPost('SELECTED_FRIENDS', ['linh']), true);
  assert.equal(audienceCanPost('FOLLOWERS', []), true);
});

test('tapping a friend toggles only that friend', () => {
  assert.deepEqual(toggleAudienceFriend(['linh'], 'nam'), ['linh', 'nam']);
  assert.deepEqual(toggleAudienceFriend(['linh', 'nam'], 'linh'), ['nam']);
});
