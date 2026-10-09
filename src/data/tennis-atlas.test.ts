import test from 'node:test';
import assert from 'node:assert/strict';
import { iconicClubs, londonDate, tournaments, tournamentDates, tournamentStatus, upcomingTournaments } from './tennisAtlas.ts';

test('atlas uses the London calendar day through summer midnight and winter', () => {
  assert.equal(londonDate(new Date('2026-09-27T23:30:00Z')), '2026-09-28');
  assert.equal(londonDate(new Date('2026-12-01T23:30:00Z')), '2026-12-01');
});

test('events remain through their final day, then leave the upcoming calendar', () => {
  const id='wta-finals-2026';
  assert.ok(upcomingTournaments('2026-11-15').some(t=>t.id===id));
  assert.ok(!upcomingTournaments('2026-11-16').some(t=>t.id===id));
  assert.deepEqual(upcomingTournaments('2028-01-01'), []);
  const dated=upcomingTournaments('2026-09-27').filter(t=>t.start);
  assert.deepEqual(dated.map(t=>t.start), dated.map(t=>t.start).sort());
});

test('London clubs link to their events and the filters separate London from Grand Slams', () => {
  const london=upcomingTournaments('2026-09-27','london');
  assert.deepEqual(london.map(t=>t.clubId), ['queens','wimbledon']);
  assert.equal(upcomingTournaments('2026-09-27','slams').length,4);
  assert.ok(upcomingTournaments('2026-09-27','slams').every(t=>t.category==='Grand Slam'));
  for(const club of iconicClubs) assert.ok(london.some(t=>t.id===club.eventId&&t.clubId===club.id));
});

test('uncertain dates are never presented as a confirmed countdown', () => {
  const queens=tournaments.find(t=>t.id==='queens-2027')!;
  assert.equal(tournamentStatus(queens,'2027-06-04'),'Provisional dates');
  const usOpen=tournaments.find(t=>t.id==='us-open-2027')!;
  assert.equal(usOpen.start,undefined);
  assert.equal(usOpen.end,undefined);
  assert.equal(tournamentStatus(usOpen,'2026-09-27'),'Dates to come');
  assert.equal(tournamentDates(usOpen),'2027 · dates to be confirmed');
  const wimbledon=tournaments.find(t=>t.id==='wimbledon-2027')!;
  assert.equal(tournamentStatus(wimbledon,'2027-06-27'),'Starts tomorrow');
  assert.equal(tournamentStatus(wimbledon,'2027-06-28'),'In progress');
  assert.equal(tournamentStatus(wimbledon,'2027-07-11'),'In progress');
  assert.equal(tournamentStatus(wimbledon,'2027-07-12'),'Finished');
});

test('calendar records have unique identities, official sources and valid date ranges', () => {
  assert.equal(new Set(tournaments.map(t=>t.id)).size,tournaments.length);
  const sources=new Set(['www.lta.org.uk','www.wtatennis.com','www.nittoatpfinals.com','www.usopen.org']);
  for(const event of tournaments){
    assert.ok(sources.has(new URL(event.source).hostname));
    assert.ok(event.lat>=-90&&event.lat<=90&&event.lng>=-180&&event.lng<=180);
    if(event.status!=='unconfirmed'){
      assert.ok(event.start&&event.end&&event.start<=event.end);
      assert.ok(Number.isFinite(Date.parse(event.start!))&&Number.isFinite(Date.parse(event.end!)));
    }
  }
});
