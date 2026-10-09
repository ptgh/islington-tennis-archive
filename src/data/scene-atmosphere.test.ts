import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createTownLife } from '../scene/createTownLife.ts'
import { lightCycle, skyPosition, updateSceneLight } from '../scene/sceneAtmosphere.ts'

test('venue-only life animates players and balls, pauses, and never projects transport', () => {
  const world = createTownLife([{ center: new THREE.Vector3(10, 0, 20), rotation: 0, scale: 1.25, halfLength: 9.5 }], [], () => { throw new Error('Venue scenes must not construct Islington transport') }, [], false)
  const meshes: THREE.InstancedMesh[] = []
  world.root.traverse(node => { if (node instanceof THREE.InstancedMesh) meshes.push(node) })
  const snapshot = () => meshes.map(mesh => Array.from(mesh.instanceMatrix.array))
  const before = snapshot()
  world.animate(.8, true, false)
  assert.notDeepEqual(snapshot(), before)
  const moving = snapshot()
  world.animate(20, false, false)
  assert.deepEqual(snapshot(), moving)
  // Both baselines have players, and the ball stays within the enlarged court.
  const balls = meshes.find(mesh => mesh.count === 1)!
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3()
  for (let i = 0; i < 200; i++) {
    world.animate(.08, true, false)
    balls.getMatrixAt(0, matrix); position.setFromMatrixPosition(matrix)
    assert.ok(Math.abs(position.z - 20) <= 9.5 * 1.25)
  }
})

test('clock-led lighting changes direction across a London day and softens in rain', () => {
  const morning = lightCycle(new Date('2026-10-05T07:00:00Z'), false, 'clear')
  const evening = lightCycle(new Date('2026-10-05T16:00:00Z'), false, 'clear')
  // Light comes from the east in the morning, west in the evening.
  assert.ok(morning.direction.x > 0 && evening.direction.x < 0)
  const noon = lightCycle(new Date('2026-10-05T12:00:00Z'), false, 'clear')
  assert.ok(evening.warmth > noon.warmth && morning.warmth > noon.warmth)
  const wet = lightCycle(new Date('2026-10-05T16:00:00Z'), false, 'rain')
  assert.ok(wet.direct < evening.direct && wet.ambient > evening.ambient)
  for (const night of [false, true]) for (let hour = 0; hour < 24; hour++) {
    const cycle = lightCycle(new Date(Date.UTC(2026, 9, 5, hour)), night, 'cloud')
    assert.ok(cycle.direction.y > 0 && Number.isFinite(cycle.direct))
  }
})

test('seasonal sun elevation shortens summer shadows and stays continuous across DST', () => {
  const summer = skyPosition(new Date('2026-06-21T12:00:00Z')).sun
  const winter = skyPosition(new Date('2026-12-21T12:00:00Z')).sun
  assert.ok(summer.y > .85 && winter.y < .3 && winter.y > .2)
  assert.ok(summer.z > 0 && winter.z > 0, 'noon sun is south of London')
  const before = skyPosition(new Date('2026-10-25T00:59:59Z')).sun
  const after = skyPosition(new Date('2026-10-25T01:00:01Z')).sun
  assert.ok(before.distanceTo(after) < .001, 'civil clock change must not jump the sun')
})

test('full moon is brighter than new moon; cloud and the horizon attenuate moonlight', () => {
  // Reference lunation: new 6 Jan 2000, full 21 Jan 2000.
  const fullDate = new Date('2000-01-21T00:00:00Z')
  const newDate = new Date('2000-01-06T00:00:00Z')
  const full = lightCycle(fullDate, true, 'clear')
  const dark = lightCycle(newDate, true, 'clear')
  const cloud = lightCycle(fullDate, true, 'cloud')
  assert.ok(full.illumination > .99 && dark.illumination < .02)
  assert.ok(full.moonAboveHorizon && full.direct > .6)
  assert.ok(full.direct > dark.direct && full.ambient > dark.ambient)
  assert.ok(cloud.direct < full.direct && cloud.ambient < full.ambient)
  assert.equal(dark.direct, 0, 'a moon below the horizon casts no moonlight')
})

test('manual day/night remain usable without pretending the override is live time', () => {
  assert.equal(lightCycle(new Date('2026-06-21T00:00:00Z'), false, 'clear').preview, true)
  assert.equal(lightCycle(new Date('2026-06-21T12:00:00Z'), true, 'clear').preview, true)
  assert.equal(lightCycle(new Date('2026-06-21T12:00:00Z'), false, 'clear').preview, false)
})

test('moving the camera target preserves lighting direction and night lighting stays cool', () => {
  const sun = new THREE.DirectionalLight(), ambient = new THREE.HemisphereLight()
  const date = new Date('2026-10-05T21:00:00Z'), a = new THREE.Vector3(), b = new THREE.Vector3(100, 0, -80)
  updateSceneLight(sun, ambient, a, 300, date, true, 'clear')
  const direction = sun.position.clone().sub(sun.target.position)
  updateSceneLight(sun, ambient, b, 300, date, true, 'clear')
  assert.ok(direction.distanceTo(sun.position.clone().sub(sun.target.position)) < 1e-8)
  assert.ok(sun.color.b > sun.color.r)
  assert.deepEqual(sun.target.position.toArray(), b.toArray())
})
