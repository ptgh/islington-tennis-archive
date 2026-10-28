import * as THREE from 'three'
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js'

/** Fixed, batched coach detail. The town still owns the original track, spacing
 * and motion; returned carriages can be positioned without rebuilding anything. */
export function createMiniatureTrain(){
 const root=new THREE.Group();root.name='Miniature train'
 const carriages:THREE.Group[]=[]
 const box=new THREE.BoxGeometry(1,1,1),shell=new RoundedBoxGeometry(1,1,1,2,.06)
 const wheel=new THREE.CylinderGeometry(.22,.22,.13,12);wheel.rotateZ(Math.PI/2)
 const hub=new THREE.CylinderGeometry(.10,.10,.145,10);hub.rotateZ(Math.PI/2)
 const material=(colour:string,options:Partial<THREE.MeshStandardMaterialParameters>={})=>new THREE.MeshStandardMaterial({color:colour,roughness:.8,...options})
 const blue=material('#344a64'),white=material('#ece9d8'),red=material('#c24f39')
 const roof=material('#d7d5c7',{roughness:.64,metalness:.12}),rubber=material('#36423f'),steel=material('#8e9790',{roughness:.55,metalness:.3})
 const glass=material('#456775',{roughness:.28,metalness:.1,envMapIntensity:1.1,emissive:'#e8c27b',emissiveIntensity:.1})
 const headlamp=material('#fff0c7',{roughness:.3,emissive:'#ffe3a1',emissiveIntensity:.03})
 const tailLamp=material('#b94732',{roughness:.35,emissive:'#fb522e',emissiveIntensity:.02})
 const transform=new THREE.Object3D()
 for(let coach=0;coach<5;coach++){
  const carriage=new THREE.Group();carriage.name='Miniature train carriage';root.add(carriage);carriages.push(carriage)
  const batches=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material;matrices:THREE.Matrix4[]}>()
  const add=(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,g:THREE.BufferGeometry=box,rz=0)=>{
   const key=m.uuid+g.uuid;if(!batches.has(key))batches.set(key,{geometry:g,material:m,matrices:[]})
   transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,0,rz);transform.updateMatrix()
   batches.get(key)!.matrices.push(transform.matrix.clone())
  }
  add(blue,0,.66,0,2.75,.85,7.9,shell)
  add(white,0,1.53,0,2.7,1.2,7.6,shell)
  for(const end of [-1,1]){
   add(red,0,1.4,end*3.58,2.75,1.6,.48,shell)
   add(rubber,0,.41,end*4.15,.34,.14,.5)
   // Flexible gangway on connected ends, leaving both external cab faces clear.
   if(!(coach===0&&end===1)&&!(coach===4&&end===-1)){
    add(rubber,0,1.26,end*3.94,.95,1.12,.20)
    for(const side of [-1,1])add(steel,side*.45,1.26,end*4.05,.04,1.13,.025)
   }
  }
  add(roof,0,2.2,0,2.85,.24,7.95,shell)
  for(const side of [-1,1]){
   for(let window=0;window<4;window++){
    const z=-2.7+window*1.8
    add(rubber,side*1.368,1.55,z,.035,.76,1.31)
    add(glass,side*1.392,1.55,z,.025,.64,1.18)
   }
   add(red,side*1.385,1.3,0,.06,1.55,.45)
   for(const z of [-.115,.115])add(glass,side*1.408,1.56,z,.025,.66,.16)
   add(rubber,side*1.418,1.3,0,.018,1.4,.025)
   add(steel,side*1.37,.35,0,.12,.10,.5)
   add(steel,side*1.41,1.12,0,.025,.03,7.1)
  }
  // Two wheel bogies, each with two axles. Tyre/rail contact is y=-.07 locally:
  // the town's existing +.25 coach lift puts it on the +.18 rail head.
  for(const bogie of [-2.5,2.5]){
   add(rubber,0,.26,bogie,1.75,.20,1.35)
   for(const axle of [-.43,.43])for(const side of [-1,1]){
    add(rubber,side*.87,.15,bogie+axle,1,1,1,wheel)
    add(steel,side*.87,.15,bogie+axle,1,1,1,hub)
   }
  }
  if(coach===0||coach===4){
   const end=coach===0?1:-1
   add(rubber,0,1.64,end*3.842,2.18,.77,.035)
   add(glass,0,1.64,end*3.87,2.05,.66,.025)
   add(red,0,1.64,end*3.89,.065,.73,.025)
   add(white,0,2.06,end*3.855,.85,.13,.025)
   for(const side of [-1,1]){
    add(coach===0?headlamp:tailLamp,side*.89,.83,end*3.97,.23,.18,.04)
    add(rubber,side*.48,1.48,end*3.894,.018,.25,.014,box,side*.35)
   }
  }
  for(const batch of batches.values()){
   const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length)
   mesh.name=batch.material===headlamp?'Train headlamps':batch.material===tailLamp?'Train tail lamps':batch.geometry===wheel?'Train wheels':'Train fixed detail'
   batch.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m))
   mesh.castShadow=batch.material!==glass&&batch.material!==headlamp&&batch.material!==tailLamp
   mesh.receiveShadow=true;mesh.computeBoundingSphere();carriage.add(mesh)
  }
 }
 return {root,carriages,setNight(night:boolean){glass.emissiveIntensity=night?.65:.1;headlamp.emissiveIntensity=night?1:.03;tailLamp.emissiveIntensity=night?.65:.02}}
}
