import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile } from './players.ts';

const base = { display_name: 'Sam', level: 'Improver', utr_rating: null, preferred_courts: [], contact: '', visible: true };

test('player card needs a name', () => assert.notEqual(validateProfile({ ...base, display_name: '  ' }), null));
test('UTR must be between 1 and 16.5', () => {
  assert.equal(validateProfile({ ...base, utr_rating: 16.5 }), null);
  assert.notEqual(validateProfile({ ...base, utr_rating: 17 }), null);
  assert.notEqual(validateProfile({ ...base, utr_rating: 0.5 }), null);
});
test('unknown levels are rejected', () => assert.notEqual(validateProfile({ ...base, level: 'Pro' }), null));
