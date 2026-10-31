export type TrafficCamera = { id: string; name: string; lat: number; lng: number; available: boolean | null }
export type CameraScope = 'nearby' | 'london'
export const CAMERA_DIRECTORY_URL = 'https://api.tfl.gov.uk/Place/Type/JamCam'
export const CAMERA_REFRESH_MS = 3 * 60 * 1000
/** Bounding box for the continuous Islington source extract, including neighbouring streets.
 * This is not an administrative borough boundary. London-wide cameras remain listed. */
export const CAMERA_MAP_BOUNDS = { south: 51.516, west: -.152, north: 51.580, east: -.075 }
export const cameraInMap = (camera: TrafficCamera) => camera.lat >= CAMERA_MAP_BOUNDS.south && camera.lat <= CAMERA_MAP_BOUNDS.north && camera.lng >= CAMERA_MAP_BOUNDS.west && camera.lng <= CAMERA_MAP_BOUNDS.east
export const cameraMetadataUrl = (camera: TrafficCamera) => `https://api.tfl.gov.uk/Place/${encodeURIComponent(camera.id)}`

function property(place: Record<string, unknown>, key: string): unknown {
  if (!Array.isArray(place.additionalProperties)) return undefined
  return place.additionalProperties.find(item => item && typeof item === 'object' && item.key === key)?.value
}

/** No result limit or curated allowlist: retain every valid, unique TfL camera,
 * including offline and unknown-status entries. Report rejected records explicitly. */
export function parseCameraDirectory(data: unknown): { cameras: TrafficCamera[]; excluded: number } {
  if (!Array.isArray(data)) throw Error('Invalid camera directory')
  const cameras = new Map<string, TrafficCamera>()
  let excluded = 0
  for (const row of data) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !/^JamCams_\d+\.\d+$/.test(row.id) ||
        typeof row.lat !== 'number' || !Number.isFinite(row.lat) || Math.abs(row.lat) > 90 ||
        typeof row.lon !== 'number' || !Number.isFinite(row.lon) || Math.abs(row.lon) > 180 || cameras.has(row.id)) { excluded++; continue }
    const available = property(row, 'available')
    cameras.set(row.id, { id: row.id, name: typeof row.commonName === 'string' && row.commonName.trim() ? row.commonName.trim() : row.id, lat: row.lat, lng: row.lon, available: available === 'true' ? true : available === 'false' ? false : null })
  }
  return { cameras: [...cameras.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-GB') || a.id.localeCompare(b.id)), excluded }
}

export function filterCameras(cameras: readonly TrafficCamera[], scope: CameraScope, query: string) {
  const search = query.trim().toLocaleLowerCase('en-GB')
  return cameras.filter(camera => (scope === 'london' || cameraInMap(camera)) && (!search || `${camera.name} ${camera.id}`.toLocaleLowerCase('en-GB').includes(search)))
}
export const cameraAvailability = (camera: TrafficCamera) => camera.available === true ? 'Available' : camera.available === false ? 'Unavailable' : 'Status unknown'

/** Accept only the selected camera's official image. Property `modified` is
 * directory metadata, sometimes months old; it is NOT the image capture time. */
export function cameraImageUrl(data: unknown, camera: TrafficCamera): string | null {
  if (!data || typeof data !== 'object') throw Error('Invalid camera metadata')
  const place = data as Record<string, unknown>
  if (place.id !== camera.id || !Array.isArray(place.additionalProperties) || !/^JamCams_\d+\.\d+$/.test(camera.id)) throw Error('Unexpected camera')
  if (property(place, 'available') === 'false') return null
  const expected = `https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/${camera.id.replace('JamCams_', '')}.jpg`
  if (property(place, 'available') !== 'true' || property(place, 'imageUrl') !== expected) throw Error('Camera image unavailable')
  return expected
}
