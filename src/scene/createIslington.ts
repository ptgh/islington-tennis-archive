import * as THREE from 'three'
import {destinationGeometry,destinationOutline} from './destinationHighlight.ts'
import { boroughBounds, boroughGeography, courtsNearVenue, detailCellLimit, detailCellsInView, type BoroughCell } from './boroughGeometry.ts'
import { createBoroughBoundary } from './createBoroughBoundary.ts'
import { createBoroughMaterials, createBoroughTile } from './createBoroughTile.ts'
import { createBoroughCourts } from './createBoroughCourts.ts'
import { mapStations } from '../data/transit.ts'
import { createGear } from './createGear.ts'
import { createTownLife } from './createTownLife.ts'
import type { TownWorld, MapVenue } from './types.ts'
import { projectPoint } from './courtGeometry.ts'
import roadRoutes from '../data/borough-transport.json' with {type:'json'}
import { createTrafficSpace } from './trafficSpace.ts'

const project=(lat:number,lng:number)=>{const [x,z]=projectPoint(lng,lat);return new THREE.Vector3(x,0,z)}
const sourceUrl=(path:string)=>`${import.meta.env?.BASE_URL??'/'}${path}`
type Tile=ReturnType<typeof createBoroughTile>
type Cell=typeof boroughGeography.cells[number]
const OVERVIEW_EDGE_FADE=36
/** Decoded, the full overview is about 90 MB of GPU memory: too much to spend on a phone. */
const overviewPath=typeof window!=='undefined'&&window.matchMedia?.('(max-width:760px)').matches?'map/islington-overview-phone.webp':'map/islington-overview.png'
const buildingsRise=typeof window!=='undefined'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const RISE_SECONDS=.45,RISE_FROM=.02
export type BusRideStatus={id:string;progress:number;destinationId:string;walkMetres:number}
export type IslingtonWorld=TownWorld & { ready:Promise<void>; updateView:(camera:THREE.OrthographicCamera,zoom:number,target:THREE.Vector3,cssWidth?:number)=>void; setTrains:(value:boolean)=>void; setDestination:(point:THREE.Vector3|null,park?:boolean)=>void; lifeLocation:(kind:'cycle'|'fox'|'emergency',near:THREE.Vector3)=>THREE.Vector3|null; busPosition:(id:string,target:THREE.Vector3)=>boolean; startBusRide:(id:string)=>boolean; busRideStatus:()=>BusRideStatus|null; retry:()=>void; status:{loading:number;failed:number;loaded:number} }

/** One continuous source map. Stream/cull local detail in shared world coordinates;
 * the borough-wide overview remains present during loading and across cell seams. */
