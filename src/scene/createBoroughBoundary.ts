import * as THREE from 'three'
import { boroughGeography } from './boroughGeometry.ts'
import { projectPoint } from './courtGeometry.ts'

/** Neighbouring areas the source map reaches into. Names only: their outlines are not stored. */
export const BOROUGH_NEIGHBOURS=[
 {name:'Camden',lat:51.542,lng:-.144},
 {name:'Haringey',lat:51.5765,lng:-.102},
 {name:'Hackney',lat:51.558,lng:-.0805},
 {name:'City of London',lat:51.518,lng:-.095},
].map(place=>{const [x,z]=projectPoint(place.lng,place.lat);return {...place,x,z}})

/** Above this zoom the neighbour names are off the point: the view is a single street. */
export const NEIGHBOUR_LABEL_MAX_ZOOM=8
const LINE_PIXELS=2.2,WASH_REACH=6000
const DAY={wash:'#efe8d4',washOpacity:.16,line:'#fff4d2',lineOpacity:.9}
const NIGHT={wash:'#14242a',washOpacity:.3,line:'#d9cfae',lineOpacity:.55}

/** Full strength at map scale; gone by street scale, where the flat overlay would cross façades. */
export function boundaryStrength(zoom:number){return 1-THREE.MathUtils.smoothstep(zoom,10,20)}
/** The wash is for reading the map; by the time you are looking at a place it has gone. */
export function washStrength(zoom:number){return 1-THREE.MathUtils.smoothstep(zoom,6,12)}
/** Above the ground layers but below every court surface, building and tree, so the
 * depth test leaves anything standing on the map at full strength. */
const WASH_HEIGHT=.012

/** Ring of the borough, kept separate so tests can check the same points the mesh uses. */
export function washGeometry(ring:number[][]){
 const shape=new THREE.Shape([[-WASH_REACH,-WASH_REACH],[WASH_REACH,-WASH_REACH],[WASH_REACH,WASH_REACH],[-WASH_REACH,WASH_REACH]].map(([x,y])=>new THREE.Vector2(x,y)))
 shape.holes.push(new THREE.Path(ring.slice(0,-1).map(([x,z])=>new THREE.Vector2(x,-z))))
 const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);geometry.translate(0,WASH_HEIGHT,0);return geometry
}

/** Each edge is a quad whose width is added in the vertex shader, so zooming costs no rebuild. */
function ribbonGeometry(ring:number[][]){
 const positions:number[]=[],sides:number[]=[],indices:number[]=[]
 for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(!length)continue
  const nx=-dz/length,nz=dx/length,first=positions.length/3
  for(const [point,side] of [[a,1],[a,-1],[b,1],[b,-1]] as const){positions.push(point[0],.07,point[1]);sides.push(nx*side,nz*side)}
  indices.push(first,first+1,first+2,first+1,first+3,first+2)
 }
 const geometry=new THREE.BufferGeometry()
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
 geometry.setAttribute('edgeSide',new THREE.Float32BufferAttribute(sides,2))
 geometry.setIndex(indices);return geometry
}

/** Outside Islington recedes a little; inside is left exactly as rendered. */
export function createBoroughBoundary(){
 const root=new THREE.Group();root.name='Islington boundary'
 const ring=boroughGeography.boundary
 const overlay=(depthTest:boolean)=>new THREE.MeshBasicMaterial({transparent:true,depthTest,depthWrite:false,fog:false,side:THREE.DoubleSide})
 const washMaterial=overlay(true),lineMaterial=overlay(false),halfWidth={value:.5}
 lineMaterial.onBeforeCompile=shader=>{
  shader.uniforms.boundaryHalfWidth=halfWidth
  shader.vertexShader='attribute vec2 edgeSide;\nuniform float boundaryHalfWidth;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.xz+=edgeSide*boundaryHalfWidth;')
 }
 lineMaterial.customProgramCacheKey=()=>'borough-boundary-ribbon-v1'
 const wash=new THREE.Mesh(washGeometry(ring),washMaterial);wash.name='Outside Islington wash';wash.renderOrder=30;wash.frustumCulled=false
 const line=new THREE.Mesh(ribbonGeometry(ring),lineMaterial);line.name='Islington boundary line';line.renderOrder=31;line.frustumCulled=false
 root.add(wash,line)
 let palette=DAY,strength=1,washFade=1
 function apply(){
  washMaterial.color.set(palette.wash);lineMaterial.color.set(palette.line)
  washMaterial.opacity=palette.washOpacity*washFade;lineMaterial.opacity=palette.lineOpacity*strength
  wash.visible=washFade>.001;line.visible=strength>.001
 }
 apply()
 return {root,
  setView(camera:THREE.OrthographicCamera,zoom:number,cssWidth:number){
   strength=boundaryStrength(zoom);washFade=washStrength(zoom);halfWidth.value=LINE_PIXELS*(camera.right-camera.left)/zoom/cssWidth/2;apply()
  },
  setNight(value:boolean){palette=value?NIGHT:DAY;apply()},
  dispose(){wash.geometry.dispose();line.geometry.dispose();washMaterial.dispose();lineMaterial.dispose()},
 }
}
