// Builds the knowledge file the visitor assistant answers from. Run: bun scripts/build-scene-knowledge.ts
import { writeFileSync } from 'node:fs';
import { borough } from '../src/data/borough';
import { courtApproaches } from '../src/data/courtApproaches';
import { iconicClubs } from '../src/data/tennisAtlas';
import { centreCoaches, centreSessions } from '../src/data/centre';
const data = {
  borough: borough.name,
  map: { coverage: 'Continuous Islington borough and neighbouring streets', source: 'OpenStreetMap', checked: '30 October 2026', detail: 'Mapped street, park, building and outdoor court outlines; recorded building heights where available, otherwise estimated. Roofs, facades, planting and street furniture are illustrative. Indoor courts are not mapped outside their halls. Whole Islington zooms out on the same map; close-up 3D detail loads progressively. Cars, walkers, birds, urban foxes, narrowboats, surface trains and traffic signals are illustrative animated details on suitable source geography, not live observations. Selecting a supported bus route starts a 45-second illustrative road tour towards a nearby public tennis venue, with replay, a highlighted road line and an estimated remaining straight-line distance from the road to the courts. Route 139 lies outside this stored map and has no local tour. Pause world freezes activity. Forecast wind influences tree sway and the grass and water finishes. The Time card previews dates, sunrise, sunset and estimated moon phases, calculated locally rather than an observing ephemeris.' },
  venues: borough.venues.map(({ sources, ...v }) => ({ ...v, approach: courtApproaches[v.id] ?? null, officialSources: sources })),
  placesAndLandmarks: borough.places, services: borough.services, play: borough.play,
  busRoutes: borough.busRoutes, stations: borough.stations, tour: borough.tour,
  iconicLondonClubs: iconicClubs,
  tennisCentre: { coaches: centreCoaches, sessions: centreSessions },
};
writeFileSync('supabase/functions/ask-islington/scene-data.json', JSON.stringify(data));
console.log('ok', JSON.stringify(data).length);
