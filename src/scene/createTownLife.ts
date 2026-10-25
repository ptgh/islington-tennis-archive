import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { pedestrianPaths } from './pedestrianPaths.ts'
import { busRoutes } from '../data/busRoutes.ts'
import { inCourtArea, busRouteLine, type CourtArea } from './courtGeometry.ts'
import { createMiniatureCyclist } from './miniatureCyclist.ts'

type Project = (lat: number, lng: number) => THREE.Vector3
type Part = { node: THREE.Object3D; color: string }
type Figure = {
  root: THREE.Group
  arms: THREE.Group[]
  legs: THREE.Group[]
  elbows: THREE.Group[]
  knees: THREE.Group[]
  phase: number
}

/** Decorative, deterministic miniatures. These never represent live court use or vehicles. */
export function createTownLife(courts: {center:THREE.Vector3;rotation:number;scale:number;halfLength?:number;groundY?:number;nightPlayable?:boolean}[], walks: THREE.Vector3[][], project: Project, exclusions:CourtArea[], transport = true) {
  const root = new THREE.Group()
  const activity = new THREE.Group()
  const buses = new THREE.Group()
  root.add(activity, buses)
  const blockParts: Part[] = []
  const roundParts: Part[] = []
  const racketParts: Part[] = []
  const ballParts: Part[] = []
  const figures: Figure[] = []
  const box = new THREE.BoxGeometry(1, 1, 1)
  const sphere = new THREE.IcosahedronGeometry(1, 1)
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95 })

  function part(parent: THREE.Object3D, collection: Part[], color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const node = new THREE.Object3D()
    node.position.set(x, y, z)
    node.scale.set(sx, sy, sz)
    parent.add(node)
    collection.push({ node, color })
    return node
  }

  function figure(shirt: string, phase: number, racket = false): Figure {
    const body = new THREE.Group()
    activity.add(body)
    const skin = ['#a66f4c', '#dbaf84', '#815b43', '#c58e68'][figures.length % 4]
    const hair = ['#493e34', '#75634b', '#c2ae85', '#393d37', '#b1ada1'][figures.length % 5]
    part(body, roundParts, skin, 0, .935, 0, .052, .045, .052)
    part(body, roundParts, skin, 0, 1.035, 0, .105, .105, .105)
    // Opaque hair masses share the existing batch; no face textures or extra
    // draw calls. Different cuts break up the repeated bare-head silhouette.
    part(body, roundParts, hair, -.006, 1.105, -.010, .106, .055, .103)
    if(figures.length%3!==1)part(body, roundParts, hair, 0, 1.04, -.075, .090, .080, .040)
    if(figures.length%3===2)part(body, roundParts, hair, 0, 1.015, -.125, .045, .065, .050)
    part(body, roundParts, shirt, 0, .67, 0, .20, .245, .13)
    const trousers=racket?'#536154':['#536154','#455c69','#736653'][figures.length%3]
    part(body, blockParts, racket?'#eee7ce':trousers, 0, .42, 0, .31, .17, .22)
    const arms: THREE.Group[] = [], legs: THREE.Group[] = [], elbows: THREE.Group[] = [], knees: THREE.Group[] = []
    for (const side of [-1, 1]) {
      const arm = new THREE.Group()
      arm.position.set(side * .23, .78, 0)
      body.add(arm)
      part(arm, roundParts, shirt, 0, -.065, 0, .075, .085, .075)
      part(arm, roundParts, skin, 0, -.14, 0, .058, .065, .062)
      const elbow=new THREE.Group();elbow.position.y=-.19;arm.add(elbow)
      part(elbow, roundParts, skin, 0, -.07, 0, .055, .09, .06)
      part(elbow, roundParts, skin, 0, -.16, .005, .050, .055, .055)
      const leg = new THREE.Group()
      leg.position.set(side * .095, .4, 0)
      body.add(leg)
      part(leg, roundParts, trousers, 0, -.09, 0, .065, .10, .07)
      const knee=new THREE.Group();knee.position.y=-.18;leg.add(knee)
      part(knee, roundParts, trousers, 0, -.065, 0, .06, .085, .065)
      part(knee, blockParts, '#efecd9', 0, -.15, .045, .135, .09, .23)
      arms.push(arm); legs.push(leg);elbows.push(elbow);knees.push(knee)
    }
    if (racket) {
      const grip = new THREE.Group()
      grip.position.set(0, -.29, 0)
      grip.rotation.z = -.3
      arms[1].add(grip)
      part(grip, blockParts, '#3d514d', 0, -.14, 0, .04, .28, .04)
      part(grip, racketParts, '#d9db9b', 0, -.42, 0, .84, 1.08, 1)
      // A pair of pale strings keeps the miniature racket readable without a texture.
      part(grip, blockParts, '#e6e5c7', 0, -.42, 0, .018, .38, .018)
      part(grip, blockParts, '#e6e5c7', 0, -.42, 0, .27, .018, .018)
    }
    const result = { root: body, arms, legs, elbows, knees, phase }
    figures.push(result)
    return result
  }

  const matches = courts.map(({center,rotation,scale,halfLength = 5.55,groundY = .39,nightPlayable = true}, index) => {
    const players = [figure(index % 2 ? '#cf7458' : '#638e82', index, true), figure('#eee2ad', index + 1, true)]
    const ball = part(activity, ballParts, '#e3ed78', center.x, 1.7, center.z, .14, .14, .14)
    players.forEach(p=>p.root.scale.setScalar(scale));ball.scale.multiplyScalar(scale);
    return { center, rotation, scale, halfLength, groundY, nightPlayable, players, ball, phase: index * .83, flight: 1.6 + index % 4 * .12 }
  })

  // People follow visible park paths, not arbitrary lines through buildings or courts.
  const walkers = walks.flatMap(points=>pedestrianPaths(points,exclusions)).flatMap(({points,closed}, index) => {
    const curve = new THREE.CurvePath<THREE.Vector3>()
    for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]))
    const length=curve.getLength(),count=Math.min(index===0?5:2,Math.max(1,Math.floor(length/18)))
    return Array.from({length:count},(_,i)=>{
      const person=figure(['#c88261','#ede5c9','#4c747b','#85975e'][i%4],i*1.9)
      person.root.name='Miniature pedestrian'
      person.root.scale.setScalar(.94+(index+i)%4*.045)
      if((index+i)%3===0){
        part(person.root,roundParts,'#786e55',0,.65,-.15,.13,.16,.075)
        for(const side of [-1,1])part(person.root,blockParts,'#4b5448',side*.105,.70,.125,.025,.25,.025)
      }
      return {figure:person,curve,length,closed,offset:i/count+index*.23,speed:.8+(i%3)*.16,heading:null as number|null}
    })
  })
  let previousActivityTime=0

  const batches = [
    { parts: blockParts, geometry: box, material },
    { parts: roundParts, geometry: sphere, material },
    { parts: racketParts, geometry: new THREE.TorusGeometry(.19, .025, 4, 12), material },
    { parts: ballParts, geometry: sphere, material: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .8, emissive: '#b2b842', emissiveIntensity: .15 }) },
  ].map((batch) => {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.parts.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    mesh.castShadow = true
    mesh.receiveShadow = true
    const color = new THREE.Color()
    batch.parts.forEach((item, i) => mesh.setColorAt(i, color.set(item.color)))
    activity.add(mesh)
    return { mesh, parts: batch.parts }
  })

  let activityTime = 0
  function updateActivity(time: number) {
    for (const match of matches) {
      const flight = match.flight
      const local = time + match.phase
      const shot = Math.floor(local / flight)
      const u = local / flight - shot
      const fromSide = shot % 2 === 0 ? -1 : 1
      const hitX = (n: number) => Math.sin(n * .93) * 1.15
      const at=(x:number,y:number,z:number)=>new THREE.Vector3(x*match.scale,y*match.scale,z*match.scale).applyAxisAngle(new THREE.Vector3(0,1,0),match.rotation).add(match.center).setY(match.groundY+(y-.39)*match.scale);
      match.players.forEach((player, i) => {
        const side = i === 0 ? -1 : 1
        const lastHit = Math.floor((shot - i) / 2) * 2 + i
        const progress = (local / flight - lastHit) / 2
        // Recover towards the centre, split-step, then set up for the next ball.
        const recovery = THREE.MathUtils.smoothstep(progress, .10, .42)
        const approach = THREE.MathUtils.smoothstep(progress, .52, .90)
        const x = THREE.MathUtils.lerp(THREE.MathUtils.lerp(hitX(lastHit), 0, recovery), hitX(lastHit + 2), approach)
        const split = Math.max(0, 1 - Math.abs(progress - .5) / .07)
        const nextHit = progress < .5 ? lastHit : lastHit + 2
        const backhand = hitX(nextHit) * side > .2
        player.root.position.copy(at(x+side*.26,.39+split*.09,side*(match.halfLength-.18*Math.sin(progress*Math.PI))))
        const nearHit = progress < .15 ? progress : progress - 1
        const swing = Math.exp(-Math.pow(nearHit / .10, 2))
        player.root.rotation.y = match.rotation+(side === 1 ? Math.PI : 0)+(backhand ? -.35 : .3)*swing
        player.arms[1].rotation.set(-.25 - swing * 1.55, (backhand ? -.7 : .25)*swing, -.2 + swing * (backhand ? .8 : -.65))
        player.arms[0].rotation.set(-.35 - (backhand ? .9 : .25)*swing, 0, .22 + swing*.25)
        const moving = Math.sin(recovery*Math.PI) + Math.sin(approach*Math.PI)
        const footwork = Math.sin(local * 9 + player.phase) * moving * .38
        player.legs[0].rotation.x = footwork
        player.legs[1].rotation.x = -footwork
      })
      // Each flight clears the net, bounces once, then reaches the opposite racket.
      const bounce = .76
      const height = u < bounce
        ? .52 + .66 * (1 - u / bounce) + 1.45 * Math.sin(Math.PI * u / bounce)
        : .52 + .66 * Math.sin((u - bounce) / (1 - bounce) * Math.PI / 2)
      match.ball.position.copy(at(THREE.MathUtils.lerp(hitX(shot), hitX(shot + 1), u),height,fromSide*(match.halfLength-.6)*(1-u*2)))
    }
    const walkingDelta=Math.min(.08,Math.max(0,time-previousActivityTime))
    previousActivityTime=time
    for (const walker of walkers) {
      const sections=walker.closed?4:2,distance=walker.length/(walker.closed?4:1)
      const ramp=.45,duration=distance/walker.speed+ramp,section=duration+1.1
      const elapsed=time+walker.offset*section*sections,leg=Math.floor(elapsed/section),local=elapsed%section
      const clock=Math.min(local,duration)
      // Integrate a short acceleration/deceleration ramp. The top speed stays
      // unchanged and both distance and stride remain continuous through pauses.
      const travelled=walker.speed*(clock<ramp?clock*clock/(2*ramp):clock>duration-ramp?duration-ramp-(duration-clock)**2/(2*ramp):clock-ramp/2)
      const pace=Math.max(0,Math.min(1,clock/ramp,(duration-clock)/ramp))
      const progress=Math.min(1,travelled/distance),direction=walker.closed||leg%2===0?1:-1
      const t=walker.closed?((leg%4)+progress)/4:direction===1?progress:1-progress
      const position=walker.curve.getPoint(t)
      const tangent=walker.curve.getPoint(Math.max(0,Math.min(1,t+direction*.25/walker.length))).sub(position)
      if(tangent.lengthSq()<1e-8)tangent.copy(walker.curve.getTangent(Math.min(.9999,Math.max(.0001,t)))).multiplyScalar(direction)
      const phase=(leg*distance+travelled)*Math.PI*2/.95+walker.figure.phase
      walker.figure.root.position.copy(position).setY((transport?.24:.035)+Math.abs(Math.sin(phase))*.025*pace)
      const heading=Math.atan2(tangent.x,tangent.z)
      if(walker.heading===null)walker.heading=heading
      else walker.heading+=Math.atan2(Math.sin(heading-walker.heading),Math.cos(heading-walker.heading))*Math.min(1,walkingDelta*8)
      walker.figure.root.rotation.y=walker.heading
      const stride=Math.sin(phase)*.43*pace
      walker.figure.legs[0].rotation.x=stride;walker.figure.legs[1].rotation.x=-stride
      walker.figure.arms[0].rotation.x=-stride*.7;walker.figure.arms[1].rotation.x=stride*.7
      walker.figure.knees[0].rotation.x=Math.max(0,-Math.sin(phase))*.55*pace
      walker.figure.knees[1].rotation.x=Math.max(0,Math.sin(phase))*.55*pace
      for(const elbow of walker.figure.elbows)elbow.rotation.x=-.12-.12*pace
    }
    activity.updateMatrixWorld(true)
    for (const { mesh, parts } of batches) {
      parts.forEach(({ node }, index) => mesh.setMatrixAt(index, node.matrixWorld))
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  updateActivity(0)
  let venueNight = false
  if (!transport) return {
    root,
    setActivity(visible: boolean) { activity.visible = visible },
    setBuses(visible: boolean) { buses.visible = visible },
    setBusRoute(_id: string | null) {},
    setNight(night: boolean) {
      if (night === venueNight) return
      venueNight = night
      for (const match of matches) {
        const scale = night && !match.nightPlayable ? 0 : match.scale
        match.players.forEach(player => player.root.scale.setScalar(scale))
        match.ball.scale.setScalar(.14 * scale)
      }
      updateActivity(activityTime)
    },
    animate(delta: number, runActivity: boolean, _runBuses: boolean) {
      if (runActivity && activity.visible) { activityTime += delta; updateActivity(activityTime) }
    },
  }

  const busRed = new THREE.MeshStandardMaterial({ color: '#c45442', roughness: .88 })
  const busGlass = new THREE.MeshStandardMaterial({ color: '#40616a', roughness: .6, emissive: '#d0b57c', emissiveIntensity: .08 })
  const busCream = new THREE.MeshStandardMaterial({ color: '#eee7ce', roughness: .8 })
  const busRubber = new THREE.MeshStandardMaterial({ color: '#36423f', roughness: 1 })
  const wheelGeometry = new THREE.CylinderGeometry(.28, .28, .15, 8)
  const busWheels: THREE.Mesh[] = []
  function busPart(parent: THREE.Group, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const mesh = new THREE.Mesh(box, material)
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz)
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  const routes = busRoutes.map((route, index) => {
    const group = new THREE.Group()
    buses.add(group)
    // Same bent line as the drawn road, so buses never cross (or vanish at) a court.
    const points = busRouteLine(route.points.map(([lng, lat]): [number, number] => { const p = project(lat, lng); return [p.x, p.z] }), exclusions).map(([x, z]) => new THREE.Vector3(x, .16, z))
    const curve = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 1; i < points.length; i++) curve.add(new THREE.LineCurve3(points[i - 1], points[i]))
    const length = curve.getLength()
    const routeMaterial = new THREE.MeshBasicMaterial({ color: route.color, transparent: true, opacity: .66, depthWrite: false })
    const ribbon = new THREE.InstancedMesh(box, routeMaterial, points.length - 1)
    const transform = new THREE.Object3D()
    points.slice(1).forEach((point, i) => {
      const a = points[i]
      transform.position.copy(a).add(point).multiplyScalar(.5).setY(.19)
      const blocked=Array.from({length:Math.ceil(a.distanceTo(point))+1},(_,j)=>a.clone().lerp(point,j/Math.max(1,Math.ceil(a.distanceTo(point))))).some(p=>inCourtArea(p.x,p.z,exclusions,.15));
      transform.scale.set(blocked?0:a.distanceTo(point) + .15, .045, .12)
      transform.rotation.y = -Math.atan2(point.z - a.z, point.x - a.x)
      transform.updateMatrix(); ribbon.setMatrixAt(i, transform.matrix)
    })
    ribbon.computeBoundingSphere()
    group.add(ribbon)
    const bus = new THREE.Group()
    bus.name = 'Miniature bus'
    group.add(bus)
    busPart(bus, busRed, 0, 1.35, 0, 1.48, 2.14, 4.8)
    busPart(bus, busCream, 0, 2.48, 0, 1.48, .14, 4.72)
    // Two storeys of glazing, a pale destination blind, and four little wheels.
    for (const side of [-1, 1]) {
      for (const level of [.93, 1.91]) {
        for (let w = 0; w < 4; w++) busPart(bus, busGlass, side * .751, level, -1.62 + w * 1.08, .025, .57, .86)
      }
      for (const z of [-1.48, 1.46]) {
        const wheel = new THREE.Mesh(wheelGeometry, busRubber)
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(side * .76, .3, z)
        bus.add(wheel); busWheels.push(wheel)
      }
    }
    for (const y of [.95, 1.94]) busPart(bus, busGlass, 0, y, 2.413, 1.2, .56, .025)
    busPart(bus, busCream, 0, 1.43, 2.417, .8, .2, .03)
    for (const side of [-1, 1]) busPart(bus, busCream, side * .5, .51, 2.42, .2, .14, .035)
    const otherBus = bus.clone(true)
    group.add(otherBus)
    otherBus.traverse(node=>{if(node instanceof THREE.Mesh&&node.geometry===wheelGeometry)busWheels.push(node)})
    return { id: route.id, group, vehicles: [bus, otherBus], curve, length, material: routeMaterial, offset: .25 + index * .18 }
  })

  // Keep small road users on road stretches away from the collection van's route.
  const vanPoints=busRouteLine(busRoutes.find(route=>route.id==='19')!.points.map(([lng,lat]):[number,number]=>{const p=project(lat,lng);return [p.x,p.z]}),exclusions).map(([x,z])=>new THREE.Vector3(x,0,z))
  const vanRoad=vanPoints.slice(1).map((point,i)=>new THREE.Line3(vanPoints[i],point))
  const closest=new THREE.Vector3()
  // `lane` is the offset to the left of travel: positive keeps to the left, as in the UK.
  function roadPoint(curve:THREE.CurvePath<THREE.Vector3>,length:number,distance:number,cycling:boolean,direction=1,lane=1){
    const t=distance/length,p=curve.getPointAt(t),tangent=curve.getTangentAt(Math.min(.99999,Math.max(.00001,t)))
    const offset=(cycling?1.35:2.1)*lane*direction
    p.x+=tangent.z*offset;p.z-=tangent.x*offset
    return {p,tangent}
  }
  function safeStretches(curve:THREE.CurvePath<THREE.Vector3>,length:number,cycling:boolean){
    const spans:{start:number;end:number}[]=[]
    let start:number|null=null
    for(let distance=0;distance<=length;distance+=2){
      const {p}=roadPoint(curve,length,Math.min(distance,length),cycling)
      const back=roadPoint(curve,length,Math.min(distance,length),cycling,-1).p
      // Stretches avoid the van's route and, in both lanes, the court enclosures.
      const clear=vanRoad.every(segment=>segment.closestPointToPoint(p,true,closest).distanceTo(p)>10)&&!inCourtArea(p.x,p.z,exclusions,2.6)&&!inCourtArea(back.x,back.z,exclusions,2.6)
      if(clear&&start===null)start=distance
      if((!clear||distance>=length)&&start!==null){const end=Math.min(distance,length);if(end-start>65)spans.push({start:start+3,end:end-3});start=null}
    }
    if(start!==null&&length-start>65)spans.push({start:start+3,end:length-3})
    return spans
  }
  const traffic: {model:THREE.Group;curve:THREE.CurvePath<THREE.Vector3>;length:number;speed:number;distance:number;start:number;end:number;wheels:THREE.Object3D[];pedal?: (distance:number)=>void;cycling:boolean;direction:number;turn:number;heading:number|null}[]=[]
  const carPaint=['#b86753','#e3d9bd','#506c70']
  const carShell=new RoundedBoxGeometry(1,1,1,2,.09)
  const carCabin=box.clone(),cabinPositions=carCabin.getAttribute('position')
  for(let v=0;v<cabinPositions.count;v++)if(cabinPositions.getY(v)>0){
    cabinPositions.setX(v,cabinPositions.getX(v)*.80);cabinPositions.setZ(v,cabinPositions.getZ(v)*.76)
  }
  carCabin.computeVertexNormals()
  const carTrimMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.65,metalness:.1})
  const carWheelGeometry=new THREE.CylinderGeometry(.27,.27,.13,12)
  const carHubGeometry=new THREE.CylinderGeometry(.135,.135,.145,8)
  for(let i=0;i<5;i++){
    const cycling=i>=3, route=routes.find(r=>r.id===(i===0?'30':i===1?'43':i===2?'393':i===3?'43':'393'))??routes[0]
    const model=new THREE.Group();model.name=cycling?'Miniature cyclist':'Miniature car';activity.add(model)
    const wheels:THREE.Object3D[]=[]
    let pedal:((distance:number)=>void)|undefined
    if(cycling){
      const cyclist=createMiniatureCyclist(i===3?'#547d77':'#d9b767',i)
      // The outer group retains the route's heading and exact safe position.
      cyclist.root.name='Bicycle and rider';model.add(cyclist.root)
      wheels.push(...cyclist.wheels);pedal=cyclist.advance
    }else{
      const paint=new THREE.MeshStandardMaterial({color:carPaint[i],roughness:.48,metalness:.1,envMapIntensity:.8})
      const glass=new THREE.MeshStandardMaterial({color:'#44616a',roughness:.22,metalness:.1,envMapIntensity:1.1})
      const carBody=new THREE.Mesh(carShell,paint);carBody.position.y=.72;carBody.scale.set(1.42,.67,2.8);carBody.castShadow=true;model.add(carBody)
      const cabin=new THREE.Mesh(carCabin,glass);cabin.position.set(0,1.22,-.18);cabin.scale.set(1.2,.53,1.44);cabin.castShadow=true;model.add(cabin)
      const roof=new THREE.Mesh(carShell,paint);roof.position.set(0,1.51,-.18);roof.scale.set(.99,.075,1.12);model.add(roof)
      const details:{x:number;y:number;z:number;sx:number;sy:number;sz:number;color:string;rz?:number}[]=[]
      for(const end of [-1,1]){
        details.push({x:0,y:.54,z:end*1.405,sx:1.25,sy:.105,sz:.07,color:'#36423f'})
        details.push({x:0,y:.72,z:end*1.421,sx:.34,sy:.1,sz:.015,color:end===1?'#eee7ce':'#d8ba65'})
        for(const side of [-1,1]){
          details.push({x:side*.48,y:.75,z:end*1.408,sx:.27,sy:.15,sz:.035,color:end===1?'#eee7ce':'#c45442'})
        }
      }
      for(const side of [-1,1]){
        details.push({x:side*.54,y:1.22,z:-.18,sx:.055,sy:.545,sz:.075,rz:side*.223,color:carPaint[i]})
        for(const z of [-.52,.38])details.push({x:side*.71,y:.95,z,sx:.025,sy:.035,sz:.18,color:'#d2d1c4'})
      }
      const trim=new THREE.InstancedMesh(box,carTrimMaterial,details.length),matrix=new THREE.Object3D(),tone=new THREE.Color()
      trim.name='Moving car trim'
      details.forEach((d,index)=>{
        matrix.position.set(d.x,d.y,d.z);matrix.rotation.set(0,0,d.rz||0);matrix.scale.set(d.sx,d.sy,d.sz);matrix.updateMatrix()
        trim.setMatrixAt(index,matrix.matrix);trim.setColorAt(index,tone.set(d.color))
      })
      trim.computeBoundingSphere();model.add(trim)
      for(const x of [-.69,.69])for(const z of [-.84,.88]){
        const wheel=new THREE.Mesh(carWheelGeometry,busRubber)
        wheel.rotation.z=Math.PI/2;wheel.position.set(x,.36,z);model.add(wheel);wheels.push(wheel)
        wheel.add(new THREE.Mesh(carHubGeometry,busCream))
      }
    }
    const spans=safeStretches(route.curve,route.length,cycling)
    const span=spans[i>=3?spans.length-1:0]
    if(!span){model.visible=false;continue}
    traffic.push({model,curve:route.curve,length:route.length,speed:cycling?3.5+i*.1:7.8+i*.55,distance:span.start+(span.end-span.start)*((.12+i*.21)%1),start:span.start,end:span.end,wheels,pedal,cycling,direction:i%2?-1:1,turn:1,heading:null})
  }

  // Riders shuttle along their stretch. At each end they turn round, swinging across
  // into the opposite lane over a few metres, instead of shrinking away and respawning.
  function updateTraffic(delta:number){
    for(const rider of traffic){
      const remaining=rider.direction>0?rider.end-rider.distance:rider.distance-rider.start
      const braking=.38+.62*THREE.MathUtils.smoothstep(remaining,0,9)
      const step=delta*rider.speed*braking
      let next=rider.distance+step*rider.direction
      if(next>rider.end){next=rider.end-(next-rider.end);rider.direction=-1;rider.turn=0}
      else if(next<rider.start){next=rider.start+(rider.start-next);rider.direction=1;rider.turn=0}
      rider.turn=Math.min(1,rider.turn+step/7)
      const swing=rider.turn*rider.turn*(3-2*rider.turn)
      const {p,tangent}=roadPoint(rider.curve,rider.length,next,rider.cycling,rider.direction,swing*2-1)
      const dx=p.x-rider.model.position.x,dz=p.z-rider.model.position.z
      rider.distance=next
      if(rider.heading===null)rider.heading=Math.atan2(tangent.x*rider.direction,tangent.z*rider.direction)
      else if(dx*dx+dz*dz>1e-6){
        const target=Math.atan2(dx,dz)
        const turnBy=Math.atan2(Math.sin(target-rider.heading),Math.cos(target-rider.heading))
        rider.heading+=turnBy*Math.min(1,delta*6)
      }
      // Tyre bottoms meet the .11-high carriageway instead of hovering over it.
      rider.model.position.copy(p).setY(rider.cycling?.085:.02)
      rider.model.rotation.y=rider.heading
      for(const wheel of rider.wheels)wheel.rotation.x+=step/.28
      rider.pedal?.(step)
    }
  }

  let previousBusTime=0
  function updateBuses(time: number) {
    const delta=Math.min(.1,Math.max(0,time-previousBusTime));previousBusTime=time
    for (const route of routes) {
      route.vehicles.forEach((bus, index) => {
        const phase=(route.offset*2+index+time*7.2/route.length)%2
        const direction=phase<1?1:-1,t=phase<1?phase:2-phase
        const p=route.curve.getPoint(t),tangent=route.curve.getTangentAt(Math.min(.99999,Math.max(.00001,t)))
        // A continuous lane swing at either end replaces the old shrink/respawn.
        const lane=.72*Math.tanh(Math.sin(phase*Math.PI)*30)
        p.x+=tangent.z*lane;p.z-=tangent.x*lane
        const dx=p.x-bus.position.x,dz=p.z-bus.position.z
        const heading=dx*dx+dz*dz>1e-8&&delta>0?Math.atan2(dx,dz):Math.atan2(tangent.x*direction,tangent.z*direction)
        bus.rotation.y+=Math.atan2(Math.sin(heading-bus.rotation.y),Math.cos(heading-bus.rotation.y))*(delta>0?Math.min(1,delta*7):1)
        bus.position.copy(p);bus.scale.setScalar(.3)
      })
    }
    for (const wheel of busWheels) wheel.rotation.x = time * 7.2 / .28
  }

  let busTime = 0
  updateBuses(0)
  updateTraffic(0)
  return {
    root,
    setActivity(visible: boolean) { activity.visible = visible },
    setBuses(visible: boolean) { buses.visible = visible },
    setBusRoute(id: string | null) {
      for (const route of routes) {
        route.group.visible = id === null || route.id === id
        route.material.opacity = id === route.id ? .95 : .66
      }
    },
    setNight(night: boolean) { busGlass.emissiveIntensity = night ? .55 : .08 },
    animate(delta: number, runActivity: boolean, runBuses: boolean) {
      if (runActivity && activity.visible) { activityTime += delta; updateActivity(activityTime);updateTraffic(delta) }
      if (runBuses && buses.visible) { busTime += delta; updateBuses(busTime) }
    },
  }
}
