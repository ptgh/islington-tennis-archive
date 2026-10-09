/** Curated event records, checked against the linked official sources on 3 October 2026.
 * Dates are local event dates, not live match schedules. Keep unconfirmed editions undated.
 */
export const ATLAS_CHECKED = '3 October 2026';
export const LTA_CALENDAR = 'https://www.lta.org.uk/fan-zone/event-calendar/';

export type IconicClubId = 'wimbledon' | 'queens';
export const iconicClubs = [
  {
    id: 'wimbledon' as const, name: 'Wimbledon', fullName: 'All England Lawn Tennis Club',
    area: 'Wimbledon · SW19', lat: 51.4344, lng: -0.214,
    description: 'Centre Court, summer grass and the home of The Championships. Explore the history of the game at Wimbledon Lawn Tennis Museum and on a tour of the grounds.',
    access: 'A private members’ club. Museum visits and guided tours are open to visitors; court access is restricted.',
    url: 'https://www.wimbledon.com/en_GB/museum_and_tours', linkLabel: 'Explore the museum & tours',
    source: 'https://www.wimbledon.com/en_GB/visit/getting_here.html',
    eventId: 'wimbledon-2027',
  },
  {
    id: 'queens' as const, name: 'The Queen’s Club', fullName: 'The Queen’s Club',
    area: 'West Kensington · W14', lat: 51.4875, lng: -0.2115,
    description: 'A red-brick clubhouse overlooking grass courts. The Queen’s Club brings the summer tour to west London for the women’s and men’s HSBC Championships.',
    access: 'A private members’ club. Follow the Championships for spectator information; the club shop welcomes visitors.',
    url: 'https://www.queensclub.co.uk/About_the_Club', linkLabel: 'Discover The Queen’s Club',
    source: 'https://www.queensclub.co.uk/about_the_club/location',
    eventId: 'queens-2027',
  },
];

export type Tournament = {
  id: string; name: string; city: string; country: string; venue: string;
  lat: number; lng: number; category: 'Grand Slam' | 'Tour finals' | 'Team tennis' | 'Grass season';
  surface: 'Hard' | 'Clay' | 'Grass'; year: number;
  start?: string; end?: string; status: 'published' | 'provisional' | 'unconfirmed';
  dateNote: string; source: string; url: string; clubId?: IconicClubId;
};

