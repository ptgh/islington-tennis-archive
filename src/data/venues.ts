export type Access = 'public' | 'school' | 'members' | 'residents';
export type Filter = 'all' | 'public' | 'restricted';
export interface Venue {
  id: string; name: string; area: string; address: string;
  lat: number; lng: number; courts: number | null; access: Access;
  summary: string; description: string; surface: string; lighting: string;
  setting: string; station: string; stationLines: string; nearby: boolean;
  action: 'book' | 'visit' | 'enquire'; actionUrl: string; actionLabel: string;
  accessNote: string; sources: {label:string;url:string}[];
}

export const VERIFIED_DATE = '20 September 2026';
export const venues: Venue[] = [
  {
    id:'highbury-fields', name:'Highbury Fields', area:'Highbury', address:'Highbury Grove, London N5 1QP',
    // Venue pin from Better's linked map, not a surveyed court entrance.
    lat:51.551501,lng:-0.098780,courts:11,access:'public',nearby:false,
    summary:'11 outdoor courts · Public',surface:'Tarmac',lighting:'Floodlit',setting:'Outdoors',
    description:'Tennis among the trees in Islington’s largest park. Eleven outdoor courts, with pay-and-play bookings through Better.',
    station:'Highbury & Islington',stationLines:'Victoria · Overground · National Rail',
    action:'book',actionLabel:'Find a court time',actionUrl:'https://bookings.better.org.uk/location/islington-tennis-centre/highbury-fields-activities',
    accessNote:'Public pay-and-play. Prices, available times and booking rules are set by Better.',
    sources:[{label:'Better — Highbury Fields',url:'https://www.better.org.uk/leisure-centre/london/islington/islington-parks/3046-islington-parks'},{label:'Islington Council — Highbury Fields',url:'https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/highbury-fields'},{label:'Operator’s venue map',url:'https://goo.gl/maps/fyzSCdrukCD3BCbq7'}],
  },
  {
    id:'islington-tennis-centre',name:'Islington Tennis Centre',area:'Holloway',address:'Market Road, London N7 9PL',
    // Coordinates published in Better's venue location data and directions.
    lat:51.5462388,lng:-0.1211113,courts:8,access:'public',nearby:false,
    summary:'6 indoor + 2 outdoor · Public',surface:'Cushioned acrylic / macadam',lighting:'Outdoor floodlights',setting:'Indoors & outdoors',
    description:'A year-round place to play, with six indoor cushioned acrylic courts and two outdoor macadam courts. You don’t need a membership to book.',
    station:'Caledonian Road',stationLines:'Piccadilly',
    action:'book',actionLabel:'Find a court time',actionUrl:'https://www.better.org.uk/book-activity',
    accessNote:'Public pay-and-play. Choose Islington Tennis Centre & Gym in Better’s booking service. Indoor and outdoor courts have separate availability and prices.',
    sources:[{label:'Better — tennis and court hire',url:'https://www.better.org.uk/leisure-centre/london/islington/islingtontc/tennis'},{label:'Better — centre and directions',url:'https://www.better.org.uk/leisure-centre/london/islington/islingtontc'}],
  },
  {
    id:'rosemary-gardens',name:'Rosemary Gardens',area:'Canonbury',address:'Southgate Road, London N1 3JP',
    // Better's linked park/sports venue pin; not the tennis gate.
    lat:51.5386367,lng:-0.0877521,courts:2,access:'public',nearby:false,
    summary:'2 outdoor courts · Public',surface:'Tarmac',lighting:'Floodlit',setting:'Outdoors',
    description:'Two tennis courts tucked into a leafy neighbourhood park, just north of Regent’s Canal. Court bookings are managed by Better.',
    station:'Essex Road',stationLines:'National Rail',
    action:'book',actionLabel:'Find a court time',actionUrl:'https://bookings.better.org.uk/location/islington-tennis-centre/rosemary-gardens-activities',
    accessNote:'Public pay-and-play. There are steps to the tennis courts. Coaching is also available through Tennis for All; coaching and court hire are separate.',
    sources:[{label:'Better — Rosemary Gardens',url:'https://www.better.org.uk/leisure-centre/london/islington/islington-parks/rosemary-gardens-football-pitch-and-tennis-courts'},{label:'Islington Council — facilities and travel',url:'https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/rosemary-gardens'},{label:'Council directory — floodlights',url:'https://findyour.islington.gov.uk/kb5/islington/directory/service.page?communitychannelnew=5&id=t6RbuROrxPk'},{label:'Operator’s venue map',url:'https://goo.gl/maps/pnRXp7idVnjAuL1R8'}],
  },
  {
    id:'tufnell-park',name:'Tufnell Park',area:'Tufnell Park',address:'Campdale Road, London N7 0EB',
    // Park pin from Better's linked map; not the tennis entrance.
    lat:51.5584335,lng:-0.1336788,courts:2,access:'public',nearby:false,
    summary:'2 outdoor courts · Public',surface:'Tarmac',lighting:'Daylight play',setting:'Outdoors',
    description:'Two outdoor courts beside the playing fields, near the northern edge of Islington. Book a court through Better.',
    station:'Tufnell Park',stationLines:'Northern',
    action:'book',actionLabel:'Find a court time',actionUrl:'https://bookings.better.org.uk/location/islington-tennis-centre/tufnell-park-activities',
    accessNote:'Public pay-and-play. Better lists opening hours from 8am until dusk; check its calendar for court times.',
    sources:[{label:'Better — Tufnell Park Playing Fields',url:'https://www.better.org.uk/leisure-centre/london/islington/islington-parks/tufnell-park-playing-fields'},{label:'Operator’s venue map',url:'https://goo.gl/maps/X7MRUu78VChS9GWP7'}],
  },
  {
    id:'spa-fields',name:'Spa Fields',area:'Clerkenwell',address:'Skinner Street, London EC1',
    // Park location published by Parks & Gardens; not a court entrance.
    lat:51.525318,lng:-0.1078098,courts:null,access:'public',nearby:false,
    summary:'Shared ball court · Free play',surface:'Tarmac',lighting:'Not verified',setting:'Outdoors',
    description:'A shared ball court with tennis nets, also used for football and basketball. Step-free access is available.',
    station:'Farringdon / Angel',stationLines:'See directions for your journey',
    action:'visit',actionLabel:'Plan a visit',actionUrl:'https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/spa-fields',
    accessNote:'Free play. The council says this court cannot be booked. Availability depends on other park users.',
    sources:[{label:'Islington Council — Spa Fields',url:'https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/spa-fields'},{label:'Parks & Gardens — park location',url:'https://www.parksandgardens.org/places/spa-fields-gardens'}],
  },
  {
    id:'elizabeth-garrett-anderson',name:'Elizabeth Garrett Anderson School',area:'Barnsbury',address:'Donegal Street, London N1 9QG',
    // Coordinates from the school website's directions link; campus pin only.
    lat:51.5329007,lng:-0.114072,courts:4,access:'school',nearby:false,
    summary:'4 outdoor courts · School access',surface:'Not published',lighting:'Not verified',setting:'Outdoors',
    description:'The school lists four outdoor tennis courts among its PE facilities. Public tennis hire has not been verified.',
    station:'Angel',stationLines:'Northern',
    action:'enquire',actionLabel:'Visit the school website',actionUrl:'https://www.egaschool.co.uk/314/physical-education-pe',
    accessNote:'Restricted school facilities. A listing does not give permission to enter. Contact the school about any community access.',
    sources:[{label:'EGA School — PE facilities',url:'https://www.egaschool.co.uk/314/physical-education-pe'}],
  },
  {
    id:'coolhurst',name:'Coolhurst Tennis & Squash Club',area:'Crouch End · Haringey',address:'Coolhurst Road, Crouch End, London N8 8EY',
    // Approximate club-site point from OpenStreetMap via Mapcarta.
    lat:51.57638,lng:-0.13117,courts:14,access:'members',nearby:true,
    summary:'14 courts · Members’ club',surface:'Artificial clay / artificial grass',lighting:'10 floodlit',setting:'Outdoors · 2 covered in winter',
    description:'A nearby members’ club in Crouch End, outside Islington. Fourteen tennis courts, with two covered for the winter months.',
    station:'Highgate',stationLines:'Northern · onward walk or bus',
    action:'enquire',actionLabel:'Membership & coaching',actionUrl:'https://coolhurst.co.uk/tennis/',
    accessNote:'Membership is subject to availability; the club currently advertises a waiting list. Some coaching is open to non-members.',
    sources:[{label:'Coolhurst — tennis and access',url:'https://coolhurst.co.uk/tennis/'},{label:'OpenStreetMap via Mapcarta — club location',url:'https://mapcarta.com/W371638490'}],
  },
  {
    id:'barbican',name:'Barbican Lawn Tennis Club',area:'Barbican · City of London',address:'City of London School for Girls, St Giles Terrace, London EC2Y 8BB',
    // Approximate school-campus point from OpenStreetMap via Mapcarta.
    lat:51.51916,lng:-0.0947,courts:2,access:'residents',nearby:true,
    summary:'2 hard courts · Residents’ club',surface:'Hard courts',lighting:'Check with club',setting:'Outdoors',
    description:'A Barbican residents’ club using two hard courts owned by the City of London School for Girls. Outside Islington, in the City of London.',
    station:'Barbican',stationLines:'Circle · Hammersmith & City · Metropolitan',
    action:'enquire',actionLabel:'Read access requirements',actionUrl:'https://clubspark.lta.org.uk/BarbicanLTC',
    accessNote:'Membership is limited to Barbican Estate residents. Accompanied guests may play under club rules, outside specified school hours. No public pay-and-play access.',
    sources:[{label:'Barbican Lawn Tennis Club',url:'https://clubspark.lta.org.uk/BarbicanLTC'},{label:'Barbican — club rules',url:'https://clubspark.lta.org.uk/BarbicanLTC/CLUBRULES/Rules'},{label:'OpenStreetMap via Mapcarta — school location',url:'https://mapcarta.com/W1467662623'}],
  },
];

export function filterVenues(items: Venue[], query: string, filter: Filter, includeNearby: boolean): Venue[] {
  const words=query.toLocaleLowerCase('en-GB').trim().split(/\s+/).filter(Boolean);
  return items.filter(v => (includeNearby || !v.nearby)
    && (filter==='all' || (filter==='public' ? v.access==='public' : v.access!=='public'))
    && words.every(word=>[v.name,v.area,v.address,v.station,v.summary].join(' ').toLocaleLowerCase('en-GB').includes(word)));
}

export const accessLabels: Record<Access,string> = {public:'Public access',school:'School access',members:'Members’ club',residents:'Residents only'};
