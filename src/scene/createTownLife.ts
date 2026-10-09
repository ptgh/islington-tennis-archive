import * as THREE from 'three'
import { busRoutes } from '../data/busRoutes.ts'
import { inCourtArea, type CourtArea } from './courtGeometry.ts'

type Project = (lat: number, lng: number) => THREE.Vector3
type Part = { node: THREE.Object3D; color: string }
type Figure = {
  root: THREE.Group
  arms: THREE.Group[]
  legs: THREE.Group[]
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
    part(body, roundParts, skin, 0, .96, 0, .145, .165, .145)
    part(body, blockParts, shirt, 0, .67, 0, .34, .39, .21)
    part(body, blockParts, '#eee7ce', 0, .42, 0, .31, .17, .22)
    const arms: THREE.Group[] = [], legs: THREE.Group[] = []
    for (const side of [-1, 1]) {
      const arm = new THREE.Group()
      arm.position.set(side * .23, .78, 0)
      body.add(arm)
      part(arm, blockParts, skin, 0, -.16, 0, .1, .33, .11)
      const leg = new THREE.Group()
      leg.position.set(side * .095, .4, 0)
      body.add(leg)
      part(leg, blockParts, '#536154', 0, -.15, 0, .11, .29, .12)
      part(leg, blockParts, '#efecd9', 0, -.33, .045, .135, .09, .23)
      arms.push(arm); legs.push(leg)
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
    const result = { root: body, arms, legs, phase }
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
  const walkers = walks.flatMap((points, index) => {
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', .1)
    return Array.from({ length: index === 0 ? 5 : 2 }, (_, i) => ({
      figure: figure(['#c88261', '#ede5c9', '#4c747b', '#85975e'][i % 4], i * 1.9),
      curve, length: curve.getLength(), offset: (i / (index === 0 ? 5 : 2) + index * .23) % 1,
    }))
  })

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
    for (const walker of walkers) {
      const t = (walker.offset + time * 1.1 / walker.length) % 1
      const position = walker.curve.getPointAt(t)
      const tangent = walker.curve.getTangentAt(t)
      walker.figure.root.position.copy(position).setY((transport ? .24 : .035) + Math.abs(Math.sin(time * 4.2 + walker.figure.phase)) * .025)
      walker.figure.root.rotation.y = Math.atan2(tangent.x, tangent.z)
      const stride = Math.sin(time * 4.2 + walker.figure.phase) * .43
      walker.figure.legs[0].rotation.x = stride
      walker.figure.legs[1].rotation.x = -stride
      walker.figure.arms[0].rotation.x = -stride * .7
      walker.figure.arms[1].rotation.x = stride * .7
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
    const points = route.points.map(([lng, lat]) => project(lat, lng).setY(.16))
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
    return { id: route.id, group, vehicles: [bus, otherBus], curve, length, material: routeMaterial, offset: .25 + index * .18 }
  })

  // Keep small road users on road stretches away from the collection van's route.
  const vanPoints=busRoutes.find(route=>route.id==='19')!.points.map(([lng,lat])=>project(lat,lng))
  const vanRoad=vanPoints.slice(1).map((point,i)=>new THREE.Line3(vanPoints[i],point))
  const closest=new THREE.Vector3()
  function roadPoint(curve:THREE.CurvePath<THREE.Vector3>,length:number,distance:number,cycling:boolean){
    const t=distance/length,p=curve.getPointAt(t),tangent=curve.getTangentAt(Math.min(.99999,Math.max(.00001,t)))
    p.x+=tangent.z*(cycling?1.35:2.1);p.z-=tangent.x*(cycling?1.35:2.1)
    return {p,tangent}
  }
  function safeStretches(curve:THREE.CurvePath<THREE.Vector3>,length:number,cycling:boolean){
    const spans:{start:number;end:number}[]=[]
    let start:number|null=null
    for(let distance=0;distance<=length;distance+=2){
      const {p}=roadPoint(curve,length,Math.min(distance,length),cycling)
      const clear=vanRoad.every(segment=>segment.closestPointToPoint(p,true,closest).distanceTo(p)>10)
      if(clear&&start===null)start=distance
      if((!clear||distance>=length)&&start!==null){const end=Math.min(distance,length);if(end-start>65)spans.push({start:start+3,end:end-3});start=null}
    }
    if(start!==null&&length-start>65)spans.push({start:start+3,end:length-3})
    return spans
  }
  const traffic: {model:THREE.Group;curve:THREE.CurvePath<THREE.Vector3>;length:number;speed:number;distance:number;start:number;end:number;wheels:THREE.Object3D[];cycling:boolean}[]=[]
  const carPaint=['#b86753','#e3d9bd','#506c70']
  for(let i=0;i<5;i++){
    const cycling=i>=3, route=routes.find(r=>r.id===(i===0?'30':i===1?'43':i===2?'393':i===3?'43':'393'))??routes[0]
    const model=new THREE.Group();model.name=cycling?'Miniature cyclist':'Miniature car';activity.add(model)
    const wheels:THREE.Object3D[]=[]
    if(cycling){
      const tyre=new THREE.MeshStandardMaterial({color:'#303e3b',roughness:1})
      for(const z of [-.6,.6]){
        const wheel=new THREE.Mesh(new THREE.TorusGeometry(.28,.045,5,12),tyre)
        wheel.rotation.y=Math.PI/2;wheel.position.set(0,.34,z);model.add(wheel);wheels.push(wheel)
      }
      const metal=new THREE.MeshStandardMaterial({color:'#cfad75',roughness:.7})
      const frame=new THREE.Mesh(box,metal);frame.position.set(0,.63,0);frame.scale.set(.06,.55,1.2);model.add(frame)
      const rider=new THREE.Mesh(sphere,new THREE.MeshStandardMaterial({color:'#d69d76',roughness:.9}));rider.position.set(0,1.7,0);rider.scale.setScalar(.16);model.add(rider)
      const shirt=new THREE.Mesh(box,new THREE.MeshStandardMaterial({color:i===3?'#547d77':'#d9b767',roughness:.9}));shirt.position.set(0,1.27,-.08);shirt.rotation.x=-.24;shirt.scale.set(.38,.6,.28);model.add(shirt)
    }else{
      const paint=new THREE.MeshStandardMaterial({color:carPaint[i],roughness:.75})
      const glass=new THREE.MeshStandardMaterial({color:'#44616a',roughness:.35})
      const carBody=new THREE.Mesh(box,paint);carBody.position.y=.72;carBody.scale.set(1.42,.67,2.8);carBody.castShadow=true;model.add(carBody)
      const cabin=new THREE.Mesh(box,glass);cabin.position.set(0,1.22,-.18);cabin.scale.set(1.2,.53,1.44);cabin.castShadow=true;model.add(cabin)
      for(const x of [-.69,.69])for(const z of [-.84,.88]){
        const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.13,8),busRubber)
        wheel.rotation.z=Math.PI/2;wheel.position.set(x,.36,z);model.add(wheel);wheels.push(wheel)
      }
    }
    const spans=safeStretches(route.curve,route.length,cycling)
    const span=spans[i>=3?spans.length-1:0]
    if(!span){model.visible=false;continue}
    traffic.push({model,curve:route.curve,length:route.length,speed:cycling?3.9:8.8,distance:span.start+(span.end-span.start)*((.12+i*.21)%1),start:span.start,end:span.end,wheels,cycling})
  }

  function updateTraffic(delta:number){
    for(const rider of traffic){
      const next=rider.distance+delta*rider.speed
      const wrapped=next>rider.end?rider.start+(next-rider.end):next
      const {p,tangent}=roadPoint(rider.curve,rider.length,wrapped,rider.cycling)
      rider.distance=wrapped
      rider.model.position.copy(p).setY(.11)
      rider.model.rotation.y=Math.atan2(tangent.x,tangent.z)
      rider.model.scale.setScalar(Math.min(1,(wrapped-rider.start)/5,(rider.end-wrapped)/5))
      rider.model.visible=!inCourtArea(p.x,p.z,exclusions,2.2)
      for(const wheel of rider.wheels)wheel.rotation.x+=delta*rider.speed/.28
    }
  }

  function updateBuses(time: number) {
    for (const route of routes) {
      route.vehicles.forEach((bus, index) => {
        const t = (route.offset + index / route.vehicles.length + time * 7.2 / route.length) % 1
        const p = route.curve.getPointAt(t)
        const tangent = route.curve.getTangentAt(Math.min(.99999, Math.max(.00001, t)))
        bus.position.copy(p)
        bus.rotation.y = Math.atan2(tangent.x, tangent.z)
        // The stored route is outbound only; each model fades at the ends before looping.
        bus.scale.setScalar(.3*Math.min(1, t * 100, (1 - t) * 100))
        bus.visible=!inCourtArea(p.x,p.z,exclusions,.85)
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