export function createIslington(venues:MapVenue[],invalidate:()=>void=()=>{}):IslingtonWorld {
 const root=new THREE.Group();root.name='Continuous Islington'
 const highlightMaterial=new THREE.MeshBasicMaterial({color:'#d8bf79',transparent:true,opacity:.10,depthWrite:false,depthTest:false,side:THREE.DoubleSide})
 const highlight=new THREE.Mesh(new THREE.BufferGeometry(),highlightMaterial);highlight.name='Selected source footprint';highlight.visible=false;highlight.renderOrder=5;root.add(highlight)
 const outlineMaterial=new THREE.LineBasicMaterial({color:'#d8bf79',transparent:true,opacity:.7,depthWrite:false,depthTest:false}),outline=new THREE.LineSegments(new THREE.BufferGeometry(),outlineMaterial);outline.name='Selected footprint perimeter';outline.visible=false;outline.renderOrder=6;root.add(outline)
 let destination:THREE.Vector3|null=null,destinationPark=false,highlightId='',highlightTimer:ReturnType<typeof setTimeout>|undefined
 const refreshHighlight=()=>{if(!destination){highlight.visible=false;outline.visible=false;highlightId='';return;}for(const item of loaded.values()){const feature=item.tile.destinationAt(destination.x,destination.z,destinationPark);if(!feature)continue;const key=String(feature.id);if(key!==highlightId){highlight.geometry.dispose();highlight.geometry=destinationGeometry(feature,destinationPark);outline.geometry.dispose();outline.geometry=destinationOutline(feature,destinationPark);highlightId=key;}highlight.visible=true;outline.visible=true;return;}highlight.visible=false;outline.visible=false}
 const materials=createBoroughMaterials(),anchors=new Map<string,THREE.Vector3>(),courtFocusAnchors=new Map<string,THREE.Vector3>()
 for(const venue of venues){const courts=courtsNearVenue(venue.lat,venue.lng),point=courts.length?new THREE.Vector3(courts.reduce((s,c)=>s+c.x,0)/courts.length,.15,courts.reduce((s,c)=>s+c.z,0)/courts.length):project(venue.lat,venue.lng);anchors.set(venue.id,point);courtFocusAnchors.set(venue.id,point.clone())}
 const bounds=boroughBounds,w=bounds.maxX-bounds.minX,h=bounds.maxZ-bounds.minZ
 let overviewFailed=false
 const texture=typeof document==='undefined'?null:new THREE.TextureLoader().load(sourceUrl(overviewPath),invalidate,undefined,()=>{overviewFailed=true;notify()})
 if(texture){texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8}
 const baseMaterial=new THREE.MeshStandardMaterial({color:texture?'#ffffff':'#a9b69b',map:texture,roughness:1})
 // The source data stops at a rectangle. Dissolve its last few hundred metres into
 // the surround, so the limit of the survey never reads as a straight cut.
 const surroundColor=new THREE.Color('#a9b69b')
 baseMaterial.onBeforeCompile=shader=>{
  shader.uniforms.overviewSurround={value:surroundColor}
  shader.fragmentShader='uniform vec3 overviewSurround;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   #ifdef USE_MAP
   vec2 overviewEdge=min(vMapUv,1.0-vMapUv)/vec2(${(OVERVIEW_EDGE_FADE/w).toFixed(5)},${(OVERVIEW_EDGE_FADE/h).toFixed(5)});
   diffuseColor.rgb=mix(overviewSurround,diffuseColor.rgb,smoothstep(0.0,1.0,min(overviewEdge.x,overviewEdge.y)));
   #endif
  `)
 }
 baseMaterial.customProgramCacheKey=()=>'islington-overview-edge-v1'
 const baseGeometry=new THREE.PlaneGeometry(w,h);baseGeometry.rotateX(-Math.PI/2)
 const base=new THREE.Mesh(baseGeometry,baseMaterial);base.name='Whole Islington continuous base';base.position.set((bounds.minX+bounds.maxX)/2,-.02,(bounds.minZ+bounds.maxZ)/2);base.receiveShadow=true;root.add(base)
 // A quiet ground surround keeps the source map seated in a landscape at overview
 // scale without inventing streets beyond the surveyed coverage.
 const surroundGeometry=new THREE.PlaneGeometry(w*12,h*12);surroundGeometry.rotateX(-Math.PI/2)
 const surroundMaterial=new THREE.MeshStandardMaterial({color:'#a9b69b',roughness:1})
 const surround=new THREE.Mesh(surroundGeometry,surroundMaterial);surround.position.copy(base.position).setY(-.04);surround.receiveShadow=true;root.add(surround)
 const courts=createBoroughCourts(materials,invalidate);root.add(courts.root)
 const boundary=createBoroughBoundary();root.add(boundary.root)
 const stations=mapStations.map(s=>({name:s.name,position:project(s.lat,s.lng).setY(.12),lines:s.lines}))
 const traffic=createTrafficSpace()
 const transport=createTownLife([],[],(lat,lng)=>project(lat,lng).multiplyScalar(10),[],true,true,traffic)
 transport.root.scale.setScalar(.1);root.add(transport.root)
 const gear=createGear((lat,lng)=>project(lat,lng).multiplyScalar(10),[],true,traffic);gear.root.scale.setScalar(.1);gear.van.scale.setScalar(.7);root.add(gear.root)
 const vanPosition=new THREE.Vector3();gear.root.updateMatrixWorld(true);gear.van.getWorldPosition(vanPosition)
 const loaded=new Map<string,{tile:Tile;used:number;rise:number}>(),loading=new Map<string,AbortController>(),failed=new Set<string>(),queue:Cell[]=[]
 const status={loading:0,failed:0,loaded:0};root.userData.streaming=status;root.userData.source={checked:boroughGeography.checked,counts:boroughGeography.counts,cells:boroughGeography.cells.length}
 let retainedCells=20,disposed=false,revision=0,lastKey='',desired=new Set<string>(),night=false,detailLife=true,trainsVisible=true
 let readyResolve:()=>void=()=>{};const ready=new Promise<void>(resolve=>{readyResolve=resolve})
 const sourceCells=boroughGeography.cells.map(cell=>({cell,box:new THREE.Box3(new THREE.Vector3(cell.bounds[0],-.1,cell.bounds[1]),new THREE.Vector3(cell.bounds[2],9,cell.bounds[3]))}))
 function notify(){status.loading=loading.size+queue.length;status.failed=failed.size+(overviewFailed?1:0);status.loaded=loaded.size;invalidate()}
 function evict(){while(loaded.size>retainedCells){const oldest=[...loaded.entries()].filter(([id])=>!desired.has(id)).sort((a,b)=>a[1].used-b[1].used)[0];if(!oldest)break;root.remove(oldest[1].tile.root);oldest[1].tile.dispose();loaded.delete(oldest[0])}}
 function pump(){
  if(disposed)return
  while(loading.size<2&&queue.length){
   const cell=queue.shift()!;if(loaded.has(cell.id)||loading.has(cell.id)||!desired.has(cell.id))continue
   const controller=new AbortController();let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;controller.abort()},15000);loading.set(cell.id,controller);notify()
   fetch(sourceUrl(cell.url),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Map cell unavailable');return r.json()}).then((data:BoroughCell)=>{
    if(disposed||!desired.has(cell.id))return
    const tile=createBoroughTile(data,materials,traffic,cell.id);tile.life.setNight(night);tile.life.setTrains(trainsVisible);tile.life.root.visible=detailLife;tile.root.userData.cellId=cell.id;root.add(tile.root);const rise=buildingsRise?0:1;tile.root.scale.y=buildingsRise?RISE_FROM:1;loaded.set(cell.id,{tile,used:++revision,rise});failed.delete(cell.id);readyResolve();evict();refreshHighlight()
   }).catch(error=>{if(!disposed&&(error.name!=='AbortError'||timedOut))failed.add(cell.id)}).finally(()=>{clearTimeout(timeout);loading.delete(cell.id);if(!disposed&&desired.has(cell.id)&&!loaded.has(cell.id)&&!failed.has(cell.id)&&!queue.some(c=>c.id===cell.id))queue.push(cell);notify();if(!disposed){readyResolve();pump()}})
  }
  notify()
 }
 function request(cells:Cell[]){desired=new Set(cells.map(c=>c.id));for(const [id,item] of loaded){if(desired.has(id)){if(!item.tile.root.visible&&buildingsRise){item.rise=0;item.tile.root.scale.y=RISE_FROM}item.used=++revision}item.tile.root.visible=desired.has(id)}queue.splice(0,queue.length,...cells.filter(c=>!loaded.has(c.id)&&!loading.has(c.id)&&!failed.has(c.id)));for(const [id,c] of loading)if(!desired.has(id))c.abort();pump();evict()}
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4()
 function updateView(camera:THREE.OrthographicCamera,zoom:number,target:THREE.Vector3,cssWidth=1440){
  if(disposed)return
  boundary.setView(camera,zoom,cssWidth)
  detailLife=zoom>=3.5
  for(const item of loaded.values()){item.tile.life.root.visible=detailLife;if(!detailLife||!item.tile.root.visible)item.tile.life.clearTraffic()}
  // At overview scale the complete source-derived map replaces subpixel facade
  // detail. Footprint geometry overlays that same map once it can fill the view.
  matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix)
  const limit=detailCellLimit(cssWidth);retainedCells=limit+4
  const cells=detailCellsInView(sourceCells.filter(({box})=>frustum.intersectsBox(box)).map(({cell})=>cell),target,limit)
  const key=cells.map(c=>c.id).sort().join(',');if(key!==lastKey){lastKey=key;request(cells)}
 }
 // Prime source detail at the first court before releasing the startup artwork.
 const first=anchors.get('highbury-fields')??project(51.5515,-.0988)
 request([...boroughGeography.cells].sort((a,b)=>Math.hypot(a.x-first.x,a.z-first.z)-Math.hypot(b.x-first.x,b.z-first.z)).slice(0,4))
 let previous=0,windTime=0,windStrength=0,destinationId='highbury-fields'
 return {root,anchors,courtFocusAnchors,stations,vanPosition,ready,status,updateView,busPosition:transport.busPosition,startBusRide(id){
   root.updateMatrixWorld(true)
   const points=(roadRoutes as Record<string,number[][]>)[id]
   if(!points?.length)return false
   let distance=Infinity
   for(const [venueId,anchor] of anchors){if(venues.find(v=>v.id===venueId)?.access!=='public')continue;for(const [x,z] of points){const d=Math.hypot(x-anchor.x,z-anchor.z);if(d<distance){distance=d;destinationId=venueId}}}
   return transport.startBusRide(id,anchors.get(destinationId)??first)
 },busRideStatus(){const ride=transport.rideProgress();return ride?{...ride,destinationId}:null},retry(){failed.clear();if(overviewFailed&&texture){new THREE.TextureLoader().load(sourceUrl(overviewPath),loaded=>{if(disposed){loaded.dispose();return}texture.image=loaded.image;texture.needsUpdate=true;loaded.dispose();overviewFailed=false;notify()},undefined,()=>notify())}lastKey='';notify()},
 setDestination(point,park=false){if(highlightTimer)clearTimeout(highlightTimer);destination=point;destinationPark=park;highlightId='';highlightMaterial.opacity=.10;refreshHighlight();invalidate();if(point)highlightTimer=setTimeout(()=>{highlightMaterial.opacity=0;invalidate()},2500)},
 lifeLocation(kind,near){const points=[...loaded.values()].filter(item=>item.tile.root.visible&&item.tile.life.root.visible).flatMap(item=>{const point=item.tile.life.lifeLocation(kind);return point?[point]:[]});return points.sort((a,b)=>a.distanceToSquared(near)-b.distanceToSquared(near))[0]??null},
 setWind(strength){windStrength=strength*.1},setRain:materials.finishes.setRain,setTransit(){},setActivity(value){courts.setActivity(value);transport.setActivity(value)},setBuses:transport.setBuses,setTrains(value){trainsVisible=value;loaded.forEach(item=>item.tile.life.setTrains(value));invalidate()},setBusRoute:transport.setBusRoute,
 setNight(value){if(value===night)return;night=value;boundary.setNight(value);materials.setNight(value);courts.setNight(value);transport.setNight(value);loaded.forEach(item=>item.tile.life.setNight(value))},
 animate(seconds,runTrain,activity,buses){const delta=Math.min(.08,Math.max(0,seconds-previous));previous=seconds;if(buildingsRise)for(const item of loaded.values())if(item.tile.root.visible&&item.rise<1){item.rise=Math.min(1,item.rise+delta/RISE_SECONDS);item.tile.root.scale.y=Math.max(RISE_FROM,item.rise*item.rise*(3-2*item.rise));invalidate()}if(activity)windTime+=delta;materials.finishes.setWind(windTime,windStrength);materials.animateSurfaces(windTime,windStrength);for(const item of loaded.values())if(item.tile.root.visible&&item.tile.life.root.visible)item.tile.life.animate(delta,activity,runTrain);gear.animate(delta,activity);gear.root.updateMatrixWorld(true);gear.van.getWorldPosition(vanPosition);courts.animate(delta,activity,false);transport.animate(delta,activity,buses)},
 dispose(){disposed=true;if(highlightTimer)clearTimeout(highlightTimer);highlight.geometry.dispose();highlightMaterial.dispose();outline.geometry.dispose();outlineMaterial.dispose();loading.forEach(c=>c.abort());queue.length=0;loaded.forEach(v=>v.tile.dispose());loaded.clear();courts.dispose();boundary.dispose();materials.dispose();baseGeometry.dispose();baseMaterial.dispose();surroundGeometry.dispose();surroundMaterial.dispose();texture?.dispose();const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();for(const group of [transport.root,gear.root])group.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));if(o instanceof THREE.InstancedMesh)o.dispose()}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());readyResolve()}}
}
