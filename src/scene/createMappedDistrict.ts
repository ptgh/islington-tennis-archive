import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {createMiniatureMaterials,cloneWorldArchitecturalFinish,SHADOW_PROXY_LAYER} from './miniatureMaterials.ts'
import {createFootprintRoof} from './footprintRoof.ts'
import {createCourtNetGeometries} from './courtNet.ts'
import {createTownLife} from './createTownLife.ts'
import {mapStations} from '../data/transit.ts'
import {projectPoint} from './courtGeometry.ts'
import {districtGeography,districtFeatures,districtBounds,districtBuildingHeight,districtClosed,districtCentre,type DistrictPoint} from './districtLayout.ts'
import type {MapVenue,TownWorld} from './types.ts'

/** Development-only accuracy pilot. Shared town projection, genuine footprints;
 * no procedural streets, inflated courts or invented transport alignments. */
export function createMappedDistrict(venues:MapVenue[]):TownWorld{
 const root=new THREE.Group();root.name='Mapped Caledonian accuracy pilot'
 const finishes=createMiniatureMaterials(),box=new THREE.BoxGeometry(1,1,1)
 const materials=new Set<THREE.Material>(),batches=new Map<string,{material:THREE.Material;geometry:THREE.BufferGeometry[];shadow:boolean}>()
 const project=(lat:number,lng:number)=>{const [x,z]=projectPoint(lng,lat);return new THREE.Vector3(x,0,z)}
 const windows=cloneWorldArchitecturalFinish(finishes.glazing,'#637d7d'),stone=cloneWorldArchitecturalFinish(finishes.stucco,'#d1cbb8')
 materials.add(windows);materials.add(stone)
 const ground=cloneWorldArchitecturalFinish(finishes.paving,'#b3b5a6',true);materials.add(ground)
 function collect(geometry:THREE.BufferGeometry,material:THREE.Material,shadow=false){
  const flat=geometry.index?geometry.toNonIndexed():geometry;if(flat!==geometry)geometry.dispose()
  const p=flat.getAttribute('position'),key=material.uuid+shadow+':'+Math.floor(p.getX(0)/20)+','+Math.floor(p.getZ(0)/20)
  if(!batches.has(key))batches.set(key,{material,geometry:[],shadow})
  batches.get(key)!.geometry.push(flat)
 }
 function block(x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material,angle=0,shadow=false){
  const g=box.clone();g.scale(w,h,d);g.rotateY(angle);g.translate(x,y,z);collect(g,material,shadow)
 }
 function shape(points:DistrictPoint[],y:number,material:THREE.Material){
  if(!districtClosed(points))return
  const g=new THREE.ShapeGeometry(new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z))))
  g.rotateX(-Math.PI/2);g.translate(0,y,0);collect(g,material)
 }
 function segment(a:DistrictPoint,b:DistrictPoint,width:number,y:number,material:THREE.Material,height=.008){
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)
  if(length>.005)block((a[0]+b[0])/2,y,(a[1]+b[1])/2,length,height,width,material,-Math.atan2(dz,dx))
 }
 const [west,south,east,north]=districtGeography.bbox,[left,top]=projectPoint(west,north),[right,bottom]=projectPoint(east,south)
 block((left+right)/2,-.06,(top+bottom)/2,right-left+.5,.1,bottom-top+.5,ground)
 const closed=districtFeatures.filter(f=>districtClosed(f.points))
 for(const f of closed.filter(f=>!f.tags.building)){
  if(['park','garden','recreation_ground'].includes(f.tags.leisure)||['grass','meadow','forest','cemetery'].includes(f.tags.landuse)||['wood','grassland','scrub'].includes(f.tags.natural))shape(f.points,.002,finishes.parkGrass)
 }
 // Road widths are estimates unless mapped. Centre lines and shared junctions
 // retain their source geometry. Buried rails are never drawn on the surface.
 for(const f of districtFeatures.filter(f=>f.tags.highway&&f.tags.area!=='yes')){
  const path=['footway','path','pedestrian','steps','cycleway'].includes(f.tags.highway)
  const measured=Number(f.tags.width),width=(measured>0?measured:path?1.8:f.tags.highway==='service'?4:['primary','secondary','tertiary'].includes(f.tags.highway)?7:5)/10
  for(let i=1;i<f.points.length;i++){
   const a=f.points[i-1],b=f.points[i]
   if(!path)segment(a,b,width+.3,.012,finishes.paving)
   segment(a,b,width,path?.018:.025,path?finishes.parkPath:finishes.asphalt)
  }
 }
 for(const f of districtFeatures.filter(f=>f.tags.railway==='rail'&&f.tags.tunnel!=='yes'&&Number(f.tags.layer||0)>=0)){
  for(let i=1;i<f.points.length;i++){
   const a=f.points[i-1],b=f.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.001)continue
   segment(a,b,.32,.018,finishes.ballast)
   const nx=-(b[1]-a[1])/length*.072,nz=(b[0]-a[0])/length*.072
   for(const side of [-1,1])segment([a[0]+nx*side,a[1]+nz*side],[b[0]+nx*side,b[1]+nz*side],.012,.041,windows)
  }
 }
 const palette=['#b49b7d','#c1ad91','#a98c72','#b69b82','#cfbfaa'],brick=palette.map(colour=>{
  const m=cloneWorldArchitecturalFinish(finishes.brick,colour);materials.add(m);return m
 })
 for(const f of closed.filter(f=>f.tags.building&&f.tags.building!=='roof'&&f.id!==37371124)){
  const b=districtBounds(f.points);if(b.area<.02)continue
  const height=districtBuildingHeight(f).metres/10,large=b.area>8
  const roofHeight=Number.parseFloat(f.tags['roof:height'])/10||Math.min(.25,b.width*.3)
  const pitched=!large&&f.tags['roof:shape']!=='flat'&&!['commercial','industrial','retail'].includes(f.tags.building)
  const eaves=Math.max(.2,height-(pitched?roofHeight:0))
  const footprint=new THREE.Shape(f.points.slice(0,-1).map(([x,z])=>new THREE.Vector2(x,-z)))
  const g=new THREE.ExtrudeGeometry(footprint,{depth:eaves,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2)
  collect(g,large?finishes.stucco:brick[f.id%brick.length],true)
  if(pitched)collect(createFootprintRoof(f.points,b,eaves,roofHeight),finishes.slate,true)
  else shape(f.points,height+.006,finishes.membrane)
  // Windows stay on the mapped facade edges; no replacement rectangular blocks.
  const floors=Math.max(1,Math.round(eaves/.31))
  for(let i=1;i<f.points.length;i++){
   const a=f.points[i-1],c=f.points[i],dx=c[0]-a[0],dz=c[1]-a[1],length=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx)
   const bays=Math.floor(length/.28);if(!bays)continue
   for(let bay=0;bay<bays;bay++)for(let floor=0;floor<floors;floor++){
    const t=(bay+.5)/bays,y=(floor+.55)*eaves/floors
    block(a[0]+dx*t,y,a[1]+dz*t,.105,.15,.016,windows,angle)
   }
  }
 }
 // The source puts the tower in Caledonian Park, north of Market Road and
 // west of the station. Council height: 47.5 m; pale Portland-stone masonry.
 const tower=districtFeatures.find(f=>f.id===37371124)!,t=districtBounds(tower.points),[tx,tz]=districtCentre(tower.points)
 const towerRoot=new THREE.Group();towerRoot.name='Mapped Caledonian Clock Tower';towerRoot.position.set(tx,0,tz);towerRoot.rotation.y=t.angle
 root.add(towerRoot)
 const dark=new THREE.MeshStandardMaterial({color:'#3b4541',roughness:.8}),clock=new THREE.MeshStandardMaterial({color:'#eee8d7',roughness:.9})
 materials.add(dark);materials.add(clock)
 const add=(x:number,y:number,z:number,w:number,h:number,d:number,material=stone,geometry:THREE.BufferGeometry=box)=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;towerRoot.add(mesh);return mesh
 }
 const tw=t.width,td=t.depth
 add(0,.04,0,tw*1.3,.08,td*1.3)
 add(0,1.77,0,tw,3.46,td)
 for(const y of [.78,1.7,2.33,3.45,3.65,4.2])add(0,y,0,tw*1.1,.06,td*1.1)
 for(let y=.14;y<1.7;y+=.11){
  for(const side of [-1,1]){add(0,y,side*(td/2+.002),tw,.008,.005,dark);add(side*(tw/2+.002),y,0,.005,.008,td,dark)}
 }
 const face=new THREE.CircleGeometry(1,32)
 for(let side=0;side<4;side++){
  const a=side*Math.PI/2,s=Math.sin(a),c=Math.cos(a),off=(side%2?tw:td)/2+.006
  const disk=add(s*off,3.03,c*off,.255,.255,1,clock,face);disk.rotation.y=a;disk.castShadow=false
  const hand=add(s*(off+.003),3.08,c*(off+.003),.018,.17,.006,dark);hand.rotation.y=a
  const short=add(s*(off+.006),3.03,c*(off+.006),.13,.018,.006,dark);short.rotation.y=a
  // Open belvedere: three bays on each side with slender supporting piers.
  for(const along of [-.36,-.12,.12,.36]){
   const x=s*tw/2+c*along,z=c*td/2-s*along
   add(x,3.89,z,.055,.48,.055)
  }
  add(s*off,4.13,c*off,side%2?.045:tw,.06,side%2?td:.045)
 }
 const roof=new THREE.ConeGeometry(1,1,4);roof.rotateY(Math.PI/4)
 add(0,4.43,0,tw*.8,.5,td*.8,finishes.slate,roof)
 add(0,4.715,0,.012,.07,.012,dark)
 towerRoot.userData.sourceHeightMetres=47.5
 towerRoot.userData.osmWayId=tower.id
 const courtModels:{center:THREE.Vector3;rotation:number;scale:number;groundY:number;nightPlayable:boolean}[]=[]
 const courtNets=createCourtNetGeometries(.8,.08)
 for(const f of closed.filter(f=>f.tags.leisure==='pitch')){
  shape(f.points,.032,f.tags.sport==='tennis'?finishes.hardCourt:finishes.parkGrass)
  if(f.tags.sport!=='tennis')continue
  const b=districtBounds(f.points),c=Math.cos(b.angle),s=Math.sin(b.angle)
  const point=(x:number,z:number):DistrictPoint=>[b.x+x*c+z*s,b.z-x*s+z*c]
  const line=(x1:number,z1:number,x2:number,z2:number)=>segment(point(x1,z1),point(x2,z2),.007,.043,clock,.004)
  const w=b.width/2,d=b.depth/2
  line(-w,-d,w,-d);line(-w,d,w,d);line(-w,-d,-w,d);line(w,-d,w,d)
  for(const x of [-w*.75,w*.75])line(x,-d,x,d)
  for(const z of [-d*.54,d*.54])line(-w*.75,z,w*.75,z)
  line(0,-d*.54,0,d*.54)
  const net=new THREE.Mesh(courtNets.net,finishes.net);net.position.set(b.x,.085,b.z);net.rotation.y=b.angle;net.scale.set(b.width*1.04,.10,1);net.receiveShadow=true;root.add(net)
  courtModels.push({center:new THREE.Vector3(b.x,0,b.z),rotation:b.angle,scale:b.depth/10.8,groundY:.04,nightPlayable:f.tags.lit==='yes'})
 }
 // Only mapped trees: use the existing low-poly shadow proxy, with shared
 // deformation, instead of introducing fictional avenue or park planting.
 const treeCount=districtGeography.trees.length,leaf=new THREE.InstancedMesh(finishes.foliageGeometry,finishes.foliage,treeCount)
 const leafColours=['#6b874b','#809754','#8a9f60','#63804a'].map(c=>new THREE.Color(c))
 const trunks=new THREE.InstancedMesh(box,dark,treeCount),transform=new THREE.Object3D()
 districtGeography.trees.forEach(([lng,lat],i)=>{
  const [x,z]=projectPoint(lng,lat),size=.32+(i%5)*.025
  transform.position.set(x,.12,z);transform.scale.set(.035,.24,.035);transform.rotation.set(0,0,0);transform.updateMatrix();trunks.setMatrixAt(i,transform.matrix)
  transform.position.set(x,.38,z);transform.scale.set(size,size*.9,size);transform.updateMatrix();leaf.setMatrixAt(i,transform.matrix)
  leaf.setColorAt(i,leafColours[i%leafColours.length])
 })
 leaf.computeBoundingSphere();trunks.computeBoundingSphere();leaf.receiveShadow=true;trunks.castShadow=true;root.add(leaf,trunks)
 const proxy=new THREE.InstancedMesh(finishes.foliageShadowGeometry,finishes.foliageShadowProxy,treeCount)
 proxy.instanceMatrix=leaf.instanceMatrix;proxy.castShadow=true;proxy.customDepthMaterial=finishes.foliageShadowDepth;proxy.layers.set(SHADOW_PROXY_LAYER);proxy.computeBoundingSphere();root.add(proxy)
 for(const batch of batches.values()){
  const geometry=mergeGeometries(batch.geometry,false)!,mesh=new THREE.Mesh(geometry,batch.material)
  mesh.castShadow=batch.shadow;mesh.receiveShadow=true;root.add(mesh);batch.geometry.forEach(g=>g.dispose())
 }
 const life=createTownLife(courtModels,[],project,[],false);root.add(life.root)
 const anchors=new Map(venues.map(v=>[v.id,project(v.lat,v.lng)])),courtFocusAnchors=new Map<string,THREE.Vector3>()
 // Reset opens this bounded pilot, rather than an unrendered neighbourhood.
 courtFocusAnchors.set('islington-tennis-centre',courtModels[0].center.clone())
 const stations=mapStations.filter(s=>s.lng>=west&&s.lng<=east&&s.lat>=south&&s.lat<=north).map(s=>({...s,position:project(s.lat,s.lng)}))
 // Shared finish maps are authored in metres; this world's geometry is in
 // ten-metre units. Preserve that ratio for masonry, paving and bump relief.
 const measuredMaterials=new Set<THREE.MeshStandardMaterial>([...[...materials].filter((m):m is THREE.MeshStandardMaterial=>m instanceof THREE.MeshStandardMaterial),finishes.asphalt,finishes.paving,finishes.parkPath,finishes.stucco,finishes.slate,finishes.membrane])
 for(const material of measuredMaterials){
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material)
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer)
   shader.vertexShader=shader.vertexShader.replace('vec3 architectureWorld = (architectureModel * vec4(transformed, 1.0)).xyz;', 'vec3 architectureWorld = (architectureModel * vec4(transformed, 1.0)).xyz * 10.0;')
  }
  material.customProgramCacheKey=()=>key()+'-district-metres-v1'
  material.bumpScale*=.1
 }
 root.userData.coverage={bbox:districtGeography.bbox,source:districtGeography.source,buildings:closed.filter(f=>f.tags.building).length,omittedAreaRelations:districtGeography.omittedAreaRelations}
 let wind=0,windTime=0
 return {root,anchors,courtFocusAnchors,stations,vanPosition:project(51.546,-.122),homeView:{target:project(51.5469,-.122),zoom:8},
  setNight(value){life.setNight(value);windows.emissive.set('#efc68b');windows.emissiveIntensity=value?.45:0},
  setRain:finishes.setRain,setWind(strength){wind=strength},
  setActivity:life.setActivity,setTransit(){},setBuses(){},setBusRoute(){},
  animate(seconds,_train,activity){if(activity)windTime=seconds;finishes.setWind(windTime,wind*.1);life.animate(seconds,activity,false)},
  dispose(){finishes.dispose();const gs=new Set<THREE.BufferGeometry>([box,courtNets.net,courtNets.tape]);root.traverse(o=>{if(o instanceof THREE.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}});gs.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())},
 }
}
