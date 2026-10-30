import test from 'node:test'
import assert from 'node:assert/strict'
import { cameraImageUrl, parseCameraDirectory, filterCameras, cameraInMap, CAMERA_MAP_BOUNDS, type TrafficCamera } from './trafficCameras.ts'

const camera: TrafficCamera = { id: 'JamCams_00001.09705', name: 'Highbury Corner', lat: 51.5456, lng: -.1033, available: true }
const image = 'https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09705.jpg'
const metadata = (available = 'true', imageUrl = image) => ({ id: camera.id, additionalProperties: [
  { key: 'available', value: available, modified: '2020-01-01T00:00:00Z' },
  { key: 'imageUrl', value: imageUrl },
] })
const record = (id: string, name: string, lat = camera.lat, lon = camera.lng, available = 'true') => ({ id, commonName: name, lat, lon, additionalProperties: [{ key: 'available', value: available }] })

test('directory modification dates do not masquerade as image capture times', () => {
  assert.equal(cameraImageUrl(metadata(), camera), image)
})

test('unavailable cameras cannot display a leftover image URL', () => {
  assert.equal(cameraImageUrl(metadata('false'), camera), null)
})

test('camera responses fail closed for missing availability, mismatched IDs and unexpected image hosts', () => {
  for (const data of [null, {}, { ...metadata(), id: 'JamCams_00001.09702' }, metadata(''), metadata('true', 'https://example.org/image.jpg'), metadata('true', image.replace('09705', '09702')), { id: camera.id, additionalProperties: [null] }]) {
    assert.throws(() => cameraImageUrl(data, camera))
  }
})

test('complete directories retain more than a thousand cameras, including duplicate names and offline or unknown statuses', () => {
  const source = Array.from({ length: 1200 }, (_, i) => record(`JamCams_00001.${String(i).padStart(5, '0')}`, i < 2 ? 'Same junction' : `Camera ${i}`, camera.lat, camera.lng, i % 3 === 0 ? 'true' : i % 3 === 1 ? 'false' : ''))
  const result = parseCameraDirectory(source)
  assert.equal(result.excluded, 0)
  assert.equal(result.cameras.length, source.length)
  assert.equal(result.cameras.filter(camera => camera.available === true).length, 400)
  assert.equal(result.cameras.filter(camera => camera.available === false).length, 400)
  assert.equal(result.cameras.filter(camera => camera.available === null).length, 400)
  assert.equal(result.cameras.filter(camera => camera.name === 'Same junction').length, 2)
  assert.deepEqual(new Set(result.cameras.map(camera => camera.id)), new Set(source.map(row => row.id)))
})

test('invalid entries and duplicate IDs are counted rather than silently reducing claimed coverage', () => {
  const row = record(camera.id, camera.name)
  const result = parseCameraDirectory([row, row, null, { ...row, id: '../other' }, { ...row, id: 'JamCams_00001.00002', lat: NaN }, { ...row, id: 'JamCams_00001.00003', lon: 200 }])
  assert.equal(result.cameras.length, 1)
  assert.equal(result.excluded, 5)
  assert.throws(() => parseCameraDirectory({ cameras: [row] }))
})

test('nearby bounds are explicit and London-wide search can reach cameras outside the map without a result cap', () => {
  const edge = { ...camera, id: 'JamCams_00001.00001', lat: CAMERA_MAP_BOUNDS.north, lng: CAMERA_MAP_BOUNDS.east }
  const outside = { ...camera, id: 'JamCams_00001.00002', name: 'Heathrow junction', lat: 51.47, lng: -.45 }
  assert.equal(cameraInMap(edge), true)
  assert.equal(cameraInMap(outside), false)
  assert.deepEqual(filterCameras([camera, edge, outside], 'nearby', ''), [camera, edge])
  assert.deepEqual(filterCameras([camera, edge, outside], 'london', '  HEATHROW '), [outside])
  assert.deepEqual(filterCameras([camera, edge, outside], 'london', '00001.00002'), [outside])
  assert.deepEqual(filterCameras([camera, outside], 'nearby', 'Heathrow'), [])
})
