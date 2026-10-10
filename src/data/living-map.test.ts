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
  const gear=createGear(project,courtAreas(venues))
  const life=createTownLife([],[],project,courtAreas(venues))
  const roadUsers:THREE.Group[]=[]
  life.root.traverse(node=>{if(node instanceof THREE.Group && /^Miniature (car|cyclist)$/.test(node.name))roadUsers.push(node)})
  for(let frame=0;frame<15000;frame++){
    gear.animate(.08,true)
    life.animate(.08,true,false)
    for(const model of roadUsers)if(model.visible)assert.ok(model.position.distanceTo(gear.van.position)>3.5,'road user and van should not overlap')
  }
})

test('road users never vanish and turn round smoothly at the ends of their stretch', () => {
  const life=createTownLife([],[],project,courtAreas(venues))
  const riders:THREE.Group[]=[]
  life.root.traverse(node=>{if(node instanceof THREE.Group && /^Miniature (car|cyclist)$/.test(node.name))riders.push(node)})
  life.animate(1/60,true,false)
  const heading=riders.map(r=>r.rotation.y), position=riders.map(r=>r.position.clone())
  const move=riders.map(()=>new THREE.Vector3())
  let reversals=0
  for(let frame=0;frame<20000;frame++){
    life.animate(1/60,true,false)
    riders.forEach((r,i)=>{
      assert.ok(r.visible,'rider stays visible');assert.equal(r.scale.x,1,'rider keeps full size')
      const turn=Math.abs(Math.atan2(Math.sin(r.rotation.y-heading[i]),Math.cos(r.rotation.y-heading[i])))
      assert.ok(turn<.35,`no snap turn (${turn.toFixed(2)} rad in one frame)`)
      const step=r.position.clone().sub(position[i])
      if(step.lengthSq()>1e-8&&move[i].lengthSq()>1e-8&&step.dot(move[i])<0)reversals++
      if(step.lengthSq()>1e-8)move[i].copy(step)
      heading[i]=r.rotation.y;position[i].copy(r.position)
    })
  }
  assert.ok(reversals>0,'the run covers at least one turn-round')
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

test('bus routes skirt Highbury Fields and bend around court enclosures', async () => {
  const { busRoutes } = await import('./busRoutes.ts')
  const { busRouteLine, ROUTE_COURT_CLEARANCE, HIGHBURY_PARK, PARK_ROAD_CLEARANCE } = await import('../scene/courtGeometry.ts')
  const areas = courtAreas(venues)
  for (const route of busRoutes) {
    const raw = route.points.map(([lng, lat]): [number, number] => { const p = project(lat, lng); return [p.x, p.z] })
    const bent = busRouteLine(raw, areas)
    assert.deepEqual(bent[0], raw[0]); assert.deepEqual(bent.at(-1), raw.at(-1))
    for (let i = 1; i < bent.length; i++) for (let s = 0; s <= 10; s++) {
      const x = bent[i - 1][0] + (bent[i][0] - bent[i - 1][0]) * s / 10, z = bent[i - 1][1] + (bent[i][1] - bent[i - 1][1]) * s / 10
      assert.equal(inCourtArea(x, z, areas, ROUTE_COURT_CLEARANCE - .3), false, `route ${route.id} crosses a court`)
      const rx = HIGHBURY_PARK.rx + PARK_ROAD_CLEARANCE - .3, rz = HIGHBURY_PARK.rz + PARK_ROAD_CLEARANCE - .3
      assert.ok(((x - HIGHBURY_PARK.x) / rx) ** 2 + ((z - HIGHBURY_PARK.z) / rz) ** 2 >= 1, `route ${route.id} crosses Highbury Fields`)
    }
  }
})
