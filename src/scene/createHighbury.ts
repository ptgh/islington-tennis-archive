import * as THREE from 'three';
import { renderedHighburyCourts } from './courtGeometry';
import type { createCourtLighting } from './createCourtLighting';
import type { createMiniatureMaterials } from './miniatureMaterials';
import { cloneCourtFinish, courtFenceGeometry, type createClubSurfaces } from './clubSurfaces';
import { createCourtNetGeometries } from './courtNet';

/** The eleven mapped courts, enlarged to the same miniature scale as the other venues. */
export function createHighbury(lighting:ReturnType<typeof createCourtLighting>, finishes:ReturnType<typeof createMiniatureMaterials>, surfaces:ReturnType<typeof createClubSurfaces>){
 const root=new THREE.Group(),box=new THREE.BoxGeometry(1,1,1);
 const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.92});
 const green=cloneCourtFinish(surfaces.synthetic);green.color.set('#42787a');
 const playing=surfaces.synthetic,white=material('#f5f2e7'),metal=surfaces.steel;
 const courtNets=createCourtNetGeometries(.67,.065),tapeMatrices:THREE.Matrix4[]=[];
 const practiceBalls:THREE.Matrix4[]=[];
 const litPlaying=cloneCourtFinish(playing);litPlaying.emissive.set('#a4c9b2');litPlaying.emissiveIntensity=0;
 const paving=surfaces.concrete,wood=finishes.timber,bag=material('#315c50'),ball=material('#dce985'),frame=material('#a3654a');
 frame.roughness=.46;
 const racquetHead=new THREE.TorusGeometry(1,.065,6,24),stringPoints:THREE.Vector3[]=[];
 const batches=new Map<THREE.Material,THREE.Matrix4[]>(),transform=new THREE.Object3D();
 function part(parent:THREE.Group,mat:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number){
  transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,0,0);transform.updateMatrix();parent.updateMatrixWorld(true);
  const matrix=parent.matrixWorld.clone().multiply(transform.matrix);
  const batch=batches.get(mat)??[];batch.push(matrix);batches.set(mat,batch);
 }
 for(const court of renderedHighburyCourts){
  const g=new THREE.Group();g.position.set(court.x,0,court.z);g.rotation.y=court.rotation;
  const w=court.width,d=court.depth,ow=w*1.46,od=d*1.32;
  part(g,paving,0,.18,0,ow+.6,.06,od+.6);part(g,green,0,.25,0,ow,.08,od);part(g,litPlaying,0,.345,0,w,.025,d);
  const line=(x:number,z:number,lw:number,ld:number)=>part(g,white,x,.375,z,lw,.012,ld);
  for(const sign of [-1,1]){line(0,sign*d/2,w,.09);line(sign*w/2,0,.09,d);line(sign*w*.375,0,.08,d);line(0,sign*d*.27,w*.75,.08);}
  line(0,0,.08,d*.54);
  // One open mesh replaces the duplicate solid wire layer.
  const strapTop=1.08-courtNets.sag;
  part(g,white,0,(.36+strapTop)/2,0,.045,strapTop-.36,.065);
   const meshNet=new THREE.Mesh(courtNets.net,finishes.net);
   g.updateMatrixWorld(true);
   meshNet.position.set(0,.72,0);meshNet.scale.set(w*1.12,.67,.015);
   meshNet.updateMatrix();meshNet.applyMatrix4(g.matrixWorld);root.add(meshNet);
   transform.position.set(0,1.08,0);transform.scale.set(w*1.13,.065,.07);transform.rotation.set(0,0,0);transform.updateMatrix();
   tapeMatrices.push(g.matrixWorld.clone().multiply(transform.matrix));
  for(const sign of [-1,1]){
   for(const side of [false,true]){
    const fence=new THREE.Mesh(courtFenceGeometry(side?od:ow,2.3),surfaces.fence);
    fence.position.set(side?sign*ow/2:0,1.4,side?0:sign*od/2);
    fence.rotation.y=side?Math.PI/2:0;
    fence.updateMatrix();fence.applyMatrix4(g.matrixWorld);fence.receiveShadow=true;root.add(fence);
   }
   part(g,metal,sign*w*.57,.78,0,.085,1.05,.085);
   for(let i=0;i<=4;i++)part(g,metal,sign*ow/2,1.4,(i/4-.5)*od,.065,2.3,.065);
   for(let i=0;i<=2;i++)part(g,metal,(i/2-.5)*ow,1.4,sign*od/2,.065,2.3,.065);
   for(const y of [.55,1.35,2.5]){part(g,metal,sign*ow/2,y,0,.03,.03,od);part(g,metal,0,y,sign*od/2,ow,.03,.03);}
  }

 }
 // Shared lighting masts sit around each group, rather than four poles per court.
 for(const group of [renderedHighburyCourts.filter(c=>c.z< -45),renderedHighburyCourts.filter(c=>c.z>=-45&&c.z< -20),renderedHighburyCourts.filter(c=>c.z>=-20&&c.z<0),renderedHighburyCourts.filter(c=>c.z>=0)]){
  const corners=group.flatMap(c=>[-1,1].flatMap(sx=>[-1,1].map(sz=>({x:c.x+sx*c.width*.73*Math.cos(c.rotation)+sz*c.depth*.66*Math.sin(c.rotation),z:c.z-sx*c.width*.73*Math.sin(c.rotation)+sz*c.depth*.66*Math.cos(c.rotation)}))));
  const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.z)),bottom=Math.max(...corners.map(p=>p.z));
  lighting.add((left+right)/2,(top+bottom)/2,right-left,bottom-top,0,1);
 }
 // Benches on the pedestrian side, outside both the fences and Highbury Grove.
 for(const [x,z] of [[77,-44],[96,-17],[96,5]]){
  const g=new THREE.Group();g.position.set(x,0,z);
  for(let slat=0;slat<4;slat++)part(g,wood,0,.65,(slat-1.5)*.2,2.8,.16,.17);
  for(let slat=0;slat<3;slat++)part(g,wood,0,1.1+(slat-1)*.25,-.38,2.8,.21,.13);
  for(const sign of [-1,1])part(g,metal,sign*.95,.34,0,.14,.65,.65);
  for(const sign of [-1,1]){
    part(g,metal,sign*.95,.92,-.35,.09,1.08,.09);
    part(g,metal,sign*.95,.98,-.02,.10,.06,.64);
    part(g,metal,sign*.95,.81,.25,.09,.36,.09);
  }
  // A bag, spare frame and practice balls reward a closer look beside each bench.
  part(g,bag,2.05,.68,0,.68,1.24,.43);part(g,wood,2.05,1.35,0,.44,.1,.26);
  part(g,bag,2.55,.245,.12,.075,.44,.065);
  for(const y of [.12,.25,.38])part(g,metal,2.55,y,.12,.078,.012,.07);
  part(g,frame,2.55,.64,.12,.045,.44,.035);
  const headMatrix=new THREE.Matrix4().compose(new THREE.Vector3(2.55,1.2,.12),new THREE.Quaternion().setFromEuler(new THREE.Euler(-.18,.22,-.18)),new THREE.Vector3(.28,.36,.28));
  const worldHead=g.matrixWorld.clone().multiply(headMatrix);
  const head=new THREE.Mesh(racquetHead,frame);head.name='Highbury spare racquet';head.applyMatrix4(worldHead);head.castShadow=true;root.add(head);
  // Throat branches meet the tilted oval, and all strings share its transform.
  for(const side of [-1,1]){
    const a=new THREE.Vector3(2.55,.82,.12),b=new THREE.Vector3(side*.55,-Math.sqrt(1-.55**2),0).applyMatrix4(headMatrix),direction=b.clone().sub(a);
    transform.position.copy(a).add(b).multiplyScalar(.5);transform.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());transform.scale.set(.03,direction.length(),.03);transform.updateMatrix();
    const batch=batches.get(frame)??[];batch.push(g.matrixWorld.clone().multiply(transform.matrix));batches.set(frame,batch);
  }
  for(let i=-3;i<=3;i++){
    const offset=i*.24,chord=Math.sqrt(.91**2-offset**2);
    for(const [a,b] of [[[-chord,offset],[chord,offset]],[[offset,-chord],[offset,chord]]]){
      stringPoints.push(new THREE.Vector3(a[0],a[1],0).applyMatrix4(worldHead),new THREE.Vector3(b[0],b[1],0).applyMatrix4(worldHead));
    }
  }
  for(const offset of [-.2,.1,.32]){
    transform.position.set(1.7+offset,.095,.48);transform.scale.setScalar(.08);transform.rotation.set(0,0,0);transform.updateMatrix();
    practiceBalls.push(g.matrixWorld.clone().multiply(transform.matrix));
  }
 }
 const strings=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(stringPoints),new THREE.LineBasicMaterial({color:'#e8e5d2',transparent:true,opacity:.65,depthWrite:false}));strings.name='Highbury racquet strings';root.add(strings);
 const balls=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),ball,practiceBalls.length);balls.name='Highbury practice balls';practiceBalls.forEach((matrix,i)=>balls.setMatrixAt(i,matrix));balls.castShadow=true;balls.receiveShadow=true;balls.computeBoundingSphere();root.add(balls);
 const tapes=new THREE.InstancedMesh(courtNets.tape,white,tapeMatrices.length);tapeMatrices.forEach((matrix,i)=>tapes.setMatrixAt(i,matrix));tapes.receiveShadow=true;tapes.computeBoundingSphere();root.add(tapes);
 for(const [mat,matrices] of batches){const mesh=new THREE.InstancedMesh(box,mat,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=mat!==white;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);}
 return {root,setNight(night:boolean){litPlaying.emissiveIntensity=night?.22:0;}};
}
