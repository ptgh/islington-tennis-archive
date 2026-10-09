import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { venues } from './venues.ts'
import { courtAreas, inCourtArea } from '../scene/courtGeometry.ts'
import { createTownLife } from '../scene/createTownLife.ts'
import { createGear } from '../scene/createGear.ts'
import { createStreetLamps } from '../scene/createStreetLamps.ts'

const project = (lat:number,lng:number) => new THREE.Vector3((lng+.115)*6900,0,-(lat-51.549)*11100)

test('miniature cars and cyclists remain outside court enclosures and pause', () => {
  const areas=courtAreas(venues)
  const world=createTownLife([],[],project,areas)
  const traffic:THREE.Group[]=[]
  world.root.traverse(node=>{if(node instanceof THREE.Group && /^Miniature (car|cyclist)$/.test(node.name))traffic.push(node)})
  assert.equal(traffic.length,5)
  for(let frame=0;frame<1200;frame++){
    world.animate(.5,true,true)
    for(const model of traffic)if(model.visible)assert.equal(inCourtArea(model.position.x,model.position.z,areas,2.2),false)
  }
  const before=traffic.map(model=>model.position.toArray())
  world.animate(10,false,false)
  assert.deepEqual(traffic.map(model=>model.position.toArray()),before)
})

test('illustrated road users keep clear of the collection van', () => {
  const gear=createGear(project)
  const life=createTownLife([],[],project,courtAreas(venues))
  const roadUsers:THREE.Group[]=[]
  life.root.traverse(node=>{if(node instanceof THREE.Group && /^Miniature (car|cyclist)$/.test(node.name))roadUsers.push(node)})
  for(let frame=0;frame<15000;frame++){
    gear.animate(.08,true)
    life.animate(.08,true,false)
    for(const model of roadUsers)if(model.visible)assert.ok(model.position.distanceTo(gear.van.position)>3.5,'road user and van should not overlap')
  }
})

test('curbside lamps illuminate only in night mode', () => {
  const lamps=createStreetLamps([{points:[[-100,-200],[100,-200]],width:8},{points:[[-100,-120],[100,-120]],width:8}],[])
  const lit=()=>{let count=0;lamps.root.traverseVisible(node=>{if(node instanceof THREE.Sprite)count++});return count}
  assert.ok(lamps.count>=8,'lamps should be spread across more than one street')
  assert.equal(lit(),0)
  lamps.setNight(true);assert.equal(lit(),lamps.count)
  lamps.setNight(false);assert.equal(lit(),0)
  lamps.dispose()
})
