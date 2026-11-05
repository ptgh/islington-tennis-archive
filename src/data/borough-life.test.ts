import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import fs from 'node:fs'
import { createBoroughLife,createBoroughLifeAssets } from '../scene/createBoroughLife.ts'
import { inPolygon,lifePaths,lifePose,roadLifePose } from '../scene/boroughLifePaths.ts'
import { boroughGeography,boroughCourts,type BoroughCell } from '../scene/boroughGeometry.ts'
import { createBoroughMaterials } from '../scene/createBoroughTile.ts'
import { createTrafficSpace } from '../scene/trafficSpace.ts'
const source=(id:string):BoroughCell=>JSON.parse(fs.readFileSync('public/'+boroughGeography.cells.find(c=>c.id===id)!.url,'utf8'))

test('local actors use bounded source paths and keep off buildings and courts',()=>{
 for(const id of ['2_-1','1_-1','3_4']){
  const data=source(id),paths=lifePaths(data)
  assert.ok(paths.cars.length<=3&&paths.walkers.length<=8&&paths.foxes.length<=1&&paths.birds.length<=2&&paths.boats.length<=1)
  for(const path of [...paths.cars,...paths.walkers,...paths.foxes])for(let i=0;i<=100;i++){
   const x=path.a[0]+(path.b[0]-path.a[0])*i/100,z=path.a[1]+(path.b[1]-path.a[1])*i/100
   assert.ok(!data.buildings.some(f=>inPolygon(x,z,f)),id+' actor inside building')
   assert.ok(!boroughCourts.some(f=>inPolygon(x,z,f)),id+' actor inside court')
  }
 }
})
test('narrowboat full hull stays in mapped water throughout its reversible run',()=>{
 const data=source('3_4'),paths=lifePaths(data);assert.equal(paths.boats.length,1)
 for(const path of paths.boats){
  const dx=(path.b[0]-path.a[0])/path.length,dz=(path.b[1]-path.a[1])/path.length
  for(let i=0;i<=200;i++){
   const p=lifePose(path,i*4,.035,8)
   for(const end of [-1,0,1])for(const side of [-1,1])assert.ok(data.water.some(f=>inPolygon(p.x+dx*end*.9-dz*side*.1,p.z+dz*end*.9+dx*side*.1,f)),'boat crosses towpath')
  }
 }
})
test('life animation freezes on pause and night swaps flying birds for foxes',()=>{
 const assets=createBoroughLifeAssets(),life=createBoroughLife(source('1_-1'),assets)
 try{
  assert.ok(life.root.userData.counts.people>0&&life.root.userData.counts.trains>0&&life.root.userData.counts.foxes>0)
  const mesh=life.root.getObjectByName('Borough car') as THREE.InstancedMesh
  const before=Array.from(mesh.instanceMatrix.array)
  life.animate(1,true,true);assert.notDeepEqual(Array.from(mesh.instanceMatrix.array),before)
  const moved=Array.from(mesh.instanceMatrix.array);life.animate(10,false,false);assert.deepEqual(Array.from(mesh.instanceMatrix.array),moved)
  const fox=life.root.getObjectByName('Borough fox')!,bird=life.root.getObjectByName('Borough bird')!
  const train=life.root.getObjectByName('Borough train')!;assert.equal(train.visible,true);life.setTrains(false);assert.equal(train.visible,false);life.setTrains(true);assert.equal(train.visible,true);
  life.setNight(false);assert.equal(fox.visible,false);assert.equal(bird.visible,true)
  life.setNight(true);assert.equal(fox.visible,true);assert.equal(bird.visible,false)
  life.root.traverse(o=>{if(o instanceof THREE.InstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite))})
  let disposed=0;mesh.addEventListener('dispose',()=>disposed++);life.dispose();assert.equal(disposed,1)
 }finally{assets.dispose()}
})
test('signals cycle through red, amber and green, and the car stops at red',()=>{
 const data=source('1_-1'),assets=createBoroughLifeAssets(),life=createBoroughLife(data,assets)
 try{
  const route=life.routes.cars.find(r=>r.width>=.75)
  assert.ok(route)
  let red=false,amber=false,green=false
  for(let second=0;second<route.length/.5*3+30;second+=.25){const p=lifePose(route,second,.5,5);red||=p.stopped;amber||=p.amber;green||=!p.stopped&&!p.amber}
  assert.ok(red&&amber&&green)
 }finally{life.dispose();assets.dispose()}
})
test('water ripple and foliage/grass gust clocks are shared and do not allocate new textures',()=>{
 const materials=createBoroughMaterials()
 try{
  const water={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{} as Record<string,{value:number}>}
  materials.water.onBeforeCompile(water as Parameters<typeof materials.water.onBeforeCompile>[0],{} as THREE.WebGLRenderer)
  materials.animateSurfaces(12,.02);assert.equal(water.uniforms.boroughWaterTime.value,12)
  assert.match(water.fragmentShader,/ripples/)
  const grass={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{} as Record<string,{value:number}>}
  materials.finishes.parkGrass.onBeforeCompile(grass as Parameters<typeof materials.water.onBeforeCompile>[0],{} as THREE.WebGLRenderer)
  materials.finishes.setWind(12,.03);assert.equal(grass.uniforms.miniatureLawnTime.value,12);assert.equal(grass.uniforms.miniatureLawnWind.value,.03)
 }finally{materials.dispose()}
})

