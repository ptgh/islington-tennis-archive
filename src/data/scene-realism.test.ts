import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {routeStreetAroundCourts} from '../scene/streetNetwork.ts'
import {pedestrianPaths} from '../scene/pedestrianPaths.ts'
import {courtAreas,inCourtArea,type CourtArea} from '../scene/courtGeometry.ts'
import {createTownLife} from '../scene/createTownLife.ts'
import {createMiniatureMaterials,cloneArchitecturalFinish} from '../scene/miniatureMaterials.ts'
import {venues} from './venues.ts'

test('ordinary streets remain connected around rotated and overlapping court compounds',()=>{
 const areas:CourtArea[]=[
  {x:0,z:0,halfWidth:7,halfDepth:14,rotation:.45},
  {x:12,z:12,halfWidth:6,halfDepth:12,rotation:-.25},
 ]
 for(const width of [4.6,8,10])for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,a:[number,number]=[Math.cos(angle)*70,Math.sin(angle)*70],b:[number,number]=[-a[0],-a[1]]
  const road=routeStreetAroundCourts([a,b],areas,width)
  assert.deepEqual(road[0],a);assert.deepEqual(road.at(-1),b)
  for(let n=1;n<road.length;n++)for(let t=0;t<=1;t+=.01){
   const x=road[n-1][0]+(road[n][0]-road[n-1][0])*t,z=road[n-1][1]+(road[n][1]-road[n-1][1])*t
   assert.equal(inCourtArea(x,z,areas,width/2+1.2),false)
  }
 }
 const clear:[number,number][]=[[-60,-60],[-50,-40],[-30,-50]]
 assert.deepEqual(routeStreetAroundCourts(clear,areas,5),clear)
})

test('street junctions inside a court move outside instead of leaving clipped stubs',()=>{
 const areas=courtAreas(venues)
 for(const a of areas){
  const line=routeStreetAroundCourts([[a.x,a.z],[a.x+100,a.z+80]],areas,6)
  assert.ok(line.length>=2)
  for(let i=1;i<line.length;i++)for(let t=0;t<=1;t+=.025){
   assert.equal(inCourtArea(THREE.MathUtils.lerp(line[i-1][0],line[i][0],t),THREE.MathUtils.lerp(line[i-1][1],line[i][1],t),areas,4),false)
  }
 }
})

test('pedestrians follow drawn straight paths, reverse on open pieces and remain clear of courts',()=>{
 const area:CourtArea={x:0,z:0,halfWidth:5,halfDepth:5,rotation:0}
 const loop=[new THREE.Vector3(-20,0,-3),new THREE.Vector3(20,0,-3),new THREE.Vector3(20,0,20),new THREE.Vector3(-20,0,20)]
 const routes=pedestrianPaths(loop,[area])
 assert.ok(routes.length>0&&routes.every(r=>!r.closed))
 const life=createTownLife([], [loop],()=>new THREE.Vector3(),[area],false)
 const people:THREE.Object3D[]=[]
 life.root.traverse(node=>{if(node.name==='Miniature pedestrian')people.push(node)})
 assert.ok(people.length>0)
 for(let step=0;step<3000;step++){
  life.animate(.08,true,false)
  for(const person of people){
   assert.equal(inCourtArea(person.position.x,person.position.z,[area],1),false)
   const closest=Math.min(...routes.flatMap(r=>r.points.slice(1).map((b,i)=>{
    const point=new THREE.Vector3();new THREE.Line3(r.points[i],b).closestPointToPoint(person.position,true,point)
    return Math.hypot(point.x-person.position.x,point.z-person.position.z)
   })))
   assert.ok(closest<.001,'walker stays on a drawn path')
  }
 }
 const pose=()=>people.map(p=>{const state:number[][]=[];p.traverse(n=>state.push([...n.position.toArray(),...n.quaternion.toArray()]));return state})
 const before=pose()
 life.animate(20,false,false)
 assert.deepEqual(pose(),before,'pausing freezes the entire pose as well as position')
})

