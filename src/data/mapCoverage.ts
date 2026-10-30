import highbury from './highbury-geography.json' with { type: 'json' }

/** Exact coverage of the stored Highbury extract, not borough-wide coverage. */
export function hasMappedCoverage(lat: number, lng: number) {
  const [west, south, east, north] = highbury.bbox
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= south && lat <= north && lng >= west && lng <= east
}
export const MAP_SNAPSHOT_DATE = highbury.checked
