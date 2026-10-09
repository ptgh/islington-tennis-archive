/** Published arrival guidance, not surveyed gate coordinates or a live route. */
export interface CourtApproach {
  station: string;
  destination: string;
  arrival: string;
  guidance: string[];
  source: { label: string; url: string };
}

export const courtApproaches: Record<string, CourtApproach> = {
  'highbury-fields': {
    station: 'Highbury & Islington',
    destination: 'Highbury Fields Tennis Courts, Highbury Grove, London N5',
    arrival: 'Highbury Fields',
    guidance: [
      'Courts 1–8 are on the east side of the Fields, between Highbury Place and Highbury Grove.',
      'For courts 9–11, the council describes access from Highbury Terrace or the southern perimeter path connecting to Highbury Place.',
    ],
    source: { label: 'Islington Council · court access plan', url: 'https://islington.moderngov.co.uk/documents/s24956/Committee%20Report%20-%20HighburyFields.pdf' },
  },
  'islington-tennis-centre': {
    station: 'Caledonian Road',
    destination: 'Islington Tennis Centre and Gym, Market Road, London N7 9PL',
    arrival: 'Market Road',
    guidance: ['Better describes the centre as a short walk from Caledonian Road station. Head to the centre on Market Road.'],
    source: { label: 'Better · centre and directions', url: 'https://www.better.org.uk/leisure-centre/london/islington/islingtontc' },
  },
  'rosemary-gardens': {
    station: 'Essex Road',
    destination: 'Rosemary Gardens Tennis Courts, Southgate Road, London N1 3JP',
    arrival: 'Southgate Road',
    guidance: ['The council lists Essex Road as the nearby train station and Southgate Road for the park. The tennis courts have stepped access.'],
    source: { label: 'Islington Council · Rosemary Gardens', url: 'https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/rosemary-gardens' },
  },
  'tufnell-park': {
    station: 'Tufnell Park',
    destination: 'Tufnell Park Playing Fields, Campdale Road, London N7 0EB',
    arrival: 'Campdale Road park entrance',
    guidance: ['The council identifies the main park entrance on Campdale Road and a path beside the tennis courts.'],
    source: { label: 'Islington Council · park improvements', url: 'https://www.letstalk.islington.gov.uk/tufnell-park-playing-fields' },
  },
  'spa-fields': {
    station: 'Farringdon',
    destination: 'Spa Fields, Skinner Street, London EC1',
    arrival: 'Skinner Street',
    guidance: ['The council lists Farringdon and Angel for the park. Its shared ball court has step-free access and is free-play.'],
    source: { label: 'Islington Council · Spa Fields', url: 'https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/spa-fields' },
  },
};

export function walkingDirections(approach: CourtApproach): string {
  const query = new URLSearchParams({
    api: '1',
    origin: `${approach.station} station, London`,
    destination: approach.destination,
    travelmode: 'walking',
  });
  return `https://www.google.com/maps/dir/?${query}`;
}
