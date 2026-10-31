import * as THREE from 'three'
import { boroughBounds, boroughGeography, courtsNearVenue, type BoroughCell } from './boroughGeometry.ts'
import { createBoroughMaterials, createBoroughTile } from './createBoroughTile.ts'
import { createBoroughCourts } from './createBoroughCourts.ts'
import { mapStations } from '../data/transit.ts'
import { createGear } from './createGear.ts'
import { createTownLife } from './createTownLife.ts'
import type { TownWorld, MapVenue } from './types.ts'
import { projectPoint } from './courtGeometry.ts'

const project=(lat:number,lng:number)=>{const [x,z]=projectPoint(lng,lat);return new THREE.Vector3(x,0,z)}
const sourceUrl=(path:string)=>`${import.meta.env?.BASE_URL??'/'}${path}`
type Tile=ReturnType<typeof createBoroughTile>
type Cell=typeof boroughGeography.cells[number]
export type IslingtonWorld=TownWorld & { ready:Promise<void>; updateView:(camera:THREE.Camera,zoom:number,target:THREE.Vector3)=>void; retry:()=>void; status:{loading:number;failed:number;loaded:number} }

/** One continuous source map. Stream/cull local detail in shared world coordinates;
 * the borough-wide overview remains present during loading and across cell seams. */