test('a whole narrowboat hull clears a mapped footbridge and an island between sample corners',()=>{
 const data:BoroughCell={buildings:[],parks:[],trees:[],railways:[],roads:[{id:1,kind:'footway',points:[[-1,0],[1,0]]}],water:[{id:2,points:[[-.3,-10],[.3,-10],[.3,10],[-.3,10],[-.3,-10]],holes:[[[-.2,4],[.2,4],[.2,5],[-.2,5],[-.2,4]]]}]}
 const paths=lifePaths(data);assert.equal(paths.boats.length,1)
 const path=paths.boats[0]
 for(let t=0;t<1200;t+=2){const p=lifePose(path,t,.035,8);assert.ok(Math.abs(p.z)>1.08,'boat hull intersects the footbridge');assert.ok(inPolygon(p.x,p.z,data.water[0]))}
})
test('evicting one activity cell does not dispose another cell’s shared models',()=>{
 const assets=createBoroughLifeAssets(),a=createBoroughLife(source('1_-1'),assets),b=createBoroughLife(source('2_-1'),assets)
 let disposed=0;assets.geometry.car.addEventListener('dispose',()=>disposed++)
 a.dispose();assert.equal(disposed,0);b.animate(.5,true,true);b.dispose();assert.equal(disposed,0)
 assets.dispose();assert.equal(disposed,1)
})
test('bicycles and motorbikes move, street lamps switch on at night, and hidden cells release traffic',()=>{
 const assets=createBoroughLifeAssets(),space=createTrafficSpace(),life=createBoroughLife(source('1_-1'),assets,space)
 try{
  const cycle=life.root.getObjectByName('Borough cycle') as THREE.InstancedMesh,motor=life.root.getObjectByName('Borough motorbike') as THREE.InstancedMesh
  assert.ok(cycle?.count&&motor?.count)
  const before=[cycle,motor].map(m=>Array.from(m.instanceMatrix.array))
  for(let i=0;i<100;i++)life.animate(.05,true,false)
  for(const [i,m] of [cycle,motor].entries())assert.notDeepEqual(Array.from(m.instanceMatrix.array),before[i])
  const bulbs=life.root.getObjectByName('Borough streetlight bulbs')!,pools=life.root.getObjectByName('Borough streetlight pools')!
  assert.equal(bulbs.visible,false);assert.equal(pools.visible,false)
  life.setNight(true);assert.equal(bulbs.visible,true);assert.equal(pools.visible,true)
  assert.ok(space.size>0);life.clearTraffic();assert.equal(space.size,0)
  assert.ok(Array.from(cycle.instanceMatrix.array).every(v=>v===0),'hidden cell retained a stale vehicle pose')
  life.animate(.05,true,false);assert.ok(space.size>0)
  life.dispose();assert.equal(space.size,0)
 }finally{assets.dispose()}
})