export const tournaments: Tournament[] = [
  { id:'wta-finals-2026', name:'WTA Finals', city:'Indian Wells', country:'USA', venue:'Indian Wells Tennis Garden', lat:33.724, lng:-116.305,
    category:'Tour finals', surface:'Hard', year:2026, start:'2026-11-08', end:'2026-11-15', status:'published',
    dateNote:'Dates and venue from the WTA’s current event FAQ.', source:'https://www.wtatennis.com/news/4525612/wtatenniscomwtafinals-faq', url:'https://www.wtatennis.com/tournaments/wta-finals/match-schedule' },
  { id:'atp-finals-2026', name:'Nitto ATP Finals', city:'Turin', country:'Italy', venue:'Inalpi Arena', lat:45.041, lng:7.652,
    category:'Tour finals', surface:'Hard', year:2026, start:'2026-11-15', end:'2026-11-22', status:'published',
    dateNote:'Tournament dates; check the organiser for session times.', source:'https://www.nittoatpfinals.com/en/', url:'https://www.nittoatpfinals.com/en/' },
  { id:'davis-cup-2026', name:'Davis Cup Final 8', city:'Bologna', country:'Italy', venue:'SuperTennis Arena', lat:44.507, lng:11.367,
    category:'Team tennis', surface:'Hard', year:2026, start:'2026-11-24', end:'2026-11-29', status:'published',
    dateNote:'Final 8 dates listed in the LTA tournament calendar.', source:LTA_CALENDAR, url:'https://www.lta.org.uk/fan-zone/davis-cup/' },
  { id:'australian-open-2027', name:'Australian Open', city:'Melbourne', country:'Australia', venue:'Melbourne Park', lat:-37.822, lng:144.978,
    category:'Grand Slam', surface:'Hard', year:2027, start:'2027-01-17', end:'2027-01-31', status:'published',
    dateNote:'Main draw. Opening Week and qualifying: 11–16 January.', source:'https://www.lta.org.uk/fan-zone/grand-slam/australian-open/', url:'https://ausopen.com/' },
  { id:'roland-garros-2027', name:'Roland-Garros', city:'Paris', country:'France', venue:'Stade Roland-Garros', lat:48.847, lng:2.25,
    category:'Grand Slam', surface:'Clay', year:2027, start:'2027-05-23', end:'2027-06-06', status:'published',
    dateNote:'Main draw. Qualifying: 17–21 May.', source:'https://www.lta.org.uk/fan-zone/grand-slam/roland-garros/', url:'https://www.rolandgarros.com/' },
  { id:'queens-2027', name:'HSBC Championships', city:'London', country:'UK', venue:'The Queen’s Club', lat:51.4875, lng:-0.2115,
    category:'Grass season', surface:'Grass', year:2027, start:'2027-06-05', end:'2027-06-20', status:'provisional', clubId:'queens',
    dateNote:'The LTA calendar marks the full window provisional. Qualifying begins 5 June; women’s week is 7–13 June and men’s week 14–20 June.', source:'https://www.lta.org.uk/fan-zone/international/hsbc-championships/residents-information/', url:'https://www.lta.org.uk/fan-zone/international/hsbc-championships/' },
  { id:'wimbledon-2027', name:'The Championships, Wimbledon', city:'London', country:'UK', venue:'All England Lawn Tennis Club', lat:51.4344, lng:-0.214,
    category:'Grand Slam', surface:'Grass', year:2027, start:'2027-06-28', end:'2027-07-11', status:'published', clubId:'wimbledon',
    dateNote:'The Championships fortnight; qualifying takes place separately.', source:LTA_CALENDAR, url:'https://www.wimbledon.com/' },
  { id:'us-open-2027', name:'US Open', city:'New York', country:'USA', venue:'USTA Billie Jean King National Tennis Center', lat:40.75, lng:-73.847,
    category:'Grand Slam', surface:'Hard', year:2027, status:'unconfirmed',
    dateNote:'The next edition is on our watchlist. Dates await consistent official confirmation.', source:'https://www.usopen.org/', url:'https://www.usopen.org/' },
];

export type TournamentFilter = 'all' | 'slams' | 'london';

/** Fixed home timezone, regardless of the visitor’s device timezone. */
export function londonDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part = (type: string) => parts.find(p=>p.type===type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function upcomingTournaments(today: string, filter: TournamentFilter = 'all'): Tournament[] {
  return tournaments.filter(t => (t.end ? t.end >= today : t.year >= Number(today.slice(0,4))) &&
    (filter==='all' || (filter==='slams' ? t.category==='Grand Slam' : t.city==='London')))
    .sort((a,b)=>(a.start??`${a.year}-12-31`).localeCompare(b.start??`${b.year}-12-31`));
}

export function tournamentDates(t: Tournament): string {
  if(!t.start || !t.end) return `${t.year} · dates to be confirmed`;
  const fmt = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  return fmt.formatRange(new Date(`${t.start}T12:00:00Z`),new Date(`${t.end}T12:00:00Z`));
}

export function tournamentStatus(t: Tournament, today: string): string {
  if(t.status==='unconfirmed') return 'Dates to come';
  if(t.end! < today) return 'Finished';
  if(t.status==='provisional') return 'Provisional dates';
  if(t.start! <= today) return 'In progress';
  const days=Math.round((Date.parse(t.start!) - Date.parse(today))/86400000);
  return days===1?'Starts tomorrow':`In ${days} days`;
}