export function createIslington(venues:MapVenue[],invalidate:()=>void=()=>{}):IslingtonWorld {
 const root=new THREE.Group();root.name='Continuous Islington'
 const materials=createBoroughMaterials(),anchors=new Map<string,THREE.Vector3>(),courtFocusAnchors=new Map<string,THREE.Vector3>()
 for(const venue of venues){const courts=courtsNearVenue(venue.lat,venue.lng),point=courts.length?new THREE.Vector3(courts.reduce((s,c)=>s+c.x,0)/courts.length,.15,courts.reduce((s,c)=>s+c.z,0)/courts.length):project(venue.lat,venue.lng);anchors.set(venue.id,point);courtFocusAnchors.set(venue.id,point.clone())}
 const bounds=boroughBounds,w=bounds.maxX-bounds.minX,h=bounds.maxZ-bounds.minZ
 let overviewFailed=false
 const texture=typeof document==='undefined'?null:new THREE.TextureLoader().load(sourceUrl('map/islington-overview.png'),invalidate,undefined,()=>{overviewFailed=true;notify()})
 if(texture){texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8}
 const baseMaterial=new THREE.MeshStandardMaterial({color:texture?'#ffffff':'#a9b69b',map:texture,roughness:1})
 const baseGeometry=new THREE.PlaneGeometry(w,h);baseGeometry.rotateX(-Math.PI/2)
 const base=new THREE.Mesh(baseGeometry,baseMaterial);base.name='Whole Islington continuous base';base.position.set((bounds.minX+bounds.maxX)/2,-.02,(bounds.minZ+bounds.maxZ)/2);base.receiveShadow=true;root.add(base)
 const courts=createBoroughCourts(materials,invalidate);root.add(courts.root)
 const stations=mapStations.map(s=>({name:s.name,position:project(s.lat,s.lng).setY(.12),lines:s.lines}))
 const transport=createTownLife([],[],(lat,lng)=>project(lat,lng).multiplyScalar(10),[],true,true)
 transport.root.scale.setScalar(.1);root.add(transport.root)
 const gear=createGear((lat,lng)=>project(lat,lng).multiplyScalar(10),[],true);gear.root.scale.setScalar(.1);gear.van.scale.setScalar(1);root.add(gear.root)
 const vanPosition=new THREE.Vector3();gear.root.updateMatrixWorld(true);gear.van.getWorldPosition(vanPosition)
 const loaded=new Map<string,{tile:Tile;used:number}>(),loading=new Map<string,AbortController>(),failed=new Set<string>(),queue:Cell[]=[]
 const status={loading:0,failed:0,loaded:0};root.userData.streaming=status;root.userData.source={checked:boroughGeography.checked,counts:boroughGeography.counts,cells:boroughGeography.cells.length}
 let disposed=false,revision=0,lastKey='',desired=new Set<string>(),night=false
 let readyResolve:()=>void=()=>{};const ready=new Promise<void>(resolve=>{readyResolve=resolve})
 const sourceCells=boroughGeography.cells.map(cell=>({cell,box:new THREE.Box3(new THREE.Vector3(cell.bounds[0],-.1,cell.bounds[1]),new THREE.Vector3(cell.bounds[2],9,cell.bounds[3]))}))
 function notify(){status.loading=loading.size+queue.length;status.failed=failed.size+(overviewFailed?1:0);status.loaded=loaded.size;invalidate()}
 function evict(){while(loaded.size>20){const oldest=[...loaded.entries()].filter(([id])=>!desired.has(id)).sort((a,b)=>a[1].used-b[1].used)[0];if(!oldest)break;root.remove(oldest[1].tile.root);oldest[1].tile.dispose();loaded.delete(oldest[0])}}
 function pump(){
  if(disposed)return
  while(loading.size<2&&queue.length){
   const cell=queue.shift()!;if(loaded.has(cell.id)||loading.has(cell.id)||!desired.has(cell.id))continue
   const controller=new AbortController();let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;controller.abort()},15000);loading.set(cell.id,controller);notify()
   fetch(sourceUrl(cell.url),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Map cell unavailable');return r.json()}).then((data:BoroughCell)=>{
    if(disposed||!desired.has(cell.id))return
    const tile=createBoroughTile(data,materials);tile.root.userData.cellId=cell.id;root.add(tile.root);loaded.set(cell.id,{tile,used:++revision});failed.delete(cell.id);readyResolve();evict()
   }).catch(error=>{if(!disposed&&(error.name!=='AbortError'||timedOut))failed.add(cell.id)}).finally(()=>{clearTimeout(timeout);loading.delete(cell.id);if(!disposed&&desired.has(cell.id)&&!loaded.has(cell.id)&&!failed.has(cell.id)&&!queue.some(c=>c.id===cell.id))queue.push(cell);notify();if(!disposed){readyResolve();pump()}})
  }
  notify()
 }
 function request(cells:Cell[]){desired=new Set(cells.map(c=>c.id));for(const [id,item] of loaded){item.tile.root.visible=desired.has(id);if(desired.has(id))item.used=++revision}queue.splice(0,queue.length,...cells.filter(c=>!loaded.has(c.id)&&!loading.has(c.id)&&!failed.has(c.id)));for(const [id,c] of loading)if(!desired.has(id))c.abort();pump();evict()}
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4()
 function updateView(camera:THREE.Camera,zoom:number,target:THREE.Vector3){
  if(disposed)return
  // At overview scale the complete source-derived map replaces subpixel facade
  // detail. At court/street scale actual footprint geometry overlays that same map.
  matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix)
  const cells=zoom>=2.2?sourceCells.filter(({box})=>frustum.intersectsBox(box)).map(({cell})=>cell).sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)).slice(0,16):[]
  const key=cells.map(c=>c.id).sort().join(',');if(key!==lastKey){lastKey=key;request(cells)}
 }
 // Prime source detail at the first court before releasing the startup artwork.
 const first=anchors.get('highbury-fields')??project(51.5515,-.0988)
 request([...boroughGeography.cells].sort((a,b)=>Math.hypot(a.x-first.x,a.z-first.z)-Math.hypot(b.x-first.x,b.z-first.z)).slice(0,4))
 let previous=0,windTime=0,windStrength=0
 return {root,anchors,courtFocusAnchors,stations,vanPosition,ready,status,updateView,retry(){failed.clear();if(overviewFailed&&texture){new THREE.TextureLoader().load(sourceUrl('map/islington-overview.png'),loaded=>{if(disposed){loaded.dispose();return}texture.image=loaded.image;texture.needsUpdate=true;loaded.dispose();overviewFailed=false;notify()},undefined,()=>notify())}lastKey='';notify()},
 setWind(strength){windStrength=strength*.1},setRain:materials.finishes.setRain,setTransit(){},setActivity(value){courts.setActivity(value);transport.setActivity(value)},setBuses:transport.setBuses,setBusRoute:transport.setBusRoute,
 setNight(value){if(value===night)return;night=value;materials.setNight(value);courts.setNight(value);transport.setNight(value)},
 animate(seconds,_train,activity,buses){const delta=Math.min(.08,Math.max(0,seconds-previous));previous=seconds;if(activity)windTime+=delta;materials.finishes.setWind(windTime,windStrength);gear.animate(delta,activity);gear.root.updateMatrixWorld(true);gear.van.getWorldPosition(vanPosition);courts.animate(delta,activity,false);transport.animate(delta,activity,buses)},
 dispose(){disposed=true;loading.forEach(c=>c.abort());queue.length=0;loaded.forEach(v=>v.tile.dispose());loaded.clear();courts.dispose();materials.dispose();baseGeometry.dispose();baseMaterial.dispose();texture?.dispose();const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();for(const group of [transport.root,gear.root])group.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));if(o instanceof THREE.InstancedMesh)o.dispose()}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());readyResolve()}}
}
