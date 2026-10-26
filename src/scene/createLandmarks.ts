import * as THREE from 'three';
import {places} from '../data/places.ts';
import type {createMiniatureMaterials} from './miniatureMaterials';
import {cloneArchitecturalFinish,cloneWorldArchitecturalFinish} from './miniatureMaterials.ts';
import {gableRoofGeometry} from './gableRoof.ts';
import {archedOpeningGeometry} from './townArchitecture.ts';
// Small architectural miniatures, deliberately subordinate to the tennis courts.
// All dimensions are illustrative; positions share the map's geographic projection.
export function createLandmarks(project:(lat:number,lng:number)=>THREE.Vector3,finishes?:ReturnType<typeof createMiniatureMaterials>){
 const root=new THREE.Group();root.name='Architectural landmarks';
 const box=new THREE.BoxGeometry(1,1,1);
 const arch=archedOpeningGeometry();
 const pinnacle=new THREE.ConeGeometry(1,1,6);
 const detailBatches=new Map<THREE.Group,Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material;shadow:boolean;matrices:THREE.Matrix4[]}>>();
 const transform=new THREE.Object3D();
 const materials=new Map<string,THREE.MeshStandardMaterial>();
 const mat=(color:string)=>{
  if(!materials.has(color)){
   const surface=finishes&&['#a77d59','#b49b7d'].includes(color)?cloneWorldArchitecturalFinish(finishes.brick,color):finishes&&['#46534a','#7d8885'].includes(color)?cloneWorldArchitecturalFinish(finishes.slate,color,true):finishes&&['#c9c4ac','#9b9d8d','#aaa998','#929888'].includes(color)?cloneArchitecturalFinish(finishes.stucco,color):finishes&&color==='#617d77'?cloneArchitecturalFinish(finishes.glazing,color):new THREE.MeshStandardMaterial({roughness:.9});
   surface.color.set(color);materials.set(color,surface);
  }return materials.get(color)!;
 };
 if(finishes)materials.set('#96998b',cloneArchitecturalFinish(finishes.membrane,'#96998b'));
 function part(parent:THREE.Group,color:string,x:number,y:number,z:number,w:number,h:number,d:number,geometry:THREE.BufferGeometry=box){const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function detail(parent:THREE.Group,color:string,x:number,y:number,z:number,w:number,h:number,d:number,geometry:THREE.BufferGeometry=box,ry=0,rz=0,shadow=true){
  if(!detailBatches.has(parent))detailBatches.set(parent,new Map());const batches=detailBatches.get(parent)!,key=geometry.uuid+color+shadow;
  if(!batches.has(key))batches.set(key,{geometry,material:mat(color),shadow,matrices:[]});
  transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,ry,rz);transform.updateMatrix();batches.get(key)!.matrices.push(transform.matrix.clone());
 }
 // `roof` stays near-black for clock hands and doors; `slate` is the mid-grey of the town's
 // roofs, so landmark roofs no longer read as black wedges in sunlight.
 const brick='#a77d59',stone='#c9c4ac',roof='#46534a',slate='#7d8885',glass='#617d77';
 for(const place of places.filter(p=>p.kind==='landmark')){
  const g=new THREE.Group();g.name=place.id;g.position.copy(project(place.lat,place.lng));root.add(g);
  if(place.id==='clock-tower'){
   part(g,stone,0,.3,0,9,.6,9);part(g,brick,0,10,0,4.8,20,4.8);
   for(const y of [3,14,19,23])part(g,stone,0,y,0,5.7,.6,5.7);
   part(g,brick,0,21,0,5,4,5);
   const face=new THREE.CircleGeometry(1,24);
   for(let i=0;i<4;i++){const a=i*Math.PI/2;const f=part(g,'#f0e8cc',Math.sin(a)*2.56,21,Math.cos(a)*2.56,1.6,1.6,1,face);f.rotation.y=a;
    const hand=part(g,roof,Math.sin(a)*2.59,21.45,Math.cos(a)*2.59,.12,1, .12);hand.rotation.y=a;
    const short=part(g,roof,Math.sin(a)*2.60,21,Math.cos(a)*2.60,.85,.12,.12);short.rotation.y=a;
    for(let tick=0;tick<12;tick++){const angle=tick*Math.PI/6,along=Math.sin(angle)*1.25;
     detail(g,roof,Math.sin(a)*2.62+Math.cos(a)*along,21+Math.cos(angle)*1.25,Math.cos(a)*2.62-Math.sin(a)*along,.065,tick%3===0?.24:.14,.035,box,a,-angle,false);
    }
    for(const y of [5,10]){
     detail(g,stone,Math.sin(a)*2.42,y,Math.cos(a)*2.42,1.22,2.8,.05,arch,a,0,false);
     detail(g,glass,Math.sin(a)*2.45,y+.16,Math.cos(a)*2.45,.86,2.44,.05,arch,a,0,false);
    }
   }
   for(const x of [-2.3,2.3])for(const z of [-2.3,2.3])detail(g,stone,x,10,z,.22,17,.22);
   part(g,slate,0,24,0,3,3,3,new THREE.ConeGeometry(1,1,4));
  }else if(place.id==='union-chapel'){
   part(g,brick,0,5,0,8,10,18);
   // Gabled nave: ridge runs the hall's length, with brick gable ends above the rose window.
   const gable=gableRoofGeometry();const r=part(g,slate,0,10,0,19,5,8.8,gable);r.rotation.y=Math.PI/2;r.name='union-chapel-roof';
   for(const side of [-1,1]){
    part(g,brick,side*4.75,3.2,0,1.5,6.4,18);
    const aisle=part(g,slate,side*4.75,6.4,0,18.6,.9,1.8,gable);aisle.rotation.y=Math.PI/2;
    detail(g,stone,side*4.1,9.94,0,.16,.20,18.4);
    for(const z of [-4.65,-.65,3.35,7.35]){
     detail(g,stone,side*4.02,7.5,z,.95,1.8,.05,arch,side*Math.PI/2,0,false);
     detail(g,glass,side*4.05,7.64,z,.66,1.5,.05,arch,side*Math.PI/2,0,false);
    }
   }
   for(const z of [-9.02,9.02]){const end=part(g,brick,0,10,z,.12,4.9,8.2,gable);end.rotation.y=Math.PI/2;}
   part(g,brick,6,10,-4,4,20,4);part(g,slate,6,24.4,-4,2.3,8.4,2.3,new THREE.ConeGeometry(1,1,8));
   detail(g,stone,6,20.05,-4,4.4,.22,4.4);
   const rose=part(g,stone,0,7,9.06,2.1,2.1,1,new THREE.RingGeometry(.65,1,16));rose.material=new THREE.MeshStandardMaterial({color:stone,side:THREE.DoubleSide});
   part(g,glass,0,7,9.02,1.4,1.4,1,new THREE.CircleGeometry(1,16));
   for(const x of [-2.65,2.65]){
    detail(g,stone,x,1.1,9.12,1.4,3.9,.05,arch,0,0,false);
    detail(g,glass,x,1.26,9.16,1.0,3.5,.05,arch,0,0,false);
   }
   // Nave buttresses and paired arched openings give the chapel depth from
   // street level as well as in the aerial silhouette. Details remain illustrative.
   for(const side of [-1,1])for(const z of [-6,-2,2,6]){
    detail(g,brick,side*5.65,2.8,z,.55,5.6,.7);
    detail(g,stone,side*5.65,5.65,z,.67,.20,.84);
    detail(g,stone,side*5.54,2.8,z+1.35,1.55,3.1,.05,arch,side*Math.PI/2,0,false);
    detail(g,glass,side*5.57,2.96,z+1.35,1.13,2.70,.05,arch,side*Math.PI/2,0,false);
    detail(g,stone,side*5.60,4.3,z+1.35,.035,2.4,.045,box,side*Math.PI/2,0,false);
   }
   detail(g,stone,0,.12,9.15,2.2,4.0,.05,arch,0,0,false);
   detail(g,roof,0,.28,9.19,1.65,3.5,.05,arch,0,0,false);
   detail(g,stone,0,.20,9.5,2.6,.25,.8);
   for(let spoke=0;spoke<6;spoke++)detail(g,stone,0,7,9.15,.065,3.4,.05,box,0,spoke*Math.PI/6,false);
   for(const y of [12,16,19.7])detail(g,stone,6,y,-4,4.35,.22,4.35);
   for(const x of [5.2,6.8]){
    detail(g,stone,x,15.6,-1.96,1.2,3.3,.05,arch,0,0,false);
    detail(g,roof,x,15.75,-1.92,.80,2.95,.05,arch,0,0,false);
   }
   for(const x of [4.2,7.8])for(const z of [-5.8,-2.2]){
    detail(g,stone,x,20.3,z,.40,1.1,.40);
    detail(g,stone,x,21.25,z,.42,1.3,.42,pinnacle);
   }
  }else if(place.id==='estorick'){
   part(g,stone,0,.2,0,17,.4,17);part(g,'#b49b7d',0,4,0,12,8,10);part(g,slate,0,8.3,0,12.5,1,10.5);
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
   // Thin weathered caps sit within the four original flat roof footprints.
   for(const x of [-12,12])detail(g,'#96998b',x,10.005,-14,5.98,.01,22.98,box,0,0,false);
   detail(g,'#96998b',0,14.005,-23,21.98,.01,6.98,box,0,0,false);
   detail(g,'#96998b',12,36.005,-24,6.98,.01,6.98,box,0,0,false);
   // Glazing sits behind the existing floor bands; slim concrete piers give
   // these illustrative volumes a building scale without changing their outline.
   for(const x of [-12,12])for(const y of [2.9,4.9,6.9,8.9]){
    for(const side of [-1,1]){
     detail(g,glass,x+side*3.025,y,-14,.04,1.1,20,box,0,0,false);
     for(let z=-23.5;z<-3;z+=2.7)detail(g,stone,x+side*3.06,y,z,.12,1.15,.12);
    }
    detail(g,glass,x,y,-2.475,4.8,1.1,.04,box,0,0,false);
    for(const offset of [-1.6,0,1.6])detail(g,stone,x+offset,y,-2.44,.12,1.15,.12);
   }
   for(const y of [4,6,8,10,12]){
    detail(g,glass,0,y,-19.475,19.6,1.15,.04,box,0,0,false);
    for(let x=-9.1;x<10;x+=2.6)detail(g,stone,x,y,-19.44,.14,1.2,.12);
   }
   for(let y=10.5;y<35;y+=3)for(const side of [-1,1]){
    detail(g,glass,12+side*3.525,y,-24,.04,1.65,5.8,box,0,0,false);
    detail(g,glass,12,y,-24+side*3.525,5.8,1.65,.04,box,0,0,false);
    for(const offset of [-1.45,0,1.45]){
     detail(g,stone,12+side*3.56,y,-24+offset,.12,1.7,.10);
     detail(g,stone,12+offset,y,-24+side*3.56,.10,1.7,.12);
    }
   }
   part(g,stone,0,3,-1,25,.7,2);for(const x of [-10,10])part(g,stone,x,1.5,-1,.7,3,.7);
  }
 }
 for(const [parent,batches] of detailBatches)for(const batch of batches.values()){
  const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);mesh.name='Landmark architectural relief';
  batch.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=batch.shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);
 }
 return root;
}
