import * as THREE from 'three';
import {mappedServices} from '../data/hub.ts';
import {busRoutes} from '../data/busRoutes.ts';
import {busRouteLine,type CourtArea} from './courtGeometry.ts';
export function createGear(project:(lat:number,lng:number)=>THREE.Vector3,courts:CourtArea[]=[]){
 const root=new THREE.Group(),box=new THREE.BoxGeometry(1,1,1);
 const mats=new Map<string,THREE.MeshStandardMaterial>();
 function part(g:THREE.Group,c:string,x:number,y:number,z:number,w:number,h:number,d:number){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.8}));const m=new THREE.Mesh(box,mats.get(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
 for(const shop of mappedServices){const g=new THREE.Group();g.position.copy(project(shop.lat,shop.lng));root.add(g);const wigmore=shop.id==='wigmore-sports';
  part(g,'#c7baa0',0,.3,0,15,.6,12);part(g,wigmore?'#b6a28c':'#9a795a',0,4,0,11,8,8);part(g,'#344f43',0,8.3,0,12,.8,9);
  for(const x of [-3,3])part(g,'#78a3a1',x,2.2,4.08,3.4,3.2,.12);part(g,'#334d43',0,1.8,4.1,1.5,3.6,.2);
  part(g,wigmore?'#283f58':'#4c6b48',0,4.5,4.7,12,.6,2);for(const x of [-4,-2,0,2,4])part(g,'#e9e2c9',x,4.51,4.72,.7,.62,2.05);
  for(const x of [-3,0,3])part(g,'#526e6c',x,6.4,4.1,1.4,1.7,.1);
 }
 const van=new THREE.Group();van.name='Sweet Spot miniature van';van.scale.setScalar(.28);root.add(van);
 part(van,'#eee5ca',0,1.5,0,2.7,2.5,5);part(van,'#507b68',0,1.1,2.4,2.7,1.7,1.5);part(van,'#749da2',0,2.05,2.5,2.4,.9,1);part(van,'#476450',0,1.5,-.4,2.76,.65,3);
 for(const x of [-1.4,1.4])for(const z of [-1.6,2])part(van,'#35423b',x,.6,z,.45,1.1,1.1);
 for(const x of [-.85,.85])part(van,'#efe9ae',x,1.2,3.2,.45,.35,.1);
 // Small racket motifs on the van sides.
 for(const x of [-1.4,1.4]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.4,.06,4,12),new THREE.MeshStandardMaterial({color:'#e6eab8'}));ring.rotation.y=Math.PI/2;ring.position.set(x,1.7,-.4);van.add(ring);part(van,'#e6eab8',x,1,-.4,.07,.6,.07);}
 // Shares route 19 and its road-aligned Highbury Grove section.
 // The van shares route 19's road, bent around Highbury Fields and courts exactly as the road is.
 const points=busRouteLine(busRoutes.find(route=>route.id==='19')!.points.map(([lng,lat]):[number,number]=>{const p=project(lat,lng);return [p.x,p.z];}),courts);
 const segments=points.slice(1).map((p,i)=>({a:new THREE.Vector3(points[i][0],0,points[i][1]),b:new THREE.Vector3(p[0],0,p[1])}));
 const lengths=segments.map(s=>s.a.distanceTo(s.b)),total=lengths.reduce((a,b)=>a+b,0);let distance=total*.45;
 function animate(delta:number,running:boolean){if(running)distance=(distance+delta*5)%(total*2);let d=distance<=total?distance:2*total-distance;for(let i=0;i<segments.length;i++){if(d<=lengths[i]||i===segments.length-1){const {a,b}=segments[i];van.position.copy(a).lerp(b,d/lengths[i]);van.rotation.y=Math.atan2(b.x-a.x,b.z-a.z)+(distance>total?Math.PI:0);break;}d-=lengths[i];}}
 animate(0,false);return {root,van,animate};
}
