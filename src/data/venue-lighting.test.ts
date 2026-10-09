import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createVenueLighting } from '../scene/createVenueLighting.ts'
import { createTownLife } from '../scene/createTownLife.ts'

test('roof lights are restricted to the two confirmed Wimbledon show courts', () => {
  const lighting = createVenueLighting()
  for (const venue of ['wimbledon', 'queens']) for (const court of ['centre', 'number-one', 'number-two', 'arena', 'outer']) lighting.add(venue, court, 20, 30, .3)
  assert.equal(lighting.root.children.length, 2)
  const lights: THREE.SpotLight[] = []
  lighting.root.traverse(node => { if (node instanceof THREE.SpotLight) lights.push(node) })
  assert.equal(lights.length, 8)
  const positions = lights.map(light => light.position.toArray())
  lighting.setNight(true)
  assert.ok(lights.every(light => light.intensity > 0 && !light.castShadow))
  lighting.setNight(false)
  assert.ok(lights.every(light => light.intensity === 0))
  assert.deepEqual(lights.map(light => light.position.toArray()), positions)
  lighting.dispose()
})

test('unlit venue courts stop showing night play and restore their paused daytime positions', () => {
  const life = createTownLife([false,true].map((nightPlayable,i) => ({center:new THREE.Vector3(i*30,0,0),rotation:.3,scale:1,nightPlayable})), [], () => new THREE.Vector3(), [], false)
  const meshes: THREE.InstancedMesh[] = []
  life.root.traverse(node => { if (node instanceof THREE.InstancedMesh) meshes.push(node) })
  const snapshot = () => meshes.map(mesh => Array.from(mesh.instanceMatrix.array))
  life.animate(.8,true,false)
  const day = snapshot()
  life.setNight(true)
  const balls = meshes.find(mesh => mesh.count===2)!
  const matrix = new THREE.Matrix4()
  balls.getMatrixAt(0,matrix); assert.equal(matrix.determinant(),0)
  balls.getMatrixAt(1,matrix); assert.ok(matrix.determinant()>0)
  life.animate(10,false,false)
  life.setNight(false)
  assert.deepEqual(snapshot(),day)
})
