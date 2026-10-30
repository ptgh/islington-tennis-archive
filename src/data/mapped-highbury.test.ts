import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createMappedHighbury, mappedHighburyGroups } from '../scene/createMappedHighbury.ts'
import { highburyCourts, highburyGeography, projectPoint } from '../scene/courtGeometry.ts'

test('mapped Highbury preserves every source court position, dimension and orientation at geographic scale', () => {
  const mapped = createMappedHighbury()
  try {
    const courts = mapped.root.getObjectByName('Mapped tennis surfaces') as THREE.InstancedMesh
    assert.equal(courts.count, 11)
    for (let i = 0; i < courts.count; i++) {
      const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion()
      courts.getMatrixAt(i, matrix); matrix.decompose(position, rotation, scale)
      const source = highburyCourts[i]
      assert.ok(Math.abs(position.x - source.x) < 1e-5 && Math.abs(position.z - source.z) < 1e-5)
      assert.ok(Math.abs(scale.x - source.width) < 1e-5 && Math.abs(scale.z - source.depth) < 1e-5)
      const expected = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, source.rotation, 0))
      assert.ok(rotation.angleTo(expected) < .001)
    }
    assert.deepEqual(mappedHighburyGroups.map(group => group.count), [3, 8])
  } finally { mapped.dispose() }
})
test('mapped buildings retain source vertices and every generated buffer is finite', () => {
  const mapped = createMappedHighbury()
  try {
    assert.equal(mapped.root.userData.coverage.buildings, 724)
    assert.equal(mapped.root.userData.coverage.parkPolygons, 2)
    const buildings = mapped.root.getObjectByName('Mapped building footprints') as THREE.Mesh
    const positions = buildings.geometry.getAttribute('position'), points = new Set<string>()
    for (let i = 0; i < positions.count; i++) points.add(`${positions.getX(i).toFixed(4)},${positions.getZ(i).toFixed(4)}`)
    for (const building of highburyGeography.buildings) for (const [lng, lat] of building.points) {
      const [x, z] = projectPoint(lng, lat)
      // Float32 upload may round across a decimal boundary; compare within 0.1 mm world units.
      assert.ok([...points].some(point => { const [px, pz] = point.split(',').map(Number); return Math.abs(px-x)<.00011 && Math.abs(pz-z)<.00011 }))
    }
    mapped.root.traverse(object => { if (object instanceof THREE.Mesh) { assert.ok(Array.from(object.geometry.getAttribute('position').array).every(Number.isFinite)); if (object instanceof THREE.InstancedMesh) assert.ok(Array.from(object.instanceMatrix.array).every(Number.isFinite)) } })
  } finally { mapped.dispose() }
})
