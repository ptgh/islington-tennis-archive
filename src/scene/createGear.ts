import * as THREE from 'three';
import {mappedServices} from '../data/hub.ts';
import {busRoutes} from '../data/busRoutes.ts';
import roadRoutes from '../data/borough-transport.json' with {type:'json'};
import type {TrafficSpace} from './trafficSpace.ts';
import {busRouteLine,type CourtArea} from './courtGeometry.ts';
export function createGear(project:(lat:number,lng:number)=>THREE.Vector3,courts:CourtArea[]=[],geographic=false,traffic?:TrafficSpace){
 const trafficId=traffic?.scope()+'van';
 const root=new THREE.Group(),box=new THREE.BoxGeometry(1,1,1);
 const mats=new Map<string,THREE.MeshStandardMaterial>();
 function part(g:THREE.Group,c:string,x:number,y:number,z:number,w:number,h:number,d:number){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.8}));const m=new THREE.Mesh(box,mats.get(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 for(const shop of geographic?[]:mappedServices){const g=new THREE.Group();g.position.copy(project(shop.lat,shop.lng));root.add(g);const wigmore=shop.id==='wigmore-sports';
  part(g,'#c7baa0',0,.3,0,15,.6,12);part(g,wigmore?'#b6a28c':'#9a795a',0,4,0,11,8,8);part(g,'#344f43',0,8.3,0,12,.8,9);
  for(const x of [-3,3])part(g,'#78a3a1',x,2.2,4.08,3.4,3.2,.12);part(g,'#334d43',0,1.8,4.1,1.5,3.6,.2);
  part(g,wigmore?'#283f58':'#4c6b48',0,4.5,4.7,12,.6,2);for(const x of [-4,-2,0,2,4])part(g,'#e9e2c9',x,4.51,4.72,.7,.62,2.05);
  for(const x of [-3,0,3])part(g,'#526e6c',x,6.4,4.1,1.4,1.7,.1);
 }
 const van=new THREE.Group();van.name='Sweet Spot miniature van';van.scale.setScalar(.28);root.add(van);
 part(van,'#eee5ca',0,1.5,0,2.7,2.5,5);part(van,'#507b68',0,1.1,2.4,2.7,1.7,1.5);part(van,'#749da2',0,2.05,2.5,2.4,.9,1);part(van,'#476450',0,1.5,-.4,2.76,.65,3);
 const tyreGeometry=new THREE.CylinderGeometry(.55,.55,.45,12),hubGeometry=new THREE.CylinderGeometry(.26,.26,.47,10);tyreGeometry.rotateZ(Math.PI/2);hubGeometry.rotateZ(Math.PI/2)
 const tyreMaterial=new THREE.MeshStandardMaterial({color:'#303b36',roughness:.95}),hubMaterial=new THREE.MeshStandardMaterial({color:'#b4b9a9',roughness:.55,metalness:.25}),wheels:THREE.Group[]=[]
 for(const x of [-1.4,1.4])for(const z of [-1.6,2]){const wheel=new THREE.Group();wheel.name='Stringer rolling wheel';wheel.position.set(x,.6,z);wheel.add(new THREE.Mesh(tyreGeometry,tyreMaterial),new THREE.Mesh(hubGeometry,hubMaterial));wheel.children.forEach(o=>{o.castShadow=true;o.receiveShadow=true});van.add(wheel);wheels.push(wheel)}
 part(van,'#33463d',0,.72,3.22,2.8,.26,.17);part(van,'#33463d',0,.7,-2.55,2.8,.22,.14)
 for(const x of [-1.03,1.03])part(van,'#a54835',x,1.1,-2.53,.28,.5,.08)
 for(const x of [-1.39,1.39]){part(van,'#b9c5b6',x,.45,-.1,.06,.13,3.3);part(van,'#344d45',x,2.04,2.1,.15,.45,.28)}
 for(const x of [-.85,.85])part(van,'#efe9ae',x,1.2,3.2,.45,.35,.1);
 // Small racket motifs on the van sides.
 for(const x of [-1.4,1.4]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.4,.06,4,12),new THREE.MeshStandardMaterial({color:'#e6eab8'}));ring.rotation.y=Math.PI/2;ring.position.set(x,1.7,-.4);van.add(ring);part(van,'#e6eab8',x,1,-.4,.07,.6,.07);}
 // The continuous map uses source carriageways; the illustrative town keeps
 // its shared park/court-safe road line. Both vehicles and roads agree.
 const points=geographic?roadRoutes['19'].map(([x,z]):[number,number]=>[x*10,z*10]):busRouteLine(busRoutes.find(route=>route.id==='19')!.points.map(([lng,lat]):[number,number]=>{const p=project(lat,lng);return [p.x,p.z];}),courts);
 const segments=points.slice(1).map((p,i)=>({a:new THREE.Vector3(points[i][0],0,points[i][1]),b:new THREE.Vector3(p[0],0,p[1])}));
 const lengths=segments.map(s=>s.a.distanceTo(s.b)),total=lengths.reduce((a,b)=>a+b,0);let distance=total*.45,yieldTime=0,placed=false;
 function poseAt(progress:number){let d=progress<=total?progress:2*total-progress;for(let i=0;i<segments.length;i++){if(d<=lengths[i]||i===segments.length-1){const {a,b}=segments[i],p=a.clone().lerp(b,d/lengths[i]),heading=Math.atan2(b.x-a.x,b.z-a.z)+(progress>total?Math.PI:0);if(traffic){p.x+=Math.cos(heading)*1.25;p.z-=Math.sin(heading)*1.25;}return {p,heading};}d-=lengths[i];}return null;}
 function animate(delta:number,running:boolean){
  if(running)yieldTime=Math.max(0,yieldTime-delta);
  const reverse=()=>Math.max(distance<=total?0:total,distance-delta*2.5);
  let next=running?(yieldTime>0?reverse():(distance+delta*5)%(total*2)):distance,pose=poseAt(next);if(!pose)return;
  const footprint=({p,heading}:NonNullable<ReturnType<typeof poseAt>>)=>({x:p.x*.1,z:p.z*.1,heading,halfWidth:.115,halfLength:.235});
  if(traffic&&!traffic.move(trafficId,footprint(pose))){
   // At a tight source bend, give an oncoming bus room to finish its turn.
   // Reverse along the same checked lane; never jump aside or ignore occupancy.
   if(!running||delta<=0||!traffic.blockers(trafficId,footprint(pose)).some(p=>Math.cos(p.heading-pose!.heading)<-.25))return;
   yieldTime=2;next=reverse();pose=poseAt(next);
   if(!pose||!traffic.move(trafficId,footprint(pose)))return;
  }
  if(placed){const travelled=(pose.p.x-van.position.x)*Math.sin(pose.heading)+(pose.p.z-van.position.z)*Math.cos(pose.heading);for(const wheel of wheels)wheel.rotation.x+=travelled/(van.scale.x*.55)}
  distance=next;van.position.copy(pose.p);van.rotation.y=pose.heading;placed=true;
 }
 animate(0,false);return {root,van,animate};
}
