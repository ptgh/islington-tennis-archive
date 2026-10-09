export type PlayFilter = 'all' | 'social' | 'partners' | 'today';

export interface PlayOpportunity {
  id: string;
  kind: 'social' | 'partners';
  weekdays?: string[];
  name: string;
  summary: string;
  area: string;
  /** Verified associated courts, not the locations of individual players. */
  venueIds: string[];
  venueContext: string;
  description: string;
  level: string;
  when: string;
  access: string;
  note: string;
  url: string;
  actionLabel: string;
  checkedAt: string;
  sources: { label: string; url: string }[];
}

export const PLAY_VERIFIED_DATE = '22 September 2026';
export const playOpportunities: PlayOpportunity[] = [
  {
    id: 'highbury-mix-ins', weekdays:['Sat','Sun'], kind: 'social', name: 'Weekend mix-ins',
    summary: 'Social doubles · No partner needed · 18+', area: 'Highbury Fields',
    venueIds: ['highbury-fields'], venueContext: 'Meet on the Highbury Fields courts.',
    description: 'Volunteer-run doubles where you can arrive on your own and meet other local players. Places are first come, subject to capacity and weather.',
    level: 'Basic serving and rallying skills recommended', when: 'Weekends · Confirm current times',
    access: 'Adults 18+ · Drop-in · A session fee applies',
    note: 'Local pages disagree on Sunday times, court numbers and fees. Confirm the current arrangements with the organiser before travelling. This is separate from club membership.',
    url: 'https://tennisonhighburyfields.co.uk/weekend-mix-ins/', actionLabel: 'See joining details', checkedAt: PLAY_VERIFIED_DATE,
    sources: [{label:'Highbury Fields — mix-in organiser',url:'https://tennisonhighburyfields.co.uk/weekend-mix-ins/'},{label:'Highbury Tennis Club — other tennis',url:'https://www.highburytennisclub.com/other-tennis.html'}],
  },
  {
    id: 'islington-social-50', weekdays:['Mon','Wed'], kind: 'social', name: 'Social doubles, 50+',
    summary: 'Rotating doubles · Intermediate & advanced', area: 'Islington Tennis Centre',
    venueIds: ['islington-tennis-centre'], venueContext: 'Hosted at Islington Tennis Centre.',
    description: 'Meet other players through doubles matches arranged by the reception team. Balls are supplied, and rackets can be borrowed.',
    level: 'Intermediate or advanced', when: 'Mon 14:00–16:00 · Wed 12:00–14:00',
    access: 'Age 50+ · Check booking and prices with Better',
    note: 'These are Better’s published weekly times, not confirmed upcoming events. Check the operator’s current schedule and availability.',
    url: 'https://www.better.org.uk/leisure-centre/london/islington/islingtontc/senior-activities', actionLabel: 'View sessions with Better', checkedAt: PLAY_VERIFIED_DATE,
    sources: [{label:'Better — social tennis programme',url:'https://www.better.org.uk/leisure-centre/london/islington/islingtontc/senior-activities'}],
  },
  {
    id:'islington-social-adults',weekdays:['Tue','Fri','Sat','Sun'],kind:'social',name:'Adult social doubles',summary:'Pay as you go · Intermediate recommended',area:'Islington Tennis Centre',venueIds:['islington-tennis-centre'],venueContext:'Hosted at Islington Tennis Centre.',
    description:'Join rotating doubles matches arranged by the reception team. Equipment is available to borrow.',level:'Intermediate or above recommended',when:'Tue 10–12 · Fri 13–15 · Sat / Sun 19–22',access:'Adult sessions · Book with Better',note:'Published weekly timetable, not live availability. Monday and Wednesday 50+ sessions are listed separately.',url:'https://www.better.org.uk/leisure-centre/london/islington/islingtontc/tennis',actionLabel:'View social sessions',checkedAt:PLAY_VERIFIED_DATE,sources:[{label:'Better — full tennis programme',url:'https://www.better.org.uk/leisure-centre/london/islington/islingtontc/tennis'}],
  },
  {
    id: 'rosemary-lobsters', weekdays:['Wed'], kind: 'social', name: 'North London Lob-sters',
    summary: 'Social doubles · All abilities', area: 'Rosemary Gardens',
    venueIds: ['rosemary-gardens'], venueContext: 'This listing highlights their Rosemary Gardens session; the group also plays elsewhere in North London.',
    description: 'A welcoming tennis community with social doubles and opportunities to get to know other players. Join through the organiser’s Spond group.',
    level: 'All abilities for the Rosemary session', when: 'Wed 19:00–21:00 · Published weekly time',
    access: 'Join the group and check session booking requirements',
    note: 'Confirm the next session, eligibility, cost and spaces through the organiser. A listing here does not reserve a place.',
    url: 'https://clubspark.lta.org.uk/TennisforAll1/Lobsters', actionLabel: 'Explore the Lob-sters', checkedAt: PLAY_VERIFIED_DATE,
    sources: [{label:'Tennis for All — North London Lob-sters',url:'https://clubspark.lta.org.uk/TennisforAll1/Lobsters'}],
  },
  {
    id: 'local-tennis-leagues', kind: 'partners', name: 'Find an opponent',
    summary: 'Barclays Local Tennis Leagues · Adults 18+', area: 'Highbury · Islington Tennis Centre · Rosemary',
    venueIds: ['highbury-fields','islington-tennis-centre','rosemary-gardens'],
    venueContext: 'These courts anchor league areas listed by the LTA. Players arrange their match venue and time together.',
    description: 'Join a local league to meet opponents of a similar standard, then arrange matches around your schedules. Use the official app to choose a local league and round.',
    level: 'Grouped by playing standard · Check local league options', when: 'Arrange match times with your opponents',
    access: 'Adults 18+ · LTA account and paid league entry',
    note: 'Court hire is separate. The app holds current round dates and entry availability; no open round or immediate match is promised here.',
    url: 'https://www.lta.org.uk/compete/adult/local-tennis-leagues/', actionLabel: 'Find a league with the LTA', checkedAt: PLAY_VERIFIED_DATE,
    sources: [{label:'LTA — how local leagues work',url:'https://www.lta.org.uk/compete/adult/local-tennis-leagues/'},{label:'LTA — local league locations',url:'https://www.lta.org.uk/compete/adult/local-tennis-leagues/local-tennis-leagues-locations/'}],
  },
  {
    id: 'highbury-club', kind: 'partners', name: 'Meet players through a club',
    summary: 'Highbury Tennis Club · Assessment first', area: 'Highbury Fields',
    venueIds: ['highbury-fields'], venueContext: 'The club plays on Highbury Fields’ public courts.',
    description: 'Meet other players through club practice, doubles teams and returners sessions. Request an assessment so the club can suggest an appropriate group.',
    level: 'Returners, improvers and team players', when: 'Regular club sessions · Arrange an assessment first',
    access: 'Adult club · Membership and session costs apply',
    note: 'The club does not teach complete beginners or children. Joining and assessment availability are confirmed by the club, not this guide.',
    url: 'https://www.highburytennisclub.com/about.html', actionLabel: 'Explore club membership', checkedAt: PLAY_VERIFIED_DATE,
    sources: [{label:'Highbury Tennis Club — joining and sessions',url:'https://www.highburytennisclub.com/about.html'}],
  },
];

export function filterPlayOpportunities(items: PlayOpportunity[], kind: PlayFilter, venueId: string | null, now = new Date()) {
  const day=new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'Europe/London'}).format(now);
  return items.filter(item => (kind === 'all' || (kind === 'today' ? item.weekdays?.includes(day) : item.kind === kind)) && (!venueId || item.venueIds.includes(venueId)));
}

export function playVenueCounts(items: PlayOpportunity[]) {
  const counts: Record<string, number> = {};
  for (const item of items) for (const id of new Set(item.venueIds)) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}
