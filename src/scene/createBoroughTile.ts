import {avenueTreeSites,benchSites,busStopSites} from './boroughFurniture.ts'
import * as THREE from 'three'
import {destinationFeature} from './destinationHighlight.ts'
import { createBoroughLife, createBoroughLifeAssets } from './createBoroughLife.ts'
import type { TrafficSpace } from './trafficSpace.ts'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createMiniatureMaterials, cloneArchitecturalFinish, cloneWorldArchitecturalFinish, SHADOW_PROXY_LAYER } from './miniatureMaterials.ts'
import { createFootprintRoof, setFlatRoofUVs } from './footprintRoof.ts'
import { addCaledonianClockTower } from './caledonianClockTower.ts'
import { boroughRoadProfile, boroughStreetDecorations } from './boroughStreetEdges.ts'
import { createWaterFinish } from './waterFinish.ts'
import { createBoroughRailFinish } from './boroughRailFinish.ts'
import { buildingHeight, containsPoint, roofBounds, boroughCourts, type BoroughCell, type GeoFeature } from './boroughGeometry.ts'

export const BOROUGH_SILL_THICKNESS=.012

/** Shared, owned finishes keep streamed cells consistent with the established miniature. */
export function createBoroughMaterials() {
 const finishes=createMiniatureMaterials(.1)
 const brick=['#b9997f','#d1bda4','#ad816a','#c6ae91','#ded2b9','#b7a68c'].map(c=>cloneWorldArchitecturalFinish(finishes.brick,c,false,.1))
 const roofs=['#7d8881','#90998c','#7d8d89','#9ba093'].map(c=>cloneWorldArchitecturalFinish(finishes.slate,c,true,.1))
 // Keep the lighter roof palette, with seams and weathering scaled to the borough.
 const flatRoofs=['#c7c9bd','#d0d0c3','#bec2b5','#cacabd'].map(c=>cloneArchitecturalFinish(finishes.mappedMembrane,c))
 const plain=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.94})
 // Preserve the metre-calibrated pane/curtain shader on the shared glass.
 const glass=cloneArchitecturalFinish(finishes.glazing,'#46665e')
 // Ground finishes already use horizontal UVs at borough scale; retain their
 // shared wetness uniform and path margins instead of replacing the shader.
 const paving=cloneArchitecturalFinish(finishes.paving,'#c6bfab')
 const parkPath=cloneArchitecturalFinish(finishes.parkPath,'#c6bfab')
 const road=cloneArchitecturalFinish(finishes.asphalt,'#838a7f')
 const railBallast=createBoroughRailFinish(finishes.ballast)
 const trim=plain('#e4d9c3'),stone=plain('#ada792'),door=plain('#355449'),trunk=plain('#75634e'),metal=plain('#52665b'),white=plain('#eee9d4'),stopRed=plain('#ba4d40')
 const fineTrim=trim.clone()
 // Coverage fades at subpixel sizes while the instance batches keep depth writes.
 fineTrim.alphaHash=true
 const {material:water,animate:animateSurfaces}=createWaterFinish('#608d85',.1)
 const lifeAssets=createBoroughLifeAssets()
 const box=new THREE.BoxGeometry(1,1,1),circle=new THREE.CircleGeometry(.5,12);circle.rotateX(-Math.PI/2)
 return {finishes,brick,roofs,flatRoofs,glass,paving,parkPath,road,railBallast,trim,fineTrim,stone,door,trunk,metal,white,stopRed,water,box,circle,lifeAssets,
 animateSurfaces,
 setNight(night:boolean){glass.emissiveIntensity=night?.65:0},
 dispose(){[...brick,...roofs,...flatRoofs,glass,paving,parkPath,road,railBallast,trim,fineTrim,stone,door,trunk,metal,white,stopRed,water].forEach(m=>m.dispose());box.dispose();circle.dispose();finishes.dispose();lifeAssets.dispose()}}
}
export type BoroughMaterials=ReturnType<typeof createBoroughMaterials>
/** Every wall/roof follows the source ring; facade/roof furniture is decorative. */
export function createBoroughTile(data:BoroughCell,materials:BoroughMaterials,traffic?:TrafficSpace,cellId?:string) {
 const steps=buildBoroughTile(data,materials,traffic,cellId)
 let step=steps.next()
 while(!step.done)step=steps.next()
 return step.value
}
/** Yields between pieces of work, so a cell can be built across several frames. */
export function* buildBoroughTile(data:BoroughCell,materials:BoroughMaterials,traffic?:TrafficSpace,cellId?:string) {
 const root=new THREE.Group();root.name='Islington geographic cell'
 const {finishes,brick,roofs,flatRoofs,glass,paving,parkPath,road,trim,fineTrim,stone,door,trunk,metal,white,stopRed,water,box,circle}=materials
 const batches=new Map<THREE.Material,THREE.BufferGeometry[]>(),instances=new Map<THREE.Material,THREE.Matrix4[]>(),caps=new Map<THREE.Material,THREE.Matrix4[]>(),fine=new Map<THREE.Material,THREE.Matrix4[]>()
 const transform=new THREE.Object3D()
 function part(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,angle=0,target=instances){transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,angle,0);transform.updateMatrix();const list=target.get(m)??[];list.push(transform.matrix.clone());target.set(m,list)}
 function collect(m:THREE.Material,g:THREE.BufferGeometry){const plain=g.index?g.toNonIndexed():g;if(plain!==g)g.dispose();const list=batches.get(m)??[];list.push(plain);batches.set(m,list)}
 function polygon(f:GeoFeature,m:THREE.Material,y:number,height=0,roof?:ReturnType<typeof roofBounds>){
  if(f.points.length<4)return
  const shape=new THREE.Shape(f.points.slice(0,-1).map(([x,z])=>new THREE.Vector2(x,-z)))
  for(const hole of f.holes??[])if(containsPoint(hole[0][0],hole[0][1],f.points))shape.holes.push(new THREE.Path(hole.slice(0,-1).map(([x,z])=>new THREE.Vector2(x,-z))))
  const g=height?new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1}):new THREE.ShapeGeometry(shape)
  g.rotateX(-Math.PI/2);g.translate(0,y,0)
  if(roof)setFlatRoofUVs(g,roof,.1)
  collect(m,g)
 }
 for(const f of data.parks)polygon(f,finishes.parkGrass,-.004)
 for(const f of data.water)polygon(f,water,0)
 yield
 const junctions=new Set<string>()
 let done=0
 for(const f of data.roads){
  if(++done%40===0)yield
  const {walking,width}=boroughRoadProfile(f.kind)
  for(let i=1;i<f.points.length;i++){
   const a=f.points[i-1],b=f.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.001)continue
   const angle=-Math.atan2(dz,dx),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2
   const ground=walking&&data.parks.some(park=>containsPoint(x,z,park.points)&&!park.holes?.some(hole=>containsPoint(x,z,hole)))?parkPath:paving
   part(ground,x,.003,z,len,.004,width+(walking?.03:.28),angle)
   if(!walking)part(road,x,.007,z,len,.004,width,angle)
   for(const p of [a,b]){const key=`${p[0]},${p[1]},${width}`;if(!junctions.has(key)){junctions.add(key);part(ground,p[0],.006,p[1],width+(walking?.03:.28),1,width+(walking?.03:.28),0,caps);if(!walking)part(road,p[0],.01,p[1],width,1,width,0,caps)}}
  }
 }
 const {edges,markings}=boroughStreetDecorations(data.roads)
 // Use the existing stone and paint instance batches.
 for(const {a,b,width} of edges){
  const dx=b[0]-a[0],dz=b[1]-a[1]
  part(stone,(a[0]+b[0])/2,.015,(a[1]+b[1])/2,Math.hypot(dx,dz),.012,width,-Math.atan2(dz,dx))
 }
 for(const {a,b,width} of markings){
  const dx=b[0]-a[0],dz=b[1]-a[1]
  part(white,(a[0]+b[0])/2,.011,(a[1]+b[1])/2,Math.hypot(dx,dz),.001,width,-Math.atan2(dz,dx))
 }
 const benches=benchSites(data),stops=busStopSites(data,cellId)
 for(const site of benches){
  const c=Math.cos(site.heading),s=Math.sin(site.heading)
  const piece=(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>part(m,site.x+c*x+s*z,y,site.z-s*x+c*z,w,h,d,site.heading)
  for(const z of [-.024,-.008,.008,.024])piece(finishes.timber,0,.055,z,.18,.009,.012)
  for(const y of [.085,.108,.131])piece(finishes.timber,0,y,-.039,.18,.014,.009)
  for(const x of [-.07,.07]){for(const z of [-.024,.024])piece(metal,x,.029,z,.012,.05,.012);piece(metal,x,.086,-.039,.01,.11,.01)}
 }
 for(const stop of stops){
  part(metal,stop.x,.15,stop.z,.009,.30,.009)
  part(white,stop.x,.285,stop.z,.095,.10,.009)
  part(stopRed,stop.x,.292,stop.z+.006,.07,.05,.004)
  part(white,stop.x,.292,stop.z+.009,.045,.026,.004)
  part(metal,stop.x,.292,stop.z+.012,.075,.013,.004)
 }
 for(const f of data.railways)for(let i=1;i<f.points.length;i++){
  const a=f.points[i-1],b=f.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx)
  if(len<.001)continue
  part(materials.railBallast,(a[0]+b[0])/2,.005,(a[1]+b[1])/2,len,.005,.3,angle)
  for(const side of [-1,1])part(metal,(a[0]+b[0])/2-dz/len*side*.07,.015,(a[1]+b[1])/2+dx/len*side*.07,len,.01,.014,angle)
 }
 yield
 let detailedBuildings=0
 for(const f of data.buildings){
  if(++done%14===0)yield
  const id=Number(f.id),height=buildingHeight(f.tags,f.points),bounds=roofBounds(f.points),modern=bounds.width>2.2||['industrial','warehouse','commercial'].includes(f.tags?.building??'')
  if(addCaledonianClockTower(f,height,{stone:trim,dark:door,dial:white,roof:roofs[0],polygon,part,collect})){detailedBuildings++;continue}
  const palette=Math.abs(id)%brick.length;polygon(f,brick[palette],.012,height)
  const pitched=!modern&&!f.holes?.length&&f.tags?.['roof:shape']!=='flat'&&bounds.width>.3
  if(pitched){const g=createFootprintRoof(f.points,bounds,height+.012,Math.min(.3,bounds.width*.30));collect(roofs[Math.abs(id)%roofs.length],g)}else polygon(f,flatRoofs[Math.abs(id)%flatRoofs.length],height+.015,0,bounds)
  const parapet=!pitched&&modern
  const floors=Math.max(1,Math.min(7,Math.round(height/.30))),signed=f.points.slice(1).reduce((sum,b,i)=>sum+f.points[i][0]*b[1]-b[0]*f.points[i][1],0),sign=signed>0?1:-1
  for(let i=1;i<f.points.length;i++){
   const a=f.points[i-1],b=f.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.22)continue
   const nx=dz/len*sign,nz=-dx/len*sign,angle=-Math.atan2(dz,dx)
   part(parapet?stone:trim,(a[0]+b[0])/2+nx*.012,height+(parapet?.035:0),(a[1]+b[1])/2+nz*.012,len,parapet?.060:.035,.045,angle)
   part(stone,(a[0]+b[0])/2,.04,(a[1]+b[1])/2,len,.065,.025,angle)
   if(len<.3||height<.45)continue
   const columns=Math.max(1,Math.min(24,Math.floor(len/(modern?.55:.32)))),w=modern?Math.min(.32,len/columns*.7):.102,h=modern?.17:.145
   for(let col=0;col<columns;col++){
    const t=(col+.5)/columns,x=a[0]+dx*t,z=a[1]+dz*t
    for(let floor=0;floor<floors;floor++){
     const y=(floor+.58)*height/floors
     part(trim,x+nx*.012,y,z+nz*.012,w+.026,h+.026,.018,angle)
     part(glass,x+nx*.023,y,z+nz*.023,w,h,.012,angle)
     part(fineTrim,x+nx*.03,y-h/2-.008,z+nz*.03,w+.045,BOROUGH_SILL_THICKNESS,.034,angle,fine)
     part(fineTrim,x+nx*.031,y,z+nz*.031,.006,h,.008,angle,fine)
     if(!modern)part(fineTrim,x+nx*.031,y,z+nz*.031,w,.006,.008,angle,fine)
    }
    if(!modern&&col%3===0){part(door,x+nx*.025,.105,z+nz*.025,.085,.21,.021,angle);part(trim,x+nx*.04,.219,z+nz*.04,.112,.016,.039,angle)}
   }
  }
  if(pitched&&bounds.depth>.7){
   const c=Math.cos(bounds.angle),s=Math.sin(bounds.angle),along=.27,rx=bounds.x+along*s,rz=bounds.z+along*c
   if(containsPoint(rx,rz,f.points)){part(brick[palette],rx,height+.13,rz,.14,.32,.19,bounds.angle);part(trim,rx,height+.3,rz,.18,.025,.23,bounds.angle);for(const side of [-1,1])part(metal,rx+side*.043,height+.35,rz,.033,.08,.04,bounds.angle)}
  }
  detailedBuildings++
 }
 yield
 const crowns:THREE.Matrix4[]=[]
 function tree(x:number,z:number,index:number,source=false){
  // Stable source IDs vary illustrative mature canopies without moving mapped
  // trunks or consuming the decorative planting stream. Keep three lobes.
  const seed=Math.abs(Math.sin(index*12.9898)*43758.5453)%1
  const size=source?.78+seed*.38:.56+(index%7)*.045
  const breadth=source?.88+seed*.22:1
  part(trunk,x,size*.38,z,.035,size*.76,.035)
  // Layered, offset lobes retain the softer established tree silhouette.
  for(let lobe=0;lobe<3;lobe++){const angle=lobe*2.399+index;transform.position.set(x+Math.cos(angle)*size*.15,size*(.78+lobe*.11),z+Math.sin(angle)*size*.15);transform.scale.set(size*.38*breadth,size*.46,size*.38*breadth);transform.rotation.set(0,index*2.399,0);transform.updateMatrix();crowns.push(transform.matrix.clone())}
 }
 data.trees.forEach(f=>tree(f.points[0][0],f.points[0][1],Number(f.id),true))
 // Additional planting is decorative and stays within the mapped park perimeter,
 // outside footprints/courts/paths; no invented streets or park shapes.
 let planted=0
 for(const park of data.parks)for(let i=1;i<park.points.length&&planted<180;i++){
  const a=park.points[i-1],b=park.points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len>100)continue
  for(let d=.7;d<len;d+=1.25){const x=a[0]+(b[0]-a[0])*d/len,z=a[1]+(b[1]-a[1])*d/len
   if(boroughCourts.some(c=>Math.hypot(c.x-x,c.z-z)<Math.max(c.width,c.depth))||data.trees.some(f=>Math.hypot(f.points[0][0]-x,f.points[0][1]-z)<.7)||data.buildings.some(f=>containsPoint(x,z,f.points)))continue
   tree(x,z,planted++);
  }
 }
 // OSM records only some of the mature trees along park walks. Own index range,
 // so the established perimeter planting above keeps its positions and look.
 const avenue=avenueTreeSites(data)
 avenue.forEach((site,i)=>tree(site.x,site.z,200000+i,true))
 yield
 const owned:THREE.BufferGeometry[]=[]
 for(const [material,parts] of batches){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(g){const mesh=new THREE.Mesh(g,material);mesh.name=material===trim?'Caledonian Tower stonework':brick.includes(material as THREE.MeshStandardMaterial)?'Borough mapped walls':[...roofs,...flatRoofs].includes(material as THREE.MeshStandardMaterial)?'Borough footprint roofs':'Borough mapped ground';mesh.castShadow=material===trim||brick.includes(material as THREE.MeshStandardMaterial)||[...roofs,...flatRoofs].includes(material as THREE.MeshStandardMaterial);mesh.receiveShadow=true;root.add(mesh);owned.push(g)}}
 function batch(geometry:THREE.BufferGeometry,material:THREE.Material,matrices:THREE.Matrix4[],shadows=false){if(!matrices.length)return;const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=shadows;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);return mesh}
 yield
 for(const [material,matrices] of instances){batch(box,material,matrices,material===trunk);yield}
 // Sills and glazing bars are thinner than a pixel until you are close; drawing them
 // at map scale is most of the scene's triangles for nothing you can see.
 const fineMeshes:THREE.InstancedMesh[]=[]
 for(const [material,matrices] of fine){const mesh=batch(box,material,matrices);if(mesh)fineMeshes.push(mesh);yield}
 for(const [material,matrices] of caps)batch(circle,material,matrices)
 const leaves=batch(finishes.foliageGeometry,finishes.foliage,crowns)
 crowns.forEach((_,i)=>leaves?.setColorAt(i,new THREE.Color(['#6a854f','#7f965c','#5f7e4d','#8b9f62'][i%4])))
 if(leaves?.boundingSphere)leaves.boundingSphere.radius+=.05
 const proxies=batch(finishes.foliageShadowGeometry,finishes.foliageShadowProxy,crowns,true);if(proxies){if(proxies.boundingSphere)proxies.boundingSphere.radius+=.05;proxies.layers.set(SHADOW_PROXY_LAYER);proxies.customDepthMaterial=finishes.foliageShadowDepth}
 yield
 const life=createBoroughLife(data,materials.lifeAssets,traffic);root.add(life.root)
 root.userData.coverage={buildings:detailedBuildings,trees:data.trees.length,decorativePlanting:planted,avenuePlanting:avenue.length,illustrativeBenches:benches.length,recordedBusStops:stops.length}
 return {root,life,setFineDetail(show:boolean){for(const mesh of fineMeshes)mesh.visible=show},destinationAt:(x:number,z:number,park:boolean)=>destinationFeature(data,x,z,park),dispose(){life.dispose();owned.forEach(g=>g.dispose());root.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose()})}}
}
