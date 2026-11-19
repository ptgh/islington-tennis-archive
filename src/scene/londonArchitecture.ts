import * as THREE from 'three';
import {createFootprintRoof} from './footprintRoof.ts';
import {containsPoint,roofBounds,type GeoFeature} from './boroughGeometry.ts';

type Parts={stationBrick:THREE.Material;brick:THREE.Material;concrete:THREE.Material;glass:THREE.Material;roof:THREE.Material;trim:THREE.Material;dark:THREE.Material;red:THREE.Material;polygon:(f:GeoFeature,m:THREE.Material,y:number,height?:number)=>void;part:(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,angle?:number)=>void;collect:(m:THREE.Material,g:THREE.BufferGeometry)=>void};
const ids=new Set([-72165470,4256246,4680891,107005576,5022282]);
/** Only the checked source footprints receive a dedicated architectural treatment.
 * Sources: bl.uk/visit/architecture-and-design; standardhotels.com/en-GB/london/properties/london;
 * historicengland.org.uk/advice/constructive-conservation/sustainable-growth-for-historic-places/transport-travel/
 * Roof bays, clock proportions and relief remain illustrative, with the original rings/holes. */
export function addLondonArchitecture(f:GeoFeature,height:number,api:Parts){
 const id=Number(f.id);if(!ids.has(id))return false;
 const {stationBrick,brick,concrete,glass,roof,trim,dark,red,polygon,part,collect}=api;
 const bounds={minX:Math.min(...f.points.map(p=>p[0])),maxX:Math.max(...f.points.map(p=>p[0])),minZ:Math.min(...f.points.map(p=>p[1])),maxZ:Math.max(...f.points.map(p=>p[1]))};
 const inside=(x:number,z:number)=>containsPoint(x,z,f.points)&&!f.holes?.some(h=>containsPoint(x,z,h));
 const solid=(m:THREE.Material,h:number)=>polygon(f,m,.012,h);
 function faceBands(h:number,floors:number,wall:THREE.Material,wide=false){
  const signed=f.points.slice(1).reduce((sum,b,i)=>sum+f.points[i][0]*b[1]-b[0]*f.points[i][1],0),sign=signed>0?1:-1;
  for(let i=1;i<f.points.length;i++){
   const a=f.points[i-1],b=f.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.25)continue;
   const nx=dz/len*sign,nz=-dx/len*sign,angle=-Math.atan2(dz,dx),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
   part(wall,x,h+.015,z,len,.035,.035,angle);
   const cols=Math.min(48,Math.max(1,Math.floor(len/(wide?.30:.48))));
   for(let floor=0;floor<floors;floor++)for(let col=0;col<cols;col++){
    const t=(col+.5)/cols,px=a[0]+dx*t,pz=a[1]+dz*t,y=(floor+.60)*h/floors;
    part(glass,px+nx*.018,y,pz+nz*.018,len/cols*(wide?.83:.58),h/floors*.52,.018,angle);
   }
   if(wide)for(let floor=1;floor<floors;floor++)part(wall,x+nx*.024,floor*h/floors,z+nz*.024,len,.035,.07,angle);
  }
 }
 function dial(x:number,y:number,z:number,r:number,heading=0){
  const disk=new THREE.CircleGeometry(r,24);disk.rotateY(heading);disk.translate(x,y,z);collect(trim,disk);
  const c=Math.cos(heading),s=Math.sin(heading);
  for(let mark=0;mark<12;mark++){
   const tick=new THREE.BoxGeometry(r*.055,r*.14,.008);
   tick.translate(0,r*.80,0);tick.rotateZ(-mark*Math.PI/6);tick.rotateY(heading);tick.translate(x+s*.009,y,z+c*.009);collect(dark,tick);
  }
  for(const [dx,dy,w,h] of [[0,r*.22,.014,r*.48],[r*.18,0,r*.38,.014]])part(dark,x+c*dx+s*.004,y+dy,z-s*dx+c*.004,w,h,.012,heading);
 }
 function barrel(x0:number,x1:number,z0:number,z1:number,base:number,rise:number,shift=0){
  // The checked strips sit inside the mapped shed. Reject any edge tile that
  // would project beyond its source ring; no rectangular replacement footprint.
  const positions:number[]=[],uv:number[]=[],glazed:number[]=[],glassUV:number[]=[],steps=24,ribs=12;
  const at=(u:number,v:number)=>[x0+(x1-x0)*u+shift*v,base+Math.sin(u*Math.PI)*rise,z0+(z1-z0)*v];
  for(let row=0;row<ribs;row++)for(let col=0;col<steps;col++){
   const q=[at(col/steps,row/ribs),at((col+1)/steps,row/ribs),at((col+1)/steps,(row+1)/ribs),at(col/steps,(row+1)/ribs)];
   if(q.some(p=>!inside(p[0],p[2])))continue;
   // A continuous crown rooflight, divided by the existing structural ribs.
   // Both finishes use the same surface; there is no coplanar overlay to shimmer.
   const rooflight=col>=10&&col<14,vertices=rooflight?glazed:positions,texcoords=rooflight?glassUV:uv;
   for(const i of [0,2,1,0,3,2]){vertices.push(...q[i]);texcoords.push(q[i][0],q[i][2]);}
   if(row%2===0){const a=q[0],b=q[1],g=new THREE.CylinderGeometry(.012,.012,new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)),4);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize()));g.translate((a[0]+b[0])/2,(a[1]+b[1])/2+.012,(a[2]+b[2])/2);collect(trim,g);}
   if([4,8,12,16,20].includes(col)){
    const a=q[0],b=q[3],g=new THREE.CylinderGeometry(.006,.006,new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)),4);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize()));g.translate((a[0]+b[0])/2,(a[1]+b[1])/2+.009,(a[2]+b[2])/2);collect(trim,g);
   }
  }
  for(const [vertices,texcoords,finish] of [[positions,uv,roof],[glazed,glassUV,glass]] as const)if(vertices.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(texcoords,2));g.computeVertexNormals();collect(finish,g);}
 }
 if(id===107005576){
  // Restored concrete grid, dark top floors and the Euston Road red-pill lift.
  solid(concrete,height*.78);polygon(f,glass,height*.78,height*.22);polygon(f,roof,height+.015);faceBands(height*.78,7,concrete,true);
  // Source north-facing long edge, on the Euston Road side.
  const a=f.points[3],b=f.points[4],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len,x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,angle=-Math.atan2(dz,dx);
  part(dark,x+nx*.07,height*.50,z+nz*.07,.23,height,.10,angle);
  for(const side of [-1,1])part(trim,x+dx/len*side*.10+nx*.13,height*.50,z+dz/len*side*.10+nz*.13,.015,height,.025,angle);
  const capsule=new THREE.CapsuleGeometry(.105,height*.15,5,12);capsule.rotateY(angle);capsule.translate(x+nx*.19,height*.52,z+nz*.19);collect(red,capsule);
  part(glass,x+nx*.285,height*.52,z+nz*.285,.14,height*.12,.025,angle);
  return true;
 }
 if(id===5022282){
  // Retain the source circular base and the established height cap. Upper bands,
  // equipment galleries and aerials describe the tower without expanding its footprint.
  solid(concrete,height*.69);polygon(f,glass,height*.69,height*.20);polygon(f,concrete,height*.89,height*.06);
  const cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2,r=(bounds.maxX-bounds.minX)*.48;
  for(const level of [.37,.42,.47,.52,.69,.75,.81,.88,.94]){const g=new THREE.CylinderGeometry(r,r,height*.008,32);g.translate(cx,height*level,cz);collect(level<.6?dark:trim,g);}
  // The old microwave dishes have been removed. Keep today's open gallery frames.
  for(let i=0;i<12;i++){const t=i*Math.PI/6;part(trim,cx+Math.cos(t)*r,height*.45,cz+Math.sin(t)*r,.018,height*.16,.018);}
  part(dark,cx,height*.973,cz,.035,height*.054,.035);return true;
 }
 if(id===4680891){
  // Reading-room roofs step down towards the piazza. Each strip clips the
  // source ring; its ridges never replace the outline with a rectangle.
  solid(brick,height*.46);faceBands(height*.46,3,brick);
  const clipped=(ring:number[][],cut:number,keepAbove:boolean)=>{
   const output:number[][]=[];
   for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],ai=keepAbove?a[1]>=cut:a[1]<=cut,bi=keepAbove?b[1]>=cut:b[1]<=cut;
    if(ai)output.push(a);
    if(ai!==bi){const t=(cut-a[1])/(b[1]-a[1]);output.push([a[0]+t*(b[0]-a[0]),cut]);}
   }
   return output;
  };
  for(const [z0,z1,level] of [[199,205,.86],[205,211,.74],[211,217,.62],[217,223,.50]]){
   const ring=clipped(clipped(f.points.slice(0,-1),z0,true),z1,false);if(ring.length<3)continue;
   const points=[...ring,ring[0]],piece={...f,points,holes:[]};polygon(piece,brick,.012,height*level);
   collect(roof,createFootprintRoof(points,roofBounds(points),height*level+.014,.11));
  }
  // Clock/ventilation tower placed within the mapped library's rear wing.
  const tx=-87.5,tz=208.0;if(inside(tx,tz)){part(brick,tx,height*.72,tz,.45,height*.56,.48);part(dark,tx,height*.98,tz,.37,.03,.40);dial(tx,height*.86,tz+.247,.10);for(let i=0;i<5;i++)part(dark,tx-.14+i*.07,height*.955,tz+.25,.017,.14,.012);}
  return true;
 }
 // Both termini retain all mapped wall vertices and holes. The main train sheds
 // gain ribbed barrel roofs; King's Cross's western canopy gains a radial frame.
 const kings=id===-72165470,wallHeight=kings?height*.36:height*.54;
 solid(kings?stationBrick:brick,wallHeight);faceBands(wallHeight,kings?2:3,kings?stationBrick:brick);polygon(f,roof,wallHeight+.015);
 if(kings){
  barrel(-60.95,-57.2,175.9,200.25,wallHeight+.02,height*.28,-.43);
  barrel(-57.1,-53.35,175.9,200.25,wallHeight+.02,height*.28,-.43);
  // Fan canopy over the recorded curved western concourse.
  const centre=new THREE.Vector3(-61.9,wallHeight+.08,193.25);
  for(let i=0;i<=24;i++){
   const t=-Math.PI/2+i*Math.PI/24,end=new THREE.Vector3(centre.x-Math.cos(t)*6.8,centre.y,centre.z+Math.sin(t)*6.8);
   if(!inside(end.x,end.z))continue;
   const g=new THREE.CylinderGeometry(.018,.018,centre.distanceTo(end),4);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(centre).normalize()));g.translate((centre.x+end.x)/2,centre.y,(centre.z+end.z)/2);collect(trim,g);
  }
  // Cubitt's two large arched front windows are the ends of the paired sheds.
  for(const [cx,cz] of [[-59.2,200.66],[-55.2,200.83]]){
   const shape=(r:number,h:number)=>{const s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.lineTo(-r,0);return s;};
   for(const [radius,h,m,out] of [[1.66,1.92,stationBrick,0],[1.54,1.79,glass,.012]] as const){const g=new THREE.ShapeGeometry(shape(radius,h),24);g.translate(cx,.15,cz+out);collect(m,g);}
   for(let col=-2;col<=2;col++)part(trim,cx+col*.49,.76,cz+.03,.025,1.14,.02);
   part(trim,cx,.72,cz+.03,2.93,.025,.02);
  }
  const x=-57.25,z=200.4;part(stationBrick,x,height*.66,z,.68,height*.68,.55);part(trim,x,height+.015,z,.75,.035,.62);dial(x,height*.87,z+.28,.20);
 }else barrel(-80.0,-66.95,170.0,205.6,wallHeight+.02,height*.43,-6.1);
 return true;
}
