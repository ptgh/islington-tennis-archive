import test from 'node:test';
import assert from 'node:assert/strict';
import { feedIsFresh, freeLabel, nextFreeByVenue, FEED_STALE_MS } from './freeCourts.ts';

const now = Date.parse('2026-10-10T14:20:00Z');
const slot = (venue_id: string, start_at: string, court_name: string, remaining_uses = 1) => ({ venue_id, start_at, court_name, remaining_uses });

test('next free court picks the earliest upcoming start and counts distinct courts at it', () => {
  const next = nextFreeByVenue([
    slot('highbury-fields', '2026-10-10T16:00:00Z', 'Court 1'),
    slot('highbury-fields', '2026-10-10T15:00:00Z', 'Court 2'),
    slot('highbury-fields', '2026-10-10T15:00:00Z', 'Court 3'),
    slot('highbury-fields', '2026-10-10T15:00:00Z', 'Court 3'),
    slot('highbury-fields', '2026-10-10T14:00:00Z', 'Court 4'),
    slot('islington-tennis-centre', '2026-10-10T15:00:00Z', 'Court 1', 0),
    slot('islington-tennis-centre', '2026-10-11T08:00:00Z', 'Court 2'),
  ], now);
  assert.deepEqual(next['highbury-fields'], { start: Date.parse('2026-10-10T15:00:00Z'), courts: 2 });
  assert.deepEqual(next['islington-tennis-centre'], { start: Date.parse('2026-10-11T08:00:00Z'), courts: 1 });
});

test('feed is trusted only when caught up and recently synced', () => {
  assert.equal(feedIsFresh({ last_success: '2026-10-10T14:15:02Z', caught_up: true }, now), true);
  assert.equal(feedIsFresh({ last_success: '2026-10-10T14:15:02Z', caught_up: false }, now), false);
  assert.equal(feedIsFresh({ last_success: new Date(now - FEED_STALE_MS - 1).toISOString(), caught_up: true }, now), false);
  assert.equal(feedIsFresh(null, now), false);
});

test('free label shows a London clock today and a weekday otherwise', () => {
  assert.equal(freeLabel(Date.parse('2026-10-10T15:00:00Z'), now), '16:00');
  assert.equal(freeLabel(Date.parse('2026-10-11T08:00:00Z'), now), 'Sun 09:00');
});