test('pedestrian strides stay attached at the joints and freeze while only trains run',()=>{
 const assets=createBoroughLifeAssets(),life=createBoroughLife(source('1_-1'),assets)
 try{
  const body=life.root.getObjectByName('Borough person') as THREE.InstancedMesh
  const legs=life.root.getObjectByName('Borough leg') as THREE.InstancedMesh
  const arms=life.root.getObjectByName('Borough arm') as THREE.InstancedMesh
  assert.equal(legs.count,body.count*2);assert.equal(arms.count,body.count*2)
  const a=new THREE.Matrix4(),b=new THREE.Matrix4(),joint=new THREE.Vector3()
  const before=Array.from(legs.instanceMatrix.array)
  for(let frame=0;frame<40;frame++){
   life.animate(.1,true,true)
   for(let person=0;person<body.count;person++){
    body.getMatrixAt(person,a)
    for(const side of [-1,1])for(const [limb,x,y] of [[legs,.017,.08],[arms,.037,.1325]] as const){
     limb.getMatrixAt(person*2+(side===1?1:0),b)
     joint.set(side*x,y,0).applyMatrix4(a)
     assert.ok(joint.distanceTo(new THREE.Vector3().setFromMatrixPosition(b))<1e-5,'limb detached from joint')
    }
   }
  }
  assert.notDeepEqual(Array.from(legs.instanceMatrix.array),before)
  const paused=[legs,arms,body].map(m=>Array.from(m.instanceMatrix.array))
  life.animate(2,false,true)
  for(const [i,m] of [legs,arms,body].entries())assert.deepEqual(Array.from(m.instanceMatrix.array),paused[i])
 }finally{life.dispose();assets.dispose()}
})

test('road users keep left, wait without steering, then turn only at bounded endpoints',()=>{
 const path={a:[0,0],b:[0,10],length:10,width:1,seed:0};
 let old=roadLifePose(path,0,.5),turns=0;
 for(let time=.02;time<120;time+=.02){const p=roadLifePose(path,time,.5),yaw=Math.atan2(Math.sin(p.heading-old.heading),Math.cos(p.heading-old.heading));
  assert.ok(Math.abs(yaw)<.04,'steering jumped or spun');assert.ok(Math.hypot(p.x-old.x,p.z-old.z)<.02,'lane change teleported');
  assert.ok(p.z>=-.126&&p.z<=10.126&&Math.abs(p.x)<=.126,'turn left its source-road envelope');
  if(p.stopped&&old.stopped){assert.ok(Math.abs(p.x-old.x)<1e-9&&Math.abs(p.z-old.z)<1e-9);assert.ok(Math.abs(yaw)<1e-9);}
  if(p.turning){turns++;assert.ok(p.z<=.126||p.z>=9.874,'turn occurred mid-road');}
  else assert.ok(p.forward?p.x>0:p.x<0,'vehicle left its UK lane');old=p;
 }
 assert.ok(turns>100);
});
test('cyclists use independent checked road runs instead of being trapped under cars',()=>{
 const paths=lifePaths(source('1_-1'));assert.ok(paths.cycles.length>0);
 for(const r of paths.cycles)assert.ok(!paths.cars.some(car=>car.seed===r.seed));
});

test('street-life shortcuts locate a rendered rider and release duplicate-cell ownership on disposal',()=>{
 const data=source('1_-1'),assets=createBoroughLifeAssets(),space=createTrafficSpace(),first=createBoroughLife(data,assets,space),second=createBoroughLife(data,assets,space);
 try{const cyclist=first.lifeLocation('cycle');assert.ok(cyclist&&cyclist.toArray().every(Number.isFinite));assert.equal(second.lifeLocation('cycle'),null);
 first.dispose();second.animate(.05,true,false);assert.ok(second.lifeLocation('cycle'));const fox=second.lifeLocation('fox');assert.ok(fox&&fox.toArray().every(Number.isFinite));
 }finally{first.dispose();second.dispose();assets.dispose()}
});
