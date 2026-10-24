import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

/** Decorative rider within the existing bicycle's planting/traffic envelope.
 * Static parts merge by finish; eight instanced parts carry the pedalling pose. */
export function createMiniatureCyclist(shirt:string,variation=0) {
  const root=new THREE.Group();root.name='Miniature cyclist'
  const finish=(color:string,roughness=.9,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness})
  const frame=finish('#b79b6f',.65,.15),rubber=finish('#34423e'),skin=finish(variation%2?'#c58e68':'#d69d76')
  const jersey=finish(shirt),helmet=finish('#e6dfcb')
  const pieces=new Map<THREE.Material,THREE.BufferGeometry[]>()
  function collect(geometry:THREE.BufferGeometry,material:THREE.Material,position:THREE.Vector3,quaternion=new THREE.Quaternion()) {
    geometry.applyMatrix4(new THREE.Matrix4().compose(position,quaternion,new THREE.Vector3(1,1,1)))
    const flat=geometry.index?geometry.toNonIndexed():geometry
    if(flat!==geometry)geometry.dispose()
    if(!pieces.has(material))pieces.set(material,[])
    pieces.get(material)!.push(flat)
  }
  function beam(a:THREE.Vector3,b:THREE.Vector3,radius:number,material:THREE.Material) {
    collect(new THREE.CylinderGeometry(radius,radius,a.distanceTo(b),6),material,a.clone().add(b).multiplyScalar(.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()))
  }
  const at=(y:number,z:number,x=0)=>new THREE.Vector3(x,y,z)
  const rear=at(.34,-.6),front=at(.34,.6),seat=at(.94,-.23),head=at(.94,.38),crank=at(.53,-.05)
  for(const [a,b] of [[rear,seat],[rear,crank],[seat,crank],[seat,head],[crank,head],[head,front]])beam(a,b,.025,frame)
  beam(seat,at(1.0,-.23),.025,frame)
  beam(head,at(1.06,.46),.025,frame)
  beam(at(1.06,.46,-.28),at(1.06,.46,.28),.025,rubber)
  collect(new THREE.BoxGeometry(.24,.075,.32),rubber,at(1.0,-.24))
  const torso=new THREE.SphereGeometry(1,8,6);torso.scale(.19,.25,.14)
  collect(torso,jersey,at(1.32,-.01),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.4))
  collect(new THREE.IcosahedronGeometry(.15,1),skin,at(1.68,.15))
  const cap=new THREE.SphereGeometry(1,8,4,0,Math.PI*2,0,Math.PI*.58)
  cap.scale(.18,.13,.20);collect(cap,helmet,at(1.76,.15))
  for(const side of [-1,1]){
    const shoulder=at(1.46,.08,side*.17),elbow=at(1.23,.28,side*.23),hand=at(1.075,.46,side*.26)
    beam(shoulder,elbow,.055,jersey);beam(elbow,hand,.039,skin)
  }
  for(const [material,geometries] of pieces){
    const geometry=mergeGeometries(geometries,false)!
    geometries.forEach(g=>g.dispose())
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh)
  }
  // A wheel group rotates around X, as in the existing road-user animation.
  const tyreGeometry=new THREE.TorusGeometry(.28,.035,5,16)
  const spokes:THREE.BufferGeometry[]=[]
  for(let i=0;i<6;i++){
    const spoke=new THREE.BoxGeometry(.012,.53,.012);spoke.rotateZ(i*Math.PI/6);spokes.push(spoke)
  }
  const hub=new THREE.CylinderGeometry(.045,.045,.095,8);hub.rotateX(Math.PI/2);spokes.push(hub)
  const spokeGeometry=mergeGeometries(spokes,false)!;spokes.forEach(g=>g.dispose())
  const wheels=[-.6,.6].map(z=>{
    const wheel=new THREE.Group();wheel.position.set(0,.34,z);wheel.rotation.y=Math.PI/2
    for(const [geometry,material] of [[tyreGeometry,rubber],[spokeGeometry,frame]] as const){
      const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;wheel.add(mesh)
    }
    root.add(wheel);return wheel
  })
  const limbGeometry=new RoundedBoxGeometry(1,1,1,1,.13),limbMaterial=finish('#ffffff')
  const limbs=new THREE.InstancedMesh(limbGeometry,limbMaterial,8)
  limbs.name='Cyclist pedalling limbs';limbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  limbs.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.8,0),.85)
  limbs.castShadow=true;root.add(limbs)
  const color=new THREE.Color()
  for(let i=0;i<8;i++)limbs.setColorAt(i,color.set(i<4?'#45566a':i<6?'#e4dfcb':'#b79b6f'))
  const transform=new THREE.Object3D(),up=new THREE.Vector3(0,1,0)
  const hip=new THREE.Vector3(),foot=new THREE.Vector3(),knee=new THREE.Vector3(),perpendicular=new THREE.Vector3(),axle=new THREE.Vector3()
  let phase=variation*.8
  function pose(){
    for(let leg=0;leg<2;leg++){
      const side=leg===0?-1:1,angle=phase+leg*Math.PI
      hip.set(side*.1,1.04,-.22)
      foot.set(side*.14,.53+Math.cos(angle)*.16,-.05+Math.sin(angle)*.16)
      const distance=hip.distanceTo(foot)
      perpendicular.set(0,foot.z-hip.z,hip.y-foot.y).normalize()
      knee.copy(hip).add(foot).multiplyScalar(.5).addScaledVector(perpendicular,Math.sqrt(Math.max(0,.37**2-distance**2/4)))
      for(const [index,a,b] of [[leg*2,hip,knee],[leg*2+1,knee,foot]] as const){
        transform.position.copy(a).add(b).multiplyScalar(.5)
        transform.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize())
        transform.scale.set(.085,a.distanceTo(b),.09);transform.updateMatrix();limbs.setMatrixAt(index,transform.matrix)
      }
      transform.position.copy(foot);transform.quaternion.identity();transform.scale.set(.13,.07,.25)
      transform.updateMatrix();limbs.setMatrixAt(4+leg,transform.matrix)
      axle.set(side*.14,.53,-.05)
      transform.position.copy(axle).add(foot).multiplyScalar(.5)
      transform.quaternion.setFromUnitVectors(up,foot.clone().sub(axle).normalize());transform.scale.set(.035,.16,.035)
      transform.updateMatrix();limbs.setMatrixAt(6+leg,transform.matrix)
    }
    limbs.instanceMatrix.needsUpdate=true
  }
  pose()
  return {root,wheels,advance(distance:number){phase=(phase+distance*Math.PI*2/3.2)%(Math.PI*2);pose()}}
}
