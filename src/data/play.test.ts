import test from 'node:test';
import assert from 'node:assert/strict';
import { playOpportunities, filterPlayOpportunities, playVenueCounts } from './play.ts';
import { venues } from './venues.ts';

test('community listings point only to known courts and sourced organiser handoffs', () => {
  assert.equal(new Set(playOpportunities.map(item => item.id)).size, playOpportunities.length);
  for (const item of playOpportunities) {
    assert.ok(item.venueIds.length > 0);
    for (const id of item.venueIds) assert.ok(venues.some(venue => venue.id === id), id);
    assert.equal(new URL(item.url).protocol, 'https:');
    assert.ok(item.sources.some(source => source.url === item.url));
  }
});

test('court and activity filters combine without inventing options at other courts', () => {
  assert.deepEqual(filterPlayOpportunities(playOpportunities, 'social', 'rosemary-gardens').map(item => item.id), ['rosemary-lobsters']);
  assert.deepEqual(filterPlayOpportunities(playOpportunities, 'partners', 'rosemary-gardens').map(item => item.id), ['local-tennis-leagues']);
  assert.equal(filterPlayOpportunities(playOpportunities, 'all', 'tufnell-park').length, 0);
  assert.equal(filterPlayOpportunities(playOpportunities, 'all', null).length, playOpportunities.length);
});

test('map counts count each programme once per court and respond to activity filters', () => {
  assert.deepEqual(playVenueCounts(playOpportunities), {'highbury-fields':3,'islington-tennis-centre':3,'rosemary-gardens':2});
  assert.deepEqual(playVenueCounts(filterPlayOpportunities(playOpportunities, 'partners', null)), {'highbury-fields':2,'islington-tennis-centre':1,'rosemary-gardens':1});
  const item = playOpportunities[0];
  assert.deepEqual(playVenueCounts([{...item, venueIds:[...item.venueIds,...item.venueIds]}]), {'highbury-fields':1});
  assert.deepEqual(playVenueCounts([]), {});
});
