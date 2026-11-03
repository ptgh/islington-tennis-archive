import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { lifePaths, lifePose, type LifeRoute } from './boroughLifePaths.ts'
import type { BoroughCell } from './boroughGeometry.ts'

type Model = 'car'|'person'|'leg'|'arm'|'fox'|'bird'|'wing'|'boat'|'train'|'signal'|'lamp'
/** Small, shared coloured meshes: cells own only instance buffers, not finishes. */
export function createBoroughLifeAssets() {
 const geometry={} as Record<Model,THREE.BufferGeometry>
 function model(name:Model,build:(part:(color:string,x:number,y:number,z:number,w:number,h:number,d:number,round?:boolean,angle?:number)=>void)=>void){
  const pieces:THREE.BufferGeometry[]=[]
  build((color,x,y,z,w,h,d,round=false,angle=0)=>{
   const g:THREE.BufferGeometry=round?new THREE.IcosahedronGeometry(1,1):new THREE.BoxGeometry(1,1,1)
   g.scale(w,h,d);g.rotateX(angle);g.translate(x,y,z)
   const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose()
   const c=new THREE.Color(color),colors=new Float32Array(flat.getAttribute('position').count*3)
   for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b}
   flat.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(flat)
  })
  geometry[name]=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose())
 }
 model('car',p=>{
  p('#e1b76f',0,.085,0,.17,.09,.39);p('#46656a',0,.15,-.025,.14,.07,.22)
  p('#e1b76f',0,.19,-.025,.15,.025,.22)
  for(const x of [-.085,.085])for(const z of [-.12,.12])p('#303d39',x,.045,z,.035,.07,.07,true)
  for(const x of [-.055,.055]){p('#fff0c5',x,.09,.199,.04,.022,.008);p('#a44332',x,.09,-.199,.035,.022,.008)}
 })
 model('person',p=>{
  p('#57788b',0,.105,0,.055,.07,.036);p('#d6ad82',0,.166,0,.023,.026,.024,true)
 })
 // Limb geometry starts at its joint, so a stride never detaches from the body.
 model('leg',p=>p('#384b4a',0,-.035,0,.019,.07,.023))
 model('arm',p=>p('#d6ad82',0,-.0325,0,.014,.065,.017))
 model('fox',p=>{
  p('#b76b36',0,.053,0,.043,.045,.10,true);p('#c47c43',0,.084,.054,.035,.033,.04,true)
  p('#e2c6a4',0,.071,.08,.021,.018,.035);p('#302e29',0,.075,.099,.012,.01,.008)
  for(const x of [-.013,.013]){p('#a15b32',x,.109,.05,.013,.028,.013);p('#352f29',x,.122,.05,.007,.007,.007)}
  for(const x of [-.018,.018])for(const z of [-.03,.03])p('#40382e',x,.023,z,.012,.045,.014)
  p('#b76b36',0,.055,-.085,.027,.027,.09,true,-.25);p('#e0c8a8',0,.043,-.13,.023,.023,.035,true)
 })
 model('bird',p=>{p('#5c6563',0,0,0,.018,.014,.05,true);p('#e3ded0',0,.01,.018,.014,.012,.017,true)})
 model('wing',p=>p('#596661',.025,0,0,.055,.005,.027))
 model('boat',p=>{
  p('#3b514e',0,.025,0,.20,.07,1.8);p('#a7533f',0,.06,0,.195,.025,1.76)
  p('#e4d8b8',0,.13,-.03,.177,.13,1.4);p('#456a69',0,.205,-.03,.19,.025,1.45)
  for(const side of [-1,1])for(const z of [-.5,-.22,.06,.34])p('#3d5556',side*.09,.14,z,.006,.055,.12)
  p('#6c6d5c',0,.25,-.32,.035,.08,.035);p('#345851',0,.08,.8,.15,.025,.16)
 })
 model('train',p=>{
  p('#e7ded0',0,.19,0,.25,.27,1.15);p('#ce6d37',0,.08,0,.26,.075,1.18)
  p('#72827d',0,.335,0,.27,.035,1.18)
  for(const side of [-1,1])for(const z of [-.38,-.13,.13,.38])p('#405e64',side*.128,.23,z,.006,.10,.18)
  for(const x of [-.095,.095])for(const z of [-.4,.4])p('#34403b',x,.04,z,.045,.07,.08,true)
  for(const z of [-.58,.58]){p('#405e64',0,.23,z,.20,.10,.009);p('#e3b56a',0,.12,z,.13,.025,.012)}
 })
 model('signal',p=>{p('#52635b',0,.20,0,.025,.4,.025);p('#303f36',0,.40,0,.075,.18,.055)})
 model('lamp',p=>p('#ffffff',0,0,0,.045,.045,.018,true))
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8})
 const lamps=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false})
 return {geometry,material,lamps,dispose(){Object.values(geometry).forEach(g=>g.dispose());material.dispose();lamps.dispose()}}
}
export type BoroughLifeAssets=ReturnType<typeof createBoroughLifeAssets>

