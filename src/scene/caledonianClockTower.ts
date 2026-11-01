import * as THREE from 'three'
import type { GeoFeature } from './boroughGeometry.ts'

type Parts={
 stone:THREE.Material;dark:THREE.Material;dial:THREE.Material;roof:THREE.Material
 polygon:(f:GeoFeature,m:THREE.Material,y:number,height?:number)=>void
 part:(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,angle?:number)=>void
 collect:(m:THREE.Material,g:THREE.BufferGeometry)=>void
}

/** OSM way 37371124 only. Footprint and total height stay source-derived.
 * Five stages, dials, paired louvres and belvedere follow Historic England
 * https://historicengland.org.uk/listing/the-list/list-entry/1298021
 * Photo reference: caledonianparkfriendsgroup.org/img/clktwrsunv.jpg
 * Relief/proportions are illustrative, not a measured survey. */
export function addCaledonianClockTower(f:GeoFeature,height:number,api:Parts){
 if(Number(f.id)!==37371124)return false
 const {stone,dark,dial,roof,polygon,part,collect}=api,base=.012
 polygon(f,stone,base,height*.77)
 const points=f.points.slice(0,-1),cx=points.reduce((s,p)=>s+p[0],0)/points.length,cz=points.reduce((s,p)=>s+p[1],0)/points.length
 const signed=f.points.slice(1).reduce((s,b,i)=>s+f.points[i][0]*b[1]-b[0]*f.points[i][1],0),sign=signed>0?1:-1
 const arch=(w:number,h:number)=>{const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.lineTo(-r,0);return s}
 for(let i=1;i<f.points.length;i++){
  const a=f.points[i-1],b=f.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=dz/len*sign,nz=-dx/len*sign,angle=Math.atan2(nx,nz),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2
  function block(m:THREE.Material,u:number,y:number,out:number,w:number,h:number,d:number){part(m,mx+nz*u+nx*out,base+y,mz-nx*u+nz*out,w,h,d,angle)}
  function face(g:THREE.BufferGeometry,m:THREE.Material,u:number,y:number,out:number){g.rotateY(angle);g.translate(mx+nz*u+nx*out,base+y,mz-nx*u+nz*out);collect(m,g)}
  function opening(u:number,y:number,w:number,h:number,out=.025){
   const rim=new THREE.ExtrudeGeometry(arch(w+.035,h+.035),{depth:.018,bevelEnabled:false,curveSegments:10});face(rim,stone,u,y-.017,out)
   face(new THREE.ShapeGeometry(arch(w,h),10),dark,u,y,out+.02)
  }
  // Rusticated lower courses and five projecting cornices.
  for(let y=.07;y<height*.75;y+=.095)block(stone,0,y,.008,len+.016,.012,.022)
  for(const level of [.18,.37,.53,.77,.90]){block(stone,0,height*level,.025,len+.12,.045,.13);block(stone,0,height*level-.035,.016,len+.07,.02,.08)}
  for(const side of [-1,1])block(stone,side*(len/2-.055),height*.46,.025,.09,height*.61,.07)
  opening(0,height*.035,len*.29,height*.115)
  opening(0,height*.215,len*.24,height*.105)
  // Oculus with cross bars, then the paired louvred openings below the dial.
  const oculus=len*.14
  face(new THREE.CircleGeometry(oculus+.022,32),stone,0,height*.45,.035)
  face(new THREE.CircleGeometry(oculus,32),dark,0,height*.45,.039)
  block(stone,0,height*.45,.045,oculus*2,.009,.01);block(stone,0,height*.45,.045,.009,oculus*2,.01)
  for(const u of [-len*.16,len*.16]){
   const w=len*.22,h=height*.105,y=height*.555
   opening(u,y,w,h)
   for(let at=.035;at<h-w*.4;at+=.035)block(stone,u,y+at,.055,w,.009,.026)
  }
  const radius=len*.205,dialY=height*.705
  face(new THREE.CircleGeometry(radius+.027,48),dark,0,dialY,.046)
  face(new THREE.CircleGeometry(radius+.013,48),stone,0,dialY,.049)
  face(new THREE.CircleGeometry(radius,48),dial,0,dialY,.052)
  // Raised indices and fixed miniature hands; this is not a live clock.
  for(let mark=0;mark<12;mark++){
   const theta=mark*Math.PI/6,g=new THREE.BoxGeometry(.011,radius*.20,.008)
   g.rotateZ(-theta);g.translate(Math.sin(theta)*radius*.81,Math.cos(theta)*radius*.81,0);face(g,dark,0,dialY,.061)
  }
  for(const [theta,length] of [[-Math.PI/3,radius*.5],[Math.PI/3,radius*.73]]){
   const g=new THREE.BoxGeometry(.014,length,.009);g.translate(0,length/2,0);g.rotateZ(-theta);face(g,dark,0,dialY,.065)
  }
  face(new THREE.CircleGeometry(.017,16),dark,0,dialY,.073)
  // Three arched recesses on every face of the upper bell chamber.
  const chamberY=height*.785,chamberH=height*.10
  block(dark,0,chamberY+chamberH/2,-.035,len*.91,chamberH,.014)
  for(const u of [-len*.31,0,len*.31])opening(u,chamberY,len*.22,chamberH,.012)
  for(const u of [-len*.465,-len*.155,len*.155,len*.465])block(stone,u,chamberY+chamberH/2,.034,len*.065,chamberH,.09)
  block(stone,0,chamberY-.035,.055,len+.18,.025,.20)
  block(dark,0,chamberY+.015,.11,len+.14,.012,.016)
  for(let u=-len*.51;u<len*.52;u+=len*.065)block(dark,u,chamberY-.015,.11,.009,.06,.012)
  for(const u of [-len*.38,-len*.13,len*.13,len*.38])block(stone,u,height*.89,.055,.04,.055,.13)
 }
 // Four roof facets use the original mapped corners, with only a cornice overhang.
 const vertices:number[]=[],uv:number[]=[]
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length]
  for(const [x,y,z] of [[cx+(b[0]-cx)*1.12,base+height*.91,cz+(b[1]-cz)*1.12],[cx+(a[0]-cx)*1.12,base+height*.91,cz+(a[1]-cz)*1.12],[cx,base+height*.985,cz]]){vertices.push(x,y,z);uv.push(x,z)}
 }
 const pyramid=new THREE.BufferGeometry();pyramid.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));pyramid.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));pyramid.computeVertexNormals();collect(roof,pyramid)
 part(dark,cx,base+height*.9925,cz,.015,height*.015,.015)
 return true
}
