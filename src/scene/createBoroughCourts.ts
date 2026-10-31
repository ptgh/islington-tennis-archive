import * as THREE from 'three'
import { boroughCourts } from './boroughGeometry.ts'
import { createClubSurfaces, cloneCourtFinish, courtFenceGeometry } from './clubSurfaces.ts'
import { createCourtNetGeometries } from './courtNet.ts'
import { createTownLife } from './createTownLife.ts'
import type { BoroughMaterials } from './createBoroughTile.ts'

/** Real court dimensions/orientations. Indoor courts remain inside their mapped halls. */
export function createBoroughCourts(materials:BoroughMaterials,invalidate:()=>void) {
 const root=new THREE.Group();root.name='Islington mapped tennis courts'
 const surfaces=createClubSurfaces(materials.finishes.hardCourt,invalidate)
 const outer=cloneCourtFinish(surfaces.synthetic);outer.color.set('#42787a')
 const litPlaying=cloneCourtFinish(surfaces.synthetic);litPlaying.emissive.set('#a4c9b2');litPlaying.emissiveIntensity=0
 const lamp=new THREE.MeshStandardMaterial({color:'#e0dfcc',emissive:'#fff3ca',emissiveIntensity:0})
 const courtNets=createCourtNetGeometries(.67,.065),owned:THREE.BufferGeometry[]=[courtNets.net,courtNets.tape]
 const animated:Parameters<typeof createTownLife>[0]=[]
 const batches=new Map<THREE.Material,THREE.Matrix4[]>(),transform=new THREE.Object3D()
 function part(g:THREE.Group,material:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number){transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,0,0);transform.updateMatrix();const list=batches.get(material)??[];list.push(g.matrixWorld.clone().multiply(transform.matrix));batches.set(material,list)}
 for(const c of boroughCourts){
  const g=new THREE.Group();g.position.set(c.x,0,c.z);g.rotation.y=c.rotation;g.scale.setScalar(.1);g.updateMatrixWorld(true)
  const w=c.width*10,d=c.depth*10,ow=w*1.45,od=d*1.32
  const playing=c.lit?litPlaying:c.surface==='grass'?surfaces.grass:c.surface==='clay'?surfaces.clay:surfaces.synthetic
  part(g,surfaces.concrete,0,.06,0,ow+.28,.08,od+.28)
  part(g,outer,0,.12,0,ow,.04,od);part(g,playing,0,.15,0,w,.02,d)
  for(const side of [-1,1]){
   part(g,materials.white,side*w/2,.164,0,.035,.008,d)
   part(g,materials.white,side*w*.375,.164,0,.035,.008,d)
   part(g,materials.white,0,.164,side*d/2,w,.008,.035)
   part(g,materials.white,0,.164,side*d*.27,w*.75,.008,.035)
   part(g,surfaces.steel,side*w*.57,.72,0,.08,1.1,.08)
   for(const along of [false,true]){
    const width=along?od:ow,fg=courtFenceGeometry(width,2.4);owned.push(fg)
    const fence=new THREE.Mesh(fg,surfaces.fence);fence.position.set(along?side*ow/2:0,1.35,along?0:side*od/2);fence.rotation.y=along?Math.PI/2:0;fence.updateMatrix();fence.applyMatrix4(g.matrixWorld);fence.receiveShadow=true;root.add(fence)
    for(let at=-width/2;at<=width/2+.001;at+=width/Math.ceil(width/3.6))part(g,surfaces.steel,along?side*ow/2:at,1.35,along?at:side*od/2,.055,2.4,.055)
   }
  }
  part(g,materials.white,0,.164,0,.035,.008,d*.54)
  const net=new THREE.Mesh(courtNets.net,materials.finishes.net);net.position.set(0,.67,0);net.scale.x=w*1.12;net.updateMatrix();net.applyMatrix4(g.matrixWorld);root.add(net)
  part(g,materials.white,0,1.14,0,w*1.12,.045,.04)
  // Seating and masts are illustrative furniture, always outside the playing area.
  part(g,materials.finishes.timber,ow/2+1.4,.65,0,.55,.12,2.4)
  for(const z of [-.8,.8])part(g,surfaces.steel,ow/2+1.4,.33,z,.28,.65,.1)
  if(c.lit)for(const side of [-1,1])for(const end of [-1,1]){part(g,surfaces.steel,side*(ow/2+.45),3.3,end*(od/2-.7),.10,6.6,.10);part(g,lamp,side*(ow/2+.45),6.6,end*(od/2-.7),.6,.18,.32)}
  if(c.width>.7&&c.width<2&&c.depth>1.6&&c.depth<3.4)animated.push({center:new THREE.Vector3(c.x,0,c.z),rotation:c.rotation,scale:.1,halfLength:c.depth*5*.9,groundY:.016,nightPlayable:c.lit})
 }
 for(const [material,matrices] of batches){const mesh=new THREE.InstancedMesh(materials.box,material,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.receiveShadow=true;mesh.castShadow=material===materials.finishes.timber||material===surfaces.steel;mesh.computeBoundingSphere();root.add(mesh)}
 const life=createTownLife(animated,[],()=>new THREE.Vector3(),[],false);root.add(life.root)
 return {root,setNight(value:boolean){life.setNight(value);litPlaying.emissiveIntensity=value?.22:0;lamp.emissiveIntensity=value?2:0},setActivity:life.setActivity,animate:life.animate,dispose(){
  owned.forEach(g=>g.dispose());outer.dispose();litPlaying.dispose();lamp.dispose();surfaces.dispose()
  const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>()
  life.root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m))}})
  geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());root.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose()})
 }}
}
