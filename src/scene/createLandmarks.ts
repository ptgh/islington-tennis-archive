import * as THREE from 'three';
import {places} from '../data/places.ts';
import type {createMiniatureMaterials} from './miniatureMaterials';
import {gableRoofGeometry} from './gableRoof.ts';
// Small architectural miniatures, deliberately subordinate to the tennis courts.
// All dimensions are illustrative; positions share the map's geographic projection.
export function createLandmarks(project:(lat:number,lng:number)=>THREE.Vector3,finishes?:ReturnType<typeof createMiniatureMaterials>){
 const root=new THREE.Group();root.name='Architectural landmarks';
 const box=new THREE.BoxGeometry(1,1,1);
 const materials=new Map<string,THREE.MeshStandardMaterial>();
 const mat=(color:string)=>{
  if(!materials.has(color)){
   const surface=finishes&&['#a77d59','#b49b7d'].includes(color)?finishes.brick.clone():finishes&&color==='#46534a'?finishes.slate.clone():new THREE.MeshStandardMaterial({roughness:.9});
   surface.color.set(color);materials.set(color,surface);
  }return materials.get(color)!;
 };
 function part(parent:THREE.Group,color:string,x:number,y:number,z:number,w:number,h:number,d:number,geometry:THREE.BufferGeometry=box){const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const brick='#a77d59',stone='#c9c4ac',roof='#46534a',glass='#617d77';
 for(const place of places.filter(p=>p.kind==='landmark')){
  const g=new THREE.Group();g.name=place.id;g.position.copy(project(place.lat,place.lng));root.add(g);
  if(place.id==='clock-tower'){
   part(g,stone,0,.3,0,9,.6,9);part(g,brick,0,10,0,4.8,20,4.8);
   for(const y of [3,14,19,23])part(g,stone,0,y,0,5.7,.6,5.7);
   part(g,brick,0,21,0,5,4,5);
   const face=new THREE.CircleGeometry(1,24);
   for(let i=0;i<4;i++){const a=i*Math.PI/2;const f=part(g,'#f0e8cc',Math.sin(a)*2.56,21,Math.cos(a)*2.56,1.6,1.6,1,face);f.rotation.y=a;
    const hand=part(g,roof,Math.sin(a)*2.59,21.45,Math.cos(a)*2.59,.12,1, .12);hand.rotation.y=a;
    const short=part(g,roof,Math.sin(a)*2.60,21,Math.cos(a)*2.60,.85,.12,.12);short.rotation.y=a;}
   part(g,roof,0,24,0,3,3,3,new THREE.ConeGeometry(1,1,4));
  }else if(place.id==='union-chapel'){
   part(g,brick,0,5,0,11,10,18);
   // Gabled nave: ridge runs the hall's length, with brick gable ends above the rose window.
   const gable=gableRoofGeometry();const r=part(g,roof,0,10,0,19,5,11.8,gable);r.rotation.y=Math.PI/2;r.name='union-chapel-roof';
   for(const z of [-9.56,9.56]){const end=part(g,brick,0,10,z,.12,4.9,11.2,gable);end.rotation.y=Math.PI/2;}
   part(g,brick,6,10,-4,4,20,4);part(g,roof,6,22,-4,3.3,7,3.3,new THREE.ConeGeometry(1,1,8));
   const rose=part(g,stone,0,7,9.06,2.1,2.1,1,new THREE.RingGeometry(.65,1,16));rose.material=new THREE.MeshStandardMaterial({color:stone,side:THREE.DoubleSide});
   part(g,glass,0,7,9.02,1.4,1.4,1,new THREE.CircleGeometry(1,16));
   for(const x of [-3.5,0,3.5])part(g,glass,x,2.6,9.1,1.4,4,.12);
  }else if(place.id==='estorick'){
   part(g,stone,0,.2,0,17,.4,17);part(g,'#b49b7d',0,4,0,12,8,10);part(g,roof,0,8.3,0,12.5,1,10.5);
   for(const x of [-4,-2,0,2,4])for(const y of [2,5.5]){part(g,'#eee5cd',x,y,5.08,1.25,2,.16);part(g,glass,x,y,5.18,.9,1.6,.08);}
   part(g,roof,0,1.5,5.3,1.3,3,.3);part(g,stone,0,.4,6.1,3,.8,2);
   // Gallery entrance banners, walled sculpture garden and conservatory distinguish the villa.
   for(const x of [-5.5,5.5]){part(g,'#d2c7ac',x,4,5.5,.12,6,.12);part(g,'#a25043',x,4.6,5.6,1.2,3,.1);}
   part(g,'#a4ad78',0,.35,-8,15,.2,6);
   for(const x of [-8,8])part(g,stone,x,1,-3,.4,2,22);
   part(g,glass,4,2.2,-7,5,4,4);part(g,stone,4,4.3,-7,5.5,.3,4.5);
   part(g,stone,-4,.7,-8,2,1,2);
   part(g,'#596459',-4,2.2,-8,1,2,1,new THREE.TorusGeometry(.7,.18,6,12));
  }else if(place.id==='barbican-centre'){
   // Northward footprint leaves the separate residents' tennis courts clear to the south.
   part(g,stone,0,.3,-12,32,.6,27);part(g,'#799e96',0,.7,-5,20,.15,8);
   for(const x of [-12,12]){part(g,'#9b9d8d',x,5,-14,6,10,23);for(let y=2;y<10;y+=2)part(g,stone,x,y,-14,6.6,.45,23.6);}
   part(g,'#aaa998',0,7,-23,22,14,7);for(let y=3;y<14;y+=2)part(g,stone,0,y,-19.3,22,.5,.7);
   part(g,'#929888',12,18,-24,7,36,7);for(let y=3;y<36;y+=3)part(g,stone,12,y,-24,7.8,.6,7.8);
   part(g,stone,0,3,-1,25,.7,2);for(const x of [-10,10])part(g,stone,x,1.5,-1,.7,3,.7);
  }
 }
 return root;
}
