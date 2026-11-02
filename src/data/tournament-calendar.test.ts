import test from 'node:test';
import assert from 'node:assert/strict';
import { tournaments, type Tournament } from './tennisAtlas.ts';
import { tournamentCalendar } from './tournamentCalendar.ts';

const wimbledon = tournaments.find(event => event.id === 'wimbledon-2027')!;
const now = new Date('2026-11-02T13:00:00Z');
const unfold = (value: string) => value.replace(/\r\n /g, '');

test('calendar exports include the final local day without inventing match times or blocking the diary', () => {
  const calendar = unfold(tournamentCalendar(wimbledon, now)!);
  assert.match(calendar, /DTSTART;VALUE=DATE:20270628\r\nDTEND;VALUE=DATE:20270712/);
  assert.match(calendar, /DTSTAMP:20261102T130000Z/);
  assert.match(calendar, /TRANSP:TRANSPARENT/);
  assert.ok(calendar.includes(`URL:${wimbledon.url}\r\n`));
  assert.ok(calendar.includes(`Date source: ${wimbledon.source}`));
  assert.ok(calendar.includes('does not update automatically'));
  assert.ok(calendar.endsWith('END:VCALENDAR\r\n'));
  assert.equal(calendar.match(/BEGIN:VEVENT/g)?.length, 1);
  assert.equal(calendar.match(/UID:.+/)?.[0], unfold(tournamentCalendar(wimbledon, new Date('2026-11-03T13:00:00Z'))!).match(/UID:.+/)?.[0]);
});

test('provisional, undated and invalid dates never become calendar events', () => {
  for (const event of tournaments.filter(event => event.status !== 'published')) assert.equal(tournamentCalendar(event, now), null);
  for (const dates of [{start:undefined}, {end:undefined}, {start:'2027-02-30'}, {end:'2027-06-01'}, {start:'not a date'}]) {
    assert.equal(tournamentCalendar({...wimbledon, ...dates}, now), null);
  }
});

test('all-day ranges survive daylight-saving and year boundaries', () => {
  for (const [start, end, exclusive] of [['2026-10-24','2026-10-25','20261026'], ['2026-12-31','2026-12-31','20270101']]) {
    assert.ok(tournamentCalendar({...wimbledon, start, end}, now)!.includes(`DTEND;VALUE=DATE:${exclusive}\r\n`));
  }
});

test('UTF-8 folding and escaped text preserve punctuation without creating extra calendar properties', () => {
  const event: Tournament = {...wimbledon, name:'Queen’s; café, tennis \\ '.repeat(8) + '\r\nBEGIN:VEVENT'};
  const calendar = tournamentCalendar(event, now)!;
  for (const line of calendar.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.ok(unfold(calendar).includes('Queen’s\\; café\\, tennis \\\\ '));
  assert.ok(unfold(calendar).includes('\\nBEGIN:VEVENT'));
  assert.equal(calendar.match(/\r\nBEGIN:VEVENT\r\n/g)?.length, 1);
});
