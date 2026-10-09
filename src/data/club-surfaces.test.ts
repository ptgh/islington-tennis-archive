import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { clubCourtSurface, createClubSurfaces, townCourtSurface, cloneCourtFinish, courtFenceGeometry } from '../scene/clubSurfaces.ts'
import { venues } from './venues.ts'

test('Islington finishes preserve recorded hard courts without inventing grass at mixed or unpublished venues', () => {
  for (const id of ['highbury-fields', 'islington-tennis-centre', 'rosemary-gardens', 'tufnell-park', 'spa-fields', 'barbican']) {
    const venue = venues.find(v => v.id === id)
    assert.ok(venue)
    assert.equal(townCourtSurface(venue.surface), 'synthetic', id)
  }
  assert.equal(townCourtSurface('Not published'), 'synthetic')
  assert.equal(townCourtSurface('Artificial clay / artificial grass'), 'synthetic')
  assert.equal(townCourtSurface('grass'), 'grass')
  assert.equal(townCourtSurface('concrete'), 'concrete')
  assert.equal(townCourtSurface('artificial clay'), 'clay')
})

test('floodlit surface clones retain wear shaders and fences keep uniform mesh spacing', () => {
  const fallback = new THREE.MeshStandardMaterial()
  const surfaces = createClubSurfaces(fallback)
  const lit = cloneCourtFinish(surfaces.synthetic)
  assert.equal(lit.onBeforeCompile, surfaces.synthetic.onBeforeCompile)
  assert.equal(lit.customProgramCacheKey(), surfaces.synthetic.customProgramCacheKey())
  assert.equal(lit.map, surfaces.synthetic.map)
  const fence = courtFenceGeometry(16, 2.6)
  const uv = fence.getAttribute('uv')
  assert.equal(uv.getX(1), 2)
  assert.ok(Math.abs(uv.getY(0) - 1.625) < .00001)
  fence.dispose();lit.dispose();surfaces.dispose();fallback.dispose()
})

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