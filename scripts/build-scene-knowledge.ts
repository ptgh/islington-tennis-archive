// Builds the knowledge file the visitor assistant answers from. Run: bun scripts/build-scene-knowledge.ts
import { writeFileSync } from 'node:fs';
import { borough } from '../src/data/borough';
import { courtApproaches } from '../src/data/courtApproaches';
import { centreCoaches, centreSessions } from '../src/data/centre';
const data = {
  borough: borough.name,
  venues: borough.venues.map(({ sources, ...v }) => ({ ...v, approach: courtApproaches[v.id] ?? null, sources: sources.map(s => s.label) })),
  placesAndLandmarks: borough.places, services: borough.services, play: borough.play,
  busRoutes: borough.busRoutes, stations: borough.stations, tour: borough.tour,
  tennisCentre: { coaches: centreCoaches, sessions: centreSessions },
};
writeFileSync('supabase/functions/ask-islington/scene-data.json', JSON.stringify(data));
console.log('ok', JSON.stringify(data).length);