test('walkers ease through stops without exceeding their walking speed or jumping on restart',()=>{
 const loop=[new THREE.Vector3(0,0,0),new THREE.Vector3(20,0,0),new THREE.Vector3(20,0,20),new THREE.Vector3(0,0,20)]
 const life=createTownLife([], [loop],()=>new THREE.Vector3(),[],false)
 const walker=life.root.getObjectByName('Miniature pedestrian')!
 let previous=walker.position.clone(),firstSpeed=0,maxSpeed=0,stopped=0
 for(let frame=0;frame<3600;frame++){
  life.animate(1/60,true,false)
  const speed=Math.hypot(walker.position.x-previous.x,walker.position.z-previous.z)*60
  if(frame===0)firstSpeed=speed
  maxSpeed=Math.max(maxSpeed,speed)
  if(frame>60&&speed<1e-7)stopped++
  assert.ok(speed<=.801,'no teleport or speed spike at pauses, corners or loop boundaries')
  previous.copy(walker.position)
 }
 assert.ok(firstSpeed<.1,'walking accelerates from rest')
 assert.ok(maxSpeed>.79,'cruising reaches the existing walking speed')
 assert.ok(stopped>60,'a scheduled pause comes to a complete stop')
})

test('walking distance and limb pose remain consistent across frame rates',()=>{
 const loop=[new THREE.Vector3(0,0,0),new THREE.Vector3(20,0,0),new THREE.Vector3(20,0,20),new THREE.Vector3(0,0,20)]
 const sample=(delta:number)=>{
  const life=createTownLife([], [loop],()=>new THREE.Vector3(),[],false)
  for(let i=0;i<Math.round(10/delta);i++)life.animate(delta,true,false)
  const person=life.root.getObjectByName('Miniature pedestrian')!,pose:number[]=[]
  // Heading interpolation may settle at different rates around a corner;
  // translation and the distance-driven gait must agree at the same elapsed time.
  person.traverse(n=>pose.push(...n.position.toArray(),n.rotation.x))
  return pose
 }
 const fast=sample(1/60),slow=sample(1/20)
 fast.forEach((v,i)=>assert.ok(Math.abs(v-slow[i])<1e-8))
})

test('buses retain their size through a complete outbound and return trip',()=>{
 const areas=courtAreas(venues),project=(lat:number,lng:number)=>new THREE.Vector3((lng+.115)*6900,0,-(lat-51.549)*11100)
 const life=createTownLife([],[],project,areas),buses:THREE.Object3D[]=[]
 life.root.traverse(node=>{if(node.name==='Miniature bus')buses.push(node)})
 assert.ok(buses.length>=2)
 for(let step=0;step<5000;step++){
  life.animate(.1,false,true)
  for(const bus of buses){assert.equal(bus.visible,true);assert.equal(bus.scale.x,.3);assert.equal(inCourtArea(bus.position.x,bus.position.z,areas,.9),false)}
 }
 const before=buses.map(p=>p.position.toArray())
 life.animate(30,false,false)
 assert.deepEqual(buses.map(p=>p.position.toArray()),before)
})

