// Builds the knowledge file the visitor assistant answers from. Run: bun scripts/build-scene-knowledge.ts
import { writeFileSync } from 'node:fs';
import { borough } from '../src/data/borough';
import { courtApproaches } from '../src/data/courtApproaches';
import { iconicClubs } from '../src/data/tennisAtlas';
import { centreCoaches, centreSessions } from '../src/data/centre';
const data = {
  borough: borough.name,
  map: { coverage: 'Continuous Islington borough and neighbouring streets', source: 'OpenStreetMap', checked: '30 October 2026', detail: 'Mapped street, park, building and outdoor court outlines; recorded building heights where available, otherwise estimated. Roofs, facades, planting and street furniture are illustrative. Indoor courts are not mapped outside their halls. Whole Islington zooms out on the same map; close-up 3D detail loads progressively.' },
  venues: borough.venues.map(({ sources, ...v }) => ({ ...v, approach: courtApproaches[v.id] ?? null, officialSources: sources })),
  placesAndLandmarks: borough.places, services: borough.services, play: borough.play,
  busRoutes: borough.busRoutes, stations: borough.stations, tour: borough.tour,
  iconicLondonClubs: iconicClubs,
  tennisCentre: { coaches: centreCoaches, sessions: centreSessions },
};
writeFileSync('supabase/functions/ask-islington/scene-data.json', JSON.stringify(data));
console.log('ok', JSON.stringify(data).length);
