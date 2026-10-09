import test from 'node:test';
import assert from 'node:assert/strict';
import { accountDestination } from './account.ts';

test('account circle opens the player profile when signed in', () => {
  assert.equal(accountDestination(true), 'profile');
});
test('account circle opens sign-up when signed out', () => {
  assert.equal(accountDestination(false), 'signup');
});