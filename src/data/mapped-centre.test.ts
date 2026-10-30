import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import geography from './centre-geography.json' with { type: 'json' }
import { createMappedCentre, centreCourts, mappedCentreCourtBounds } from '../scene/createMappedCentre.ts'
import { projectPoint } from '../scene/courtGeometry.ts'
import { mappedCoverageAt } from './mapCoverage.ts'

test('Centre coverage contains its hall and two outdoor footprints, excluding the gap between extracts', () => {
  assert.equal(mappedCoverageAt(51.5462388, -.1211113), 'islington-tennis-centre')
  assert.equal(mappedCoverageAt(51.549, -.11), null)
  assert.equal(mappedCoverageAt(51.551, -.099), 'highbury-fields')
  assert.equal(mappedCoverageAt(NaN, -.12), null)
  const hall = geography.buildings.find(building => building.id === 30198196)!
  assert.ok(hall)
  assert.deepEqual(centreCourts.map(court => court.id), [161419463, 161419464])
  for (const [lng, lat] of [...hall.points, ...geography.courts.flatMap(court => court.points)]) {
    assert.equal(mappedCoverageAt(lat, lng), 'islington-tennis-centre')
    const [x, z] = projectPoint(lng, lat)
    assert.ok(x >= mappedCentreCourtBounds.minX && x <= mappedCentreCourtBounds.maxX && z >= mappedCentreCourtBounds.minZ && z <= mappedCentreCourtBounds.maxZ)
  }
})
test('Centre renderer preserves outdoor dimensions and hall vertices without inventing indoor footprints', () => {
  const view = createMappedCentre()
  try {
    const courts = view.root.getObjectByName('Mapped tennis surfaces') as THREE.InstancedMesh
    assert.equal(courts.count, 2)
    assert.equal(view.root.userData.coverage.buildings, 294)
    for (let i = 0; i < courts.count; i++) {
      const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3()
      courts.getMatrixAt(i, matrix); matrix.decompose(position, rotation, scale)
      const source = centreCourts[i]
      assert.ok(Math.abs(position.x - source.x) < .00001 && Math.abs(position.z - source.z) < .00001)
      assert.ok(Math.abs(scale.x - source.width) < .00001 && Math.abs(scale.z - source.depth) < .00001)
      assert.ok(rotation.angleTo(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, source.rotation, 0))) < .001)
    }
    const buildings = view.root.getObjectByName('Mapped building footprints') as THREE.Mesh
    const positions = buildings.geometry.getAttribute('position')
    const vertices = Array.from({length: positions.count}, (_, i) => [positions.getX(i), positions.getZ(i)])
    for (const [lng, lat] of geography.buildings.find(building => building.id === 30198196)!.points) {
      const [x, z] = projectPoint(lng, lat)
      assert.ok(vertices.some(point => Math.abs(point[0] - x) < .00001 && Math.abs(point[1] - z) < .00001))
    }
    view.root.traverse(object => { if (object instanceof THREE.Mesh) assert.ok(Array.from(object.geometry.getAttribute('position').array).every(Number.isFinite)) })
  } finally { view.dispose() }
})
