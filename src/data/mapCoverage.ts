import highbury from './highbury-geography.json' with { type: 'json' }
import centre from './centre-geography.json' with { type: 'json' }

export const mappedNeighbourhoods = {
  'highbury-fields': { name: 'Highbury Fields', geography: highbury },
  'islington-tennis-centre': { name: 'Islington Tennis Centre', geography: centre },
}
export type MappedVenueId = keyof typeof mappedNeighbourhoods
/** Bounded source coverage; the space between extracts is not mapped. */
export function mappedCoverageAt(lat: number, lng: number): MappedVenueId | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  for (const id of Object.keys(mappedNeighbourhoods) as MappedVenueId[]) {
    const [west, south, east, north] = mappedNeighbourhoods[id].geography.bbox
    if (lat >= south && lat <= north && lng >= west && lng <= east) return id
  }
  return null
}
export function hasMappedCoverage(lat: number, lng: number) { return mappedCoverageAt(lat, lng) !== null }
export const MAP_SNAPSHOT_DATE = highbury.checked
