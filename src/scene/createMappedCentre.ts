import geography from '../data/centre-geography.json' with { type: 'json' }
import { mappedCourts, projectPoint } from './courtGeometry.ts'
import { createMappedHighbury } from './createMappedHighbury.ts'

export const centreCourts = mappedCourts(geography.courts)
const [west, south, east, north] = geography.bbox
const nw = projectPoint(west, north), se = projectPoint(east, south)
export const mappedCentreBounds = { minX: nw[0], maxX: se[0], minZ: nw[1], maxZ: se[1] }
const hall = geography.buildings.find(building => building.id === 30198196)!
const venuePoints = [...hall.points, ...geography.courts.flatMap(court => court.points)].map(([lng, lat]) => projectPoint(lng, lat))
export const mappedCentreCourtBounds = {
  minX: Math.min(...venuePoints.map(point => point[0])) - 5,
  maxX: Math.max(...venuePoints.map(point => point[0])) + 5,
  minZ: Math.min(...venuePoints.map(point => point[1])) - 5,
  maxZ: Math.max(...venuePoints.map(point => point[1])) + 5,
}
export function createMappedCentre() { return createMappedHighbury(geography, centreCourts, 'Mapped Islington Tennis Centre') }