test('bus lamps update cloned vehicles at night without moving or rebuilding them',()=>{
 const life=createTownLife([],[],(lat,lng)=>new THREE.Vector3((lng+.115)*6900,0,-(lat-51.549)*11100),courtAreas(venues));
 const buses:THREE.Object3D[]=[],heads:THREE.InstancedMesh[]=[],tails:THREE.InstancedMesh[]=[];
 life.root.traverse(node=>{
  if(node.name==='Miniature bus')buses.push(node);
  if(node instanceof THREE.InstancedMesh&&node.name==='Bus headlamps')heads.push(node);
  if(node instanceof THREE.InstancedMesh&&node.name==='Bus tail lamps')tails.push(node);
 });
 assert.equal(heads.length,buses.length);assert.equal(tails.length,buses.length);assert.ok(buses.length>=2);
 const lamps=[...heads,...tails],positions=buses.map(bus=>bus.position.toArray());
 const materials=lamps.map(mesh=>mesh.material as THREE.MeshStandardMaterial),versions=materials.map(m=>m.version);
 assert.ok(heads.every(mesh=>mesh.material===heads[0].material),'cloned buses share the lamp material');
 try{
  for(let cycle=0;cycle<3;cycle++){
   life.setNight(true);
   heads.forEach(mesh=>assert.equal((mesh.material as THREE.MeshStandardMaterial).emissiveIntensity,1));
   tails.forEach(mesh=>assert.equal((mesh.material as THREE.MeshStandardMaterial).emissiveIntensity,.65));
   life.setNight(false);
   heads.forEach(mesh=>assert.equal((mesh.material as THREE.MeshStandardMaterial).emissiveIntensity,.03));
   tails.forEach(mesh=>assert.equal((mesh.material as THREE.MeshStandardMaterial).emissiveIntensity,.02));
   assert.deepEqual(buses.map(bus=>bus.position.toArray()),positions);assert.deepEqual(materials.map(m=>m.version),versions);
  }
 }finally{
  const geometries=new Set<THREE.BufferGeometry>(),ownedMaterials=new Set<THREE.Material>();
  life.root.traverse(node=>{if(node instanceof THREE.Mesh){geometries.add(node.geometry);(Array.isArray(node.material)?node.material:[node.material]).forEach(m=>ownedMaterials.add(m));}});
  geometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());
 }
})

test('building and ground finishes preserve shared relief and release owned textures once',()=>{
 const finishes=createMiniatureMaterials()
 for(const material of [finishes.stucco,finishes.seamRoof,finishes.membrane,finishes.asphalt,finishes.paving,finishes.parkPath]){
  assert.ok(material.map&&material.bumpMap)
  const bytes=material.map.image.data
  assert.ok(new Set(bytes).size>10,'surface is not a uniform fill')
  const copy=cloneArchitecturalFinish(material,'#ffffff')
  assert.equal(copy.map,material.map)
  assert.equal(copy.onBeforeCompile,material.onBeforeCompile)
  copy.dispose()
 }
 let released=0
 finishes.seamRoof.map!.addEventListener('dispose',()=>released++)
 finishes.paving.bumpMap!.addEventListener('dispose',()=>released++)
 for(const material of [finishes.slate,finishes.seamRoof,finishes.membrane,finishes.asphalt]){
  const roughness=material.roughnessMap!
  assert.ok(roughness,'surface sheen varies independently of its colour')
  assert.equal(roughness.colorSpace,THREE.NoColorSpace)
  assert.ok(new Set(roughness.image.data).size>10)
  const copy=cloneArchitecturalFinish(material,'#ffffff')
  assert.equal(copy.roughnessMap,roughness)
  copy.dispose()
  roughness.addEventListener('dispose',()=>released++)
 }
 finishes.dispose();finishes.dispose()
 assert.equal(released,6)
})

test('rain updates shared ground clones and restores dry finishes without recompiling',()=>{
 const finishes=createMiniatureMaterials(),copy=cloneArchitecturalFinish(finishes.asphalt,'#85897e');
 try{
  const compile=(material:THREE.MeshStandardMaterial)=>{
   const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
   material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0],{} as THREE.WebGLRenderer);
   return shader as typeof shader & {uniforms:Record<string,{value:number}>};
  };
  const road=compile(finishes.asphalt),clone=compile(copy),paving=compile(finishes.paving),path=compile(finishes.parkPath);
  assert.equal(road.uniforms.miniatureRainWetness,clone.uniforms.miniatureRainWetness);
  assert.equal(road.uniforms.miniatureRainWetness,paving.uniforms.miniatureRainWetness);
  assert.equal(road.uniforms.miniatureRainWetness,path.uniforms.miniatureRainWetness);
  const key=copy.customProgramCacheKey();
  finishes.setRain(true);assert.equal(clone.uniforms.miniatureRainWetness.value,1);
  finishes.setRain(false);assert.equal(clone.uniforms.miniatureRainWetness.value,0);
  assert.equal(copy.customProgramCacheKey(),key);
 }finally{copy.dispose();finishes.dispose();}
})
