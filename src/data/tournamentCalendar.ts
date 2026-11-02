import type { Tournament } from './tennisAtlas.ts';

const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');

/** Fold UTF-8 content lines without splitting a character (RFC 5545). */
function foldLine(value: string): string {
  const encoder = new TextEncoder();
  let result = '', bytes = 0;
  for (const character of value) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) { result += '\r\n '; bytes = 1; }
    result += character; bytes += length;
  }
  return result;
}

/** Export a saved, all-day copy of published tournament dates, never match times. */
export function tournamentCalendar(event: Tournament, now = new Date()): string | null {
  if (event.status !== 'published' || !event.start || !event.end) return null;
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  if (!validDate(event.start) || !validDate(event.end) || event.start > event.end) return null;
  // DATE ends are exclusive. UTC arithmetic preserves the organiser's calendar
  // dates across timezones, daylight-saving changes and year boundaries.
  const end = new Date(Date.parse(event.end) + 86400000).toISOString().slice(0, 10);
  const date = (value: string) => value.replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Islington Tennis//Tournament diary//EN',
    'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${encodeURIComponent(event.id)}@court-visions-archive.lovable.app`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `DTSTART;VALUE=DATE:${date(event.start)}`, `DTEND;VALUE=DATE:${date(end)}`,
    `SUMMARY:${escapeText(event.name)}`,
    `LOCATION:${escapeText(`${event.venue}, ${event.city}, ${event.country}`)}`,
    `DESCRIPTION:${escapeText(`${event.dateNote}\nTournament dates only; check the official site for session times.\nDate source: ${event.source}\nSaved copy from Islington Tennis; does not update automatically.`)}`,
    `URL:${event.url}`, 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}