/** Deterministic, bounded life on source roads, paths, water and surface rail.
 * Illustrative activity, never a live animal, vessel or vehicle feed. */
export function createBoroughLife(data:BoroughCell,assets:BoroughLifeAssets) {
 const root=new THREE.Group();root.name='Borough local life'
 const routes=lifePaths(data),transform=new THREE.Object3D(),color=new THREE.Color()
 const meshes:THREE.InstancedMesh[]=[]
 function batch(name:Model,count:number){
  if(!count)return null
  const mesh=new THREE.InstancedMesh(assets.geometry[name],name==='lamp'?assets.lamps:assets.material,count)
  mesh.name=`Borough ${name}`;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.castShadow=['car','boat','train'].includes(name);mesh.receiveShadow=name!=='lamp'
  // Cells already perform view culling; moving instances must not retain their
  // initial tiny bounding sphere and disappear partway through their journey.
  mesh.frustumCulled=false;root.add(mesh);meshes.push(mesh);return mesh
 }
 const cars=batch('car',routes.cars.length),people=batch('person',routes.walkers.length),foxes=batch('fox',routes.foxes.length),birds=batch('bird',routes.birds.length),wings=batch('wing',routes.birds.length*2),boats=batch('boat',routes.boats.length),trains=batch('train',routes.train?3:0)
 const legs=batch('leg',routes.walkers.length*2),arms=batch('arm',routes.walkers.length*2)
 const signalRoutes=routes.cars.filter(r=>r.width>=.75).slice(0,1),signals=batch('signal',signalRoutes.length*2),lamps=batch('lamp',signalRoutes.length*6)
 const headings=new Map<string,number>()
 let time=0,railTime=0,night=false
 function put(mesh:THREE.InstancedMesh|null,index:number,x:number,y:number,z:number,heading=0,scale=1,roll=0,pitch=0){
  if(!mesh)return
  transform.position.set(x,y,z);transform.rotation.set(pitch,heading,roll,'YXZ');transform.scale.setScalar(scale);transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix)
 }
 function heading(key:string,wanted:number,delta:number){const old=headings.get(key)??wanted,next=old+Math.atan2(Math.sin(wanted-old),Math.cos(wanted-old))*Math.min(1,delta*6);headings.set(key,next);return next}
 function run(mesh:THREE.InstancedMesh|null,path:LifeRoute,index:number,speed:number,y:number,key:string,delta:number,stop=0){
  const pose=lifePose(path,time,speed,stop),angle=heading(key+index,pose.heading,delta)
  put(mesh,index,pose.x,y,pose.z,angle);return pose
 }
 function draw(delta:number,activity=true){
  const roadDelta=activity?delta:0
  routes.cars.forEach((r,i)=>{
   const p=run(cars,r,i,.50,.015,'car',roadDelta,5),dx=(r.b[0]-r.a[0])/r.length,dz=(r.b[1]-r.a[1])/r.length
   const offset=(p.forward?1:-1)*Math.min(.11,r.width*.18)*(p.stopped?0:1)
   put(cars,i,p.x-dz*offset,.015,p.z+dx*offset,headings.get('car'+i))
   cars?.setColorAt(i,color.set(['#e3b872','#c7d0bf','#9fb8ba'][r.seed%3]))
  })
  routes.walkers.forEach((r,i)=>{
   const y=.015+Math.abs(Math.sin(time*7+i))*.004,p=run(people,r,i,.13,y,'person',roadDelta),yaw=headings.get('person'+i)??p.heading
   const stride=Math.sin(time*7+i)*.42
   for(const side of [-1,1]){
    const index=i*2+(side===1?1:0),dx=Math.cos(yaw)*side,dz=-Math.sin(yaw)*side
    put(legs,index,p.x+dx*.017,y+.08,p.z+dz*.017,yaw,1,0,stride*side)
    put(arms,index,p.x+dx*.037,y+.1325,p.z+dz*.037,yaw,1,0,-stride*side*.7)
   }
  })
  routes.foxes.forEach((r,i)=>run(foxes,r,i,.11,.018+Math.abs(Math.sin(time*9))*.002,'fox',roadDelta,4))
  routes.boats.forEach((r,i)=>{
   const p=lifePose(r,time,.035,8)
   // Narrowboats can reverse on narrow canals; never rotate their full length
   // across a towpath or teleport at the end of a short source-water chord.
   put(boats,i,p.x,.006+Math.sin(time*.8)*.003,p.z,Math.atan2(r.b[0]-r.a[0],r.b[1]-r.a[1]),1,Math.sin(time*.55)*.008)
  })
  routes.birds.forEach((b,i)=>{
   const angle=time*.24+i*2+b.seed%20,x=b.x+Math.cos(angle)*b.radius,z=b.z+Math.sin(angle)*b.radius,y=1.8+Math.sin(time*.7+i)*.12,yaw=-angle
   put(birds,i,x,y,z,yaw)
   for(const side of [-1,1])put(wings,i*2+(side===1?1:0),x,y,z,yaw+(side<0?Math.PI:0),1,Math.sin(time*8+i)*.65)
  })
  if(routes.train){
   const r=routes.train,trim=2.05,dx=(r.b[0]-r.a[0])/r.length,dz=(r.b[1]-r.a[1])/r.length
   const safe={...r,a:[r.a[0]+dx*trim,r.a[1]+dz*trim],b:[r.b[0]-dx*trim,r.b[1]-dz*trim],length:r.length-trim*2}
   const p=lifePose(safe,railTime,.9,4),angle=Math.atan2(dx,dz)
   for(let i=0;i<3;i++){const offset=(i-1)*1.28;put(trains,i,p.x+dx*offset,.02,p.z+dz*offset,angle)}
  }
  signalRoutes.forEach((r,i)=>{
   const p=lifePose(r,time,.5,5),dx=(r.b[0]-r.a[0])/r.length,dz=(r.b[1]-r.a[1])/r.length
   for(const end of [0,1]){
    const point=end?r.b:r.a,side=end?1:-1,x=point[0]-dz*(r.width/2+.1)*side,z=point[1]+dx*(r.width/2+.1)*side
    put(signals,i*2+end,x,.015,z)
    for(let lamp=0;lamp<3;lamp++){
     const index=i*6+end*3+lamp,on=p.stopped?lamp===0:p.amber?lamp===1:lamp===2
     put(lamps,index,x,.47-lamp*.055,z+.033)
     lamps?.setColorAt(index,color.set(on?['#f25b3e','#efbd51','#81cc88'][lamp]:'#354039'))
    }
   }
  })
  foxes&&(foxes.visible=night)
  birds&&(birds.visible=!night);wings&&(wings.visible=!night)
  for(const mesh of meshes){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}
 }
 draw(1)
 root.userData.counts={cars:routes.cars.length,people:routes.walkers.length,foxes:routes.foxes.length,birds:routes.birds.length,narrowboats:routes.boats.length,trains:routes.train?1:0,signals:signalRoutes.length*2}
 return {root,routes,setNight(value:boolean){night=value;foxes&&(foxes.visible=night);birds&&(birds.visible=!night);wings&&(wings.visible=!night)},animate(delta:number,activity:boolean,runTrain:boolean){if(activity)time+=delta;if(runTrain)railTime+=delta;if(activity||runTrain)draw(delta,activity)},dispose(){meshes.forEach(m=>m.dispose());root.clear()}}
}
