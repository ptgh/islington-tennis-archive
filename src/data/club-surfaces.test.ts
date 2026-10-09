import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { clubCourtSurface, createClubSurfaces } from '../scene/clubSurfaces.ts'

test('club floors preserve grass and clay while selecting recorded hard surfaces', () => {
  assert.equal(clubCourtSurface('grass'), 'grass')
  assert.equal(clubCourtSurface('clay'), 'clay')
  assert.equal(clubCourtSurface('concrete'), 'concrete')
  assert.equal(clubCourtSurface('acrylic'), 'synthetic')
  assert.equal(clubCourtSurface('artificial_grass'), 'synthetic')
  assert.equal(clubCourtSurface(), 'grass')
})
test('scanned club surfaces have relief maps and open diamond fencing', () => {
  const fallback = new THREE.MeshStandardMaterial()
  const surfaces = createClubSurfaces(fallback)
  for (const material of [surfaces.grass, surfaces.concrete, surfaces.synthetic]) {
    assert.ok(material.map && material.normalMap && material.roughnessMap)
    assert.equal(material.map.colorSpace, THREE.SRGBColorSpace)
    assert.equal(material.normalMap.colorSpace, THREE.NoColorSpace)
  }
  const data = surfaces.fence.alphaMap?.image.data
  assert.ok(data?.includes(0) && data?.includes(255))
  surfaces.dispose(); fallback.dispose()
})