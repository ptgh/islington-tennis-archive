import * as THREE from 'three'
import { boroughCourts, boroughCourtDimensions } from './boroughGeometry.ts'
import { createClubSurfaces, cloneCourtFinish, courtFenceGeometry } from './clubSurfaces.ts'
import { createCourtNetGeometries } from './courtNet.ts'
import { createTownLife } from './createTownLife.ts'
import type { BoroughMaterials } from './createBoroughTile.ts'

/** A real court line is thinner than a pixel at every map zoom, so it breaks into dots.
 * Hold about one screen pixel, up to a width that still reads as a line on the court. */
const COURT_LINE_PIXELS=1.1,COURT_LINE_MAX_WIDTH=.05,COURT_LINE_MIN_ZOOM=3.2
export const courtLineWidth=(worldPerPixel:number)=>Math.min(worldPerPixel*COURT_LINE_PIXELS,COURT_LINE_MAX_WIDTH)
/** Below this the court is a few pixels across and reads best as plain colour. */
export const courtLinesVisible=(zoom:number)=>zoom>=COURT_LINE_MIN_ZOOM

/** Real court dimensions/orientations. Indoor courts remain inside their mapped halls. */
export function createBoroughCourts(materials:BoroughMaterials,invalidate:()=>void) {
 const root=new THREE.Group();root.name='Islington mapped tennis courts'
 const surfaces=createClubSurfaces(materials.finishes.hardCourt,invalidate)
 const outer=cloneCourtFinish(surfaces.synthetic);outer.color.set('#42787a')
 const litPlaying=cloneCourtFinish(surfaces.synthetic);litPlaying.emissive.set('#a4c9b2');litPlaying.emissiveIntensity=0
 const lamp=new THREE.MeshStandardMaterial({color:'#e0dfcc',emissive:'#fff3ca',emissiveIntensity:0})
 const line=materials.white.clone(),lineWidth={value:.008}
 line.emissive.copy(line.color)
 line.emissiveIntensity=0
 line.onBeforeCompile=shader=>{
  shader.uniforms.courtLineWidth=lineWidth
  // Each line is a unit box scaled by its instance: widen only its narrow horizontal axis.
  shader.vertexShader='uniform float courtLineWidth;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float lineX=length(instanceMatrix[0].xyz),lineZ=length(instanceMatrix[2].xyz);
   if(lineX<lineZ)transformed.x*=max(1.0,courtLineWidth/lineX);else transformed.z*=max(1.0,courtLineWidth/lineZ);`)
 }
 line.customProgramCacheKey=()=>'borough-court-line-v1'
 let lineMesh:THREE.InstancedMesh|null=null
 const courtNets=createCourtNetGeometries(1.07,.045),owned:THREE.BufferGeometry[]=[courtNets.net,courtNets.tape]
 const fenceEdges:{a:THREE.Vector3;b:THREE.Vector3}[]=[]
 const animated:Parameters<typeof createTownLife>[0]=[]
 const batches=new Map<THREE.Material,THREE.Matrix4[]>(),transform=new THREE.Object3D()
 function part(g:THREE.Group,material:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number){transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,0,0);transform.updateMatrix();const list=batches.get(material)??[];list.push(g.matrixWorld.clone().multiply(transform.matrix));batches.set(material,list)}
 for(const c of boroughCourts){
  const g=new THREE.Group();g.position.set(c.x,0,c.z);g.rotation.y=c.rotation;g.scale.setScalar(.1);g.updateMatrixWorld(true)
  const {w,d,ow,od}=boroughCourtDimensions(c)
  const playing=c.lit?litPlaying:c.surface==='grass'?surfaces.grass:c.surface==='clay'?surfaces.clay:surfaces.synthetic
  part(g,surfaces.concrete,0,.06,0,ow+.28,.08,od+.28)
  part(g,outer,0,.12,0,ow,.04,od);part(g,playing,0,.15,0,w,.02,d)
  for(const side of [-1,1]){
   part(g,line,side*w/2,.19,0,.08,.012,d)
   part(g,line,side*w*.375,.19,0,.08,.012,d)
   part(g,line,0,.19,side*d/2,w,.012,.10)
   part(g,line,0,.19,side*d*.27,w*.75,.012,.08)
   part(g,surfaces.steel,side*w*.57,.685,0,.08,1.07,.08)
   for(const along of [false,true]){
    const a=new THREE.Vector3(along?side*ow/2:-ow/2,0,along?-od/2:side*od/2).applyMatrix4(g.matrixWorld),b=new THREE.Vector3(along?side*ow/2:ow/2,0,along?od/2:side*od/2).applyMatrix4(g.matrixWorld)
    if(fenceEdges.some(edge=>(edge.a.distanceTo(a)<.02&&edge.b.distanceTo(b)<.02)||(edge.a.distanceTo(b)<.02&&edge.b.distanceTo(a)<.02)))continue
    fenceEdges.push({a,b})
    const width=along?od:ow,fg=courtFenceGeometry(width,2.4);owned.push(fg)
    const fence=new THREE.Mesh(fg,surfaces.fence);fence.name='Mapped court fence';fence.position.set(along?side*ow/2:0,1.35,along?0:side*od/2);fence.rotation.y=along?Math.PI/2:0;fence.updateMatrix();fence.applyMatrix4(g.matrixWorld);fence.receiveShadow=true;root.add(fence)
    for(let at=-width/2;at<=width/2+.001;at+=width/Math.ceil(width/3.6))part(g,surfaces.steel,along?side*ow/2:at,1.35,along?at:side*od/2,.055,2.4,.055)
    part(g,surfaces.steel,along?side*ow/2:0,2.55,along?0:side*od/2,along?.05:width,.05,along?width:.05)
   }
  }
  part(g,line,0,.19,0,.08,.012,d*.54)
  const net=new THREE.Mesh(courtNets.net,materials.finishes.net);net.position.set(0,.685,0);net.scale.set(w*1.12,1.07,1);net.updateMatrix();net.applyMatrix4(g.matrixWorld);root.add(net)
  const tape=new THREE.Mesh(courtNets.tape,materials.white);tape.position.set(0,1.22,0);tape.scale.set(w*1.12,.045,.04);tape.updateMatrix();tape.applyMatrix4(g.matrixWorld);root.add(tape)
  const strapBase=.16,strapTop=1.22-courtNets.sag
  part(g,materials.white,0,(strapBase+strapTop)/2,0,.045,strapTop-strapBase,.065)
  // Seating and masts are illustrative furniture, always outside the playing area.
  part(g,materials.finishes.timber,ow/2+1.4,.65,0,.55,.12,2.4)
  for(const z of [-.8,.8])part(g,surfaces.steel,ow/2+1.4,.33,z,.28,.65,.1)
  if(c.lit)for(const side of [-1,1])for(const end of [-1,1]){part(g,surfaces.steel,side*(ow/2+.45),3.3,end*(od/2-.7),.10,6.6,.10);part(g,lamp,side*(ow/2+.45),6.6,end*(od/2-.7),.6,.18,.32)}
  if(w>7&&w<20&&d>16&&d<34)animated.push({center:new THREE.Vector3(c.x,0,c.z),rotation:c.rotation,scale:.1,halfLength:d*.5*.9,groundY:.016,nightPlayable:c.lit})
 }
 for(const [material,matrices] of batches){const mesh=new THREE.InstancedMesh(materials.box,material,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.receiveShadow=true;mesh.castShadow=material===materials.finishes.timber||material===surfaces.steel;mesh.computeBoundingSphere();root.add(mesh);if(material===line)lineMesh=mesh}
 const life=createTownLife(animated,[],()=>new THREE.Vector3(),[],false);root.add(life.root)
 return {root,setView(camera:THREE.OrthographicCamera,zoom:number,cssWidth:number){lineWidth.value=courtLineWidth((camera.right-camera.left)/zoom/cssWidth);if(lineMesh)lineMesh.visible=courtLinesVisible(zoom)},setNight(value:boolean){
  life.setNight(value);litPlaying.emissiveIntensity=value?.22:0;lamp.emissiveIntensity=value?2:0
  line.emissiveIntensity=value?.045:0
 },setActivity:life.setActivity,animate:life.animate,dispose(){
  owned.forEach(g=>g.dispose());line.dispose();outer.dispose();litPlaying.dispose();lamp.dispose();surfaces.dispose()
  const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>()
  life.root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m))}})
  geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());root.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose()})
 }}
}
