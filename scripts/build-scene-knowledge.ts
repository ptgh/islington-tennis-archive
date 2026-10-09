// Builds the knowledge file the visitor assistant answers from. Run: bun scripts/build-scene-knowledge.ts
import { writeFileSync } from 'node:fs';
import { borough } from '../src/data/borough';
import { courtApproaches } from '../src/data/courtApproaches';
import { iconicClubs } from '../src/data/tennisAtlas';
import { centreCoaches, centreSessions } from '../src/data/centre';
const data = {
  borough: borough.name,
  venues: borough.venues.map(({ sources, ...v }) => ({ ...v, approach: courtApproaches[v.id] ?? null, officialSources: sources })),
  placesAndLandmarks: borough.places, services: borough.services, play: borough.play,
  busRoutes: borough.busRoutes, stations: borough.stations, tour: borough.tour,
  iconicLondonClubs: iconicClubs,
  tennisCentre: { coaches: centreCoaches, sessions: centreSessions },
};
writeFileSync('supabase/functions/ask-islington/scene-data.json', JSON.stringify(data));
console.log('ok', JSON.stringify(data).length);
