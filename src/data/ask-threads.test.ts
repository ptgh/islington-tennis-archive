import test from 'node:test';
import assert from 'node:assert/strict';
import { parseThreads, threadIdFromHash, threadTitle } from './askThreads.ts';

test('each conversation has its own link that reopens it', () => {
  assert.equal(threadIdFromHash('#/ask/abc-123'), 'abc-123');
  assert.equal(threadIdFromHash('#/ask'), null);
  assert.equal(threadIdFromHash(''), undefined);
});

test('saved conversations are listed newest first and bad data is ignored', () => {
  const raw = JSON.stringify([{ id: 'a', title: 'A', updatedAt: 1, messages: [] }, { id: 'b', title: 'B', updatedAt: 5, messages: [] }, { nope: true }]);
  assert.deepEqual(parseThreads(raw).map(t => t.id), ['b', 'a']);
  assert.deepEqual(parseThreads('not json'), []);
});

test('conversation titles come from the first question', () => {
  assert.equal(threadTitle('  Where   can I play?  '), 'Where can I play?');
  assert.equal(threadTitle('x'.repeat(60)).length, 42);
});
