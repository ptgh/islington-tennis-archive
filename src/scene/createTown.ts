import * as THREE from 'three'
import { createHighbury } from './createHighbury'
import { createCourtLighting } from './createCourtLighting'
import { createMiniatureMaterials, SHADOW_PROXY_LAYER } from './miniatureMaterials'
import { courtAreas, inCourtArea, renderedHighburyCourts } from './courtGeometry'
import { createGear } from './createGear'
import { mappedServices } from '../data/hub'
import { createLandmarks } from './createLandmarks'
import { places } from '../data/places'
import { mapStations, tubeConnections } from '../data/transit'
import type { MapVenue, Station, TownWorld } from './types'
import { createTownLife } from './createTownLife'
import { createStreetLamps } from './createStreetLamps'
import { busRoutes } from '../data/busRoutes'
import { gableRoofGeometry } from './gableRoof'
import { createClubSurfaces, townCourtSurface, cloneCourtFinish, courtFenceGeometry } from './clubSurfaces'

export const geoPosition = (lat: number, lng: number) =>
  new THREE.Vector3((lng + 0.115) * 6900, 0, -(lat - 51.549) * 11100)

type Point = [number, number]
type Road = { points: Point[]; width: number; avenue?: boolean; bus?: boolean; surveyed?: boolean; path?: boolean }
type Patch = { x: number; z: number; rx: number; rz: number }
type Instance = { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry?: number; color?: string }

function random(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function distanceToSegment(x: number, z: number, a: Point, b: Point) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz)
}

export function createTown(venues: MapVenue[], invalidate: () => void = () => {}): TownWorld {
  const root = new THREE.Group()
  const rnd = random(1978)
  const anchors = new Map<string, THREE.Vector3>()
  const courtFocusAnchors = new Map<string, THREE.Vector3>()
  const animatedCourts: {center:THREE.Vector3;rotation:number;scale:number}[] = []
  const exclusions=courtAreas(venues)
  const standard = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra })
  const finishes = createMiniatureMaterials()
  const courtSurfaces = createClubSurfaces(finishes.hardCourt, invalidate)
  const grass = finishes.grass
  const parkGrass = finishes.parkGrass
  const verge = finishes.paving
  const tarmac = finishes.asphalt
  const lane = standard('#e8e3d7')
  const pathMaterial = finishes.paving
  const brickPalette = ['#b9997f', '#d1bda4', '#ad816a', '#c6ae91', '#ded2b9', '#b7a68c', '#a77a62', '#d7c9ad']
  const roofPalette = ['#faf9f5', '#dce0dc', '#e5e5da', '#cbd4d2', '#ebe4d9']
  const glassPalette = ['#ecf1e8', '#d5e5e3', '#bfd2d0', '#dae2d8']
  const bodyMaterial = finishes.brick
  const roofMaterial = finishes.slate
  const trimMaterial = standard('#e6ded0')
  const windowMaterial = standard('#465e65', { roughness: .38, metalness: .15, emissive: '#f2bf6d', emissiveIntensity: 0 })
  const doorMaterial = standard('#394e44')
  const trunkMaterial = standard('#6c6950')
  const leafMaterial = finishes.foliage
   const courtOuter = cloneCourtFinish(courtSurfaces.synthetic);courtOuter.color.set('#467c6c')
  const courtLine = standard('#f2efdc')
   const netMaterial = finishes.net
  const metalMaterial = standard('#5a695a')
  const stoneMaterial = standard('#c5bda2')
  const box = new THREE.BoxGeometry(1, 1, 1)
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 7)
  const roof = gableRoofGeometry()
  const sphere = finishes.foliageGeometry

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, parent: THREE.Group = root) {
    const object = new THREE.Mesh(geometry, material)
    object.position.set(x, y, z)
    object.scale.set(sx, sy, sz)
    object.rotation.y = ry
    object.castShadow = y > .3
    object.receiveShadow = true
    parent.add(object)
    return object
  }

  function instances(geometry: THREE.BufferGeometry, material: THREE.Material, data: Instance[], shadows = true, parent: THREE.Group = root) {
    if (!data.length) return
    // Local batches let the camera and shadow frustums discard off-screen
    // neighbourhoods without submitting the entire town's detailed geometry.
    const cells = new Map<string, Instance[]>()
    for (const item of data) {
      const key = data.length > 200 ? `${Math.floor(item.x / 80)},${Math.floor(item.z / 80)}` : 'all'
      if (!cells.has(key)) cells.set(key, [])
      cells.get(key)!.push(item)
    }
    const transform = new THREE.Object3D()
    const color = new THREE.Color()
    const hasColors = data.some(item => item.color)
    for (const cell of cells.values()) {
      const group = new THREE.InstancedMesh(geometry, material, cell.length)
      cell.forEach((item, i) => {
        transform.position.set(item.x, item.y, item.z)
        transform.scale.set(item.sx, item.sy, item.sz)
        transform.rotation.set(0, item.ry || 0, 0)
        transform.updateMatrix()
        group.setMatrixAt(i, transform.matrix)
        if (hasColors) group.setColorAt(i, color.set(item.color || '#ffffff'))
      })
      group.castShadow = shadows && material !== leafMaterial
      group.receiveShadow = true
      group.computeBoundingSphere()
      parent.add(group)
      if (material === leafMaterial && shadows) {
        const proxy = new THREE.InstancedMesh(finishes.foliageShadowGeometry, finishes.foliageShadowProxy, cell.length)
        proxy.instanceMatrix = group.instanceMatrix
        proxy.castShadow = true
        proxy.receiveShadow = false
        proxy.customDepthMaterial = finishes.foliageShadowDepth
        proxy.layers.set(SHADOW_PROXY_LAYER)
        proxy.computeBoundingSphere()
        parent.add(proxy)
      }
    }
  }

  mesh(box, grass, 0, -1.4, 0, 2000, 2.5, 2000)

  // Geography supplies the locations; the miniature town around them is illustrative.
  const highbury = geoPosition(51.5525, -.099)
  const courtNeighbourhoods = venues.map(venue => geoPosition(venue.lat, venue.lng))
  const detailedNeighbourhood = (x: number, z: number, highburyRadius: number) =>
    Math.hypot(x - highbury.x, z - highbury.z) < highburyRadius ||
    courtNeighbourhoods.some(p => Math.hypot(x - p.x, z - p.z) < highburyRadius)
  const parks: Patch[] = [
    { x: highbury.x, z: highbury.z, rx: 46, rz: 68 },
    { x: -32, z: -365, rx: 130, rz: 91 },
    { x: -205, z: -125, rx: 38, rz: 45 },
    { x: 222, z: -183, rx: 62, rz: 90 },
    { x: -6, z: 74, rx: 31, rz: 44 },
    { x: -188, z: 202, rx: 35, rz: 40 },
  ]
  venues.forEach((venue) => {
    const p = geoPosition(venue.lat, venue.lng)
    const count = Math.max(1, Math.min(venue.courts || 2, 12))
    const rx = count > 8 ? 25 : count > 3 ? 20 : 13
    if (!parks.some((park) => Math.hypot(p.x - park.x, p.z - park.z) < 24)) parks.push({ x: p.x, z: p.z, rx, rz: count > 6 ? 27 : 20 })
    anchors.set(venue.id, p.clone().setY(.4))
  })

  const patchGeometry = new THREE.CircleGeometry(1, 32)
  for (const park of parks) {
    const patch = mesh(patchGeometry, parkGrass, park.x, .015, park.z, park.rx, park.rz, 1)
    patch.rotation.x = -Math.PI / 2
  }

  const primaryRoads: Road[] = [
    { points: [[-296, 360], [-155, 270], [-30, 165], [51, 68], [71, -13], [69, -92], [46, -163], [3, -247], [-24, -325], [-60, -425]], width: 10, avenue: true },
    { points: [[-338, 213], [-225, 120], [-182, 13], [-151, -100], [-117, -223], [-113, -340], [-133, -443]], width: 9, avenue: true },
    { points: [[-260, -216], [-172, -191], [-77, -169], [46, -163], [176, -166], [270, -245], [370, -262]], width: 8, avenue: true },
    { points: [[-349, 40], [-257, 61], [-171, 88], [-74, 100], [45, 93], [127, 137], [228, 180], [350, 182]], width: 8, avenue: true },
    { points: [[71, -13], [138, 45], [191, 92], [245, 118], [348, 101]], width: 7, avenue: true },
    { points: [[-30, 165], [78, 199], [189, 263], [284, 335], [340, 413]], width: 8, avenue: true },
    { points: [[160, -112], [180, -34], [181, 42], [191, 92], [191, 174], [189, 263]], width: 7, avenue: true },
    { points: [[-338, -315], [-240, -303], [-113, -340], [-24, -325], [103, -290], [195, -331], [342, -342]], width: 8, avenue: true },
  ]
  const roads: Road[] = [...primaryRoads, ...busRoutes.map(route=>({
    points:route.points.map(([lng,lat]):Point=>{const p=geoPosition(lat,lng);return [p.x,p.z]}),
    width:5.8,avenue:true,bus:true,
  }))]
  // Neighbourhood streets are deliberately irregular and finer than the main roads.
  for (let row = 0; row < 19; row++) {
    const z = -421 + row * 47
    const points: Point[] = []
    for (let col = 0; col < 7; col++) points.push([-405 + col * 135, z + Math.sin(col * .91 + row * .48) * 15])
    roads.push({ points, width: 4.8 })
  }
  for (let col = 0; col < 16; col++) {
    const x = -387 + col * 52
    const points: Point[] = []
    for (let row = 0; row < 6; row++) points.push([x + Math.sin(row * .9 + col * .72) * 14, -475 + row * 190])
    roads.push({ points, width: 4.6 })
  }

  const nearPark = (x: number, z: number, margin = 0) => parks.some((p) => Math.pow((x - p.x) / (p.rx + margin), 2) + Math.pow((z - p.z) / (p.rz + margin), 2) < 1)
  const roadSegments: { a: Point; b: Point; width: number; avenue: boolean }[] = []
  const roadBodies: Instance[] = []
  const surveyedPaths: Instance[] = []
  const roadEdges: Instance[] = []
  const laneMarks: Instance[] = []
  const kerbs: Instance[] = []
  const gutters: Instance[] = []
  const kerbMaterial = standard('#cfc8b8', { roughness: .92 })
  const gutterMaterial = standard('#3f4442', { roughness: .7, transparent: true, opacity: .35 })
  for (const road of roads) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1]
      const b = road.points[i]
      const length = Math.hypot(b[0] - a[0], b[1] - a[1])
      const subdivisions = Math.ceil(length / (road.surveyed||road.bus?1:6))
      const angle = -Math.atan2(b[1] - a[1], b[0] - a[0])
      if(!road.surveyed) roadSegments.push({ a, b, width: road.width, avenue: !!road.avenue })
      for (let j = 0; j < subdivisions; j++) {
        const t = (j + .5) / subdivisions
        const x = a[0] + (b[0] - a[0]) * t
        const z = a[1] + (b[1] - a[1]) * t
        const local=Math.abs(x-109)<50&&Math.abs(z+32)<82;
        const width=local&&road.bus?1.2:road.width;
        if(inCourtArea(x,z,exclusions,width/2+(local?.2:1)))continue;
        if (!road.surveyed && nearPark(x, z, 3) && !road.bus) continue
        const sx = length / subdivisions + (road.surveyed?.025:.4)
        roadEdges.push({ x, y: .035, z, sx, sy: .07, sz: width + (road.surveyed||local?.32:2.4), ry: angle })
        ;(road.path?surveyedPaths:roadBodies).push({ x, y: .08, z, sx, sy: .06, sz: width, ry: angle })
        if (!road.path) {
          // Raised stone kerbs either side catch the light and give carriageways a real edge.
          const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length
          for (const side of [-1, 1]) {
            const off = width / 2 + .09
            kerbs.push({ x: x - uz * off * side, y: .13, z: z + ux * off * side, sx, sy: .12, sz: .18, ry: angle })
            if (j % 3 === 0 && !local) gutters.push({ x: x - uz * (width / 2 - .25) * side, y: .113, z: z + ux * (width / 2 - .25) * side, sx: sx * .9, sy: .01, sz: .32, ry: angle })
          }
        }
        if (road.avenue && j % 2 === 0) laneMarks.push({ x, y: .12, z, sx: local?.45:2.2, sy: .025, sz: local?.035:.15, ry: angle })
      }
    }
  }
  instances(box, verge, roadEdges, false)
  instances(box, tarmac, roadBodies, false)
  instances(box, pathMaterial, surveyedPaths, false)
  instances(box, kerbMaterial, kerbs)
  instances(box, gutterMaterial, gutters, false)
  instances(box, lane, laneMarks, false)
  const streetLamps=createStreetLamps(primaryRoads,exclusions);root.add(streetLamps.root)

  // The Regent's Canal provides a quiet blue ribbon through the southern quarter.
  const canalCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-430, .03, 282), new THREE.Vector3(-250, .03, 252),
    new THREE.Vector3(-94, .03, 231), new THREE.Vector3(56, .03, 230),
    new THREE.Vector3(194, .03, 202), new THREE.Vector3(405, .03, 185),
  ])
  const canalBanks: Instance[] = []
  const waterPieces: Instance[] = []
  const canalPoints = canalCurve.getPoints(160)
  for (let i = 1; i < canalPoints.length; i++) {
    const a = canalPoints[i - 1], b = canalPoints[i]
    const midpoint = a.clone().add(b).multiplyScalar(.5)
    const ry = -Math.atan2(b.z - a.z, b.x - a.x)
    const item = { x: midpoint.x, y: .15, z: midpoint.z, sx: a.distanceTo(b) + .3, sy: .12, sz: 8, ry }
    canalBanks.push({ ...item, sz: 11, y: .09 })
    waterPieces.push(item)
  }
  instances(box, pathMaterial, canalBanks, false)
  instances(box, standard('#749a98', { roughness: .55 }), waterPieces, false)

  const bodies: Instance[] = []
  const roofs: Instance[] = []
  const trims: Instance[] = []
  const windows: Instance[] = []
  const doors: Instance[] = []
  const chimneys: Instance[] = []
  const pots: Instance[] = []
  const roofDetails: Instance[] = []
  const gardenWalls: Instance[] = []
  const gardenPaving: Instance[] = []
  const landmarkPoints=places.filter(p=>p.kind==='landmark').map(p=>({...p,point:geoPosition(p.lat,p.lng)}));
  const nearLandmark=(x:number,z:number)=>mappedServices.some(s=>{const p=geoPosition(s.lat,s.lng);return Math.abs(p.x-x)<12&&Math.abs(p.z-z)<12})||landmarkPoints.some(p=>{const dx=Math.abs(p.point.x-x),dz=z-p.point.z;return p.id==='barbican-centre'?dx<20&&dz<3&&dz> -32:dx<12&&Math.abs(dz)<15;});
  const occupied = new Set<string>()
  function occupiedNear(x: number, z: number) {
    const keyx = Math.round(x / 3.7), keyz = Math.round(z / 3.7)
    const key = `${keyx},${keyz}`
    if (occupied.has(key)) return true
    occupied.add(key)
    return false
  }
  function house(x: number, z: number, angle: number, width: number, depth: number, height: number, color: string) {
    const detailedLocal = detailedNeighbourhood(x, z, 115)
    const coord = (localx: number, localz: number) => ({
      x: x + localx * Math.cos(angle) + localz * Math.sin(angle),
      z: z - localx * Math.sin(angle) + localz * Math.cos(angle),
    })
    bodies.push({ x, y: height / 2, z, sx: width, sy: height, sz: depth, ry: angle, color })
    const variation = Math.floor(Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 10000)
    const roofTone = roofPalette[variation % roofPalette.length]
    const glassTone = glassPalette[Math.floor(variation / 7) % glassPalette.length]
    roofs.push({ x, y: height, z, sx: width + .18, sy: 1.6, sz: depth + .25, ry: angle, color: roofTone })
    trims.push({ x, y: height - .12, z, sx: width + .18, sy: .25, sz: depth + .2, ry: angle })
    trims.push({ x, y: .18, z, sx: width + .12, sy: .36, sz: depth + .12, ry: angle })
    roofDetails.push({x,y:height+1.62,z,sx:width+.22,sy:.16,sz:.22,ry:angle})
    for (const side of [-1, 1]) {
      const garden=coord(0,side*(depth/2+.8));
      gardenPaving.push({...garden,y:.12,sx:width-.1,sy:.08,sz:1.5,ry:angle});
      const wall=coord(-width*.42,side*(depth/2+.8));
      gardenWalls.push({...wall,y:.42,sx:.13,sy:.65,sz:1.5,ry:angle,color});
      for (let floor = 0; floor < (height >= 7.15 ? 4 : 3); floor++) {
        for (const col of [-1, 1]) {
          const p = coord(col * width * .24, side * (depth / 2 + .045))
          if (floor === 0 && col === 1) {
            trims.push({ ...p,y: .98,sx: .96,sy: 2.02,sz: .23,ry:angle })
            const doorway=coord(col*width*.24,side*(depth/2+.19));
            doors.push({ ...doorway, y: .81, sx: .67, sy: 1.6, sz: .08, ry: angle })
            windows.push({...doorway,y:1.75,sx:.67,sy:.25,sz:.085,ry:angle})
            const step=coord(col*width*.24,side*(depth/2+.45));
            trims.push({...step,y:.09,sx:1.1,sy:.18,sz:.75,ry:angle})
          } else {
            trims.push({ ...p, y: 1.2 + floor * 1.7, sx: .85, sy: 1.18, sz: .12, ry: angle })
            const front = coord(col * width * .24, side * (depth / 2 + .13))
            windows.push({ ...front, y: 1.23 + floor * 1.7, sx: .60, sy: .91, sz: .055, ry: angle, color: glassTone })
            const sash=coord(col*width*.24,side*(depth/2+.175));
            trims.push({...sash,y:1.23+floor*1.7,sx:.035,sy:.94,sz:.04,ry:angle})
            trims.push({...sash,y:1.23+floor*1.7,sx:.64,sy:.045,sz:.04,ry:angle})
            trims.push({...sash,y:.7+floor*1.7,sx:.96,sy:.10,sz:.31,ry:angle})
          }
        }
      }
    }
    for(const side of [-1,1]){
      const dormer=coord(-width*.2,side*depth*.26),face=coord(-width*.2,side*(depth*.26+.47));
      trims.push({...dormer,y:height+.92,sx:.95,sy:1.05,sz:1.0,ry:angle})
      windows.push({...face,y:height+.9,sx:.61,sy:.73,sz:.07,ry:angle})
      roofs.push({...dormer,y:height+1.44,sx:1.16,sy:.42,sz:1.18,ry:angle+Math.PI/2,color:roofTone})
      const gutter=coord(0,side*(depth/2+.16));
      roofDetails.push({...gutter,y:height-.05,sx:width+.18,sy:.10,sz:.15,ry:angle})
    }
    const p = coord(width * .28, depth * .19)
    chimneys.push({ ...p, y: height + 1.3, sx: .64, sy: 1.45, sz: .67, ry: angle, color })
    trims.push({...p,y:height+2.03,sx:.78,sy:.14,sz:.81,ry:angle});
    for(const dx of [-.17,.17]){const pot=coord(width*.28+dx,depth*.19);pots.push({...pot,y:height+2.31,sx:.13,sy:.49,sz:.13});}
    if (detailedLocal) {
      // Georgian facade relief is batched with existing town geometry.
      for (const side of [-1, 1]) {
        for (const y of [2.7, 4.4, height - .5]) {
          const band = coord(0, side * (depth / 2 + .17))
          trims.push({ ...band, y, sx: width + .08, sy: .12, sz: .22, ry: angle })
        }
        const pipe = coord(width * .46, side * (depth / 2 + .22))
        roofDetails.push({ ...pipe, y: height / 2, sx: .08, sy: height, sz: .08, ry: angle })
        const bay = coord(-width * .24, side * (depth / 2 + .32))
        trims.push({ ...bay, y: 1.1, sx: 1.13, sy: 1.8, sz: .63, ry: angle })
        const pane = coord(-width * .24, side * (depth / 2 + .66))
        windows.push({ ...pane, y: 1.23, sx: .77, sy: 1.15, sz: .06, ry: angle, color: glassTone })
        trims.push({ ...pane, y: 1.23, sx: .04, sy: 1.17, sz: .08, ry: angle })
        const rail = coord(0, side * (depth / 2 + 1.5))
        doors.push({ ...rail, y: .85, sx: width, sy: .055, sz: .055, ry: angle })
        for (let post = 0; post < 9; post++) {
          const p = coord((post / 8 - .5) * width, side * (depth / 2 + 1.5))
          doors.push({ ...p, y: .5, sx: .035, sy: .85, sz: .035, ry: angle })
        }
      }
    }
  }

  const gardenRnd = random(2718)
  const gardenTrees: { x: number; z: number }[] = []
  for (const segment of roadSegments) {
    const dx = segment.b[0] - segment.a[0], dz = segment.b[1] - segment.a[1]
    const length = Math.hypot(dx, dz)
    const ux = dx / length, uz = dz / length
    const angle = -Math.atan2(dz, dx)
    const width = 3.8 + rnd() * .55
    const toneIndex = Math.floor(rnd() * brickPalette.length)
    const depth = 5.2 + rnd() * 1.4
    const height = 5.4 + rnd() * 2.4
    for (const side of [-1, 1]) {
      const offset = segment.width / 2 + depth / 2 + 2.6
      for (let d = 7; d < length - 6; d += width + .24) {
        if (rnd() < .09) continue
        const x = segment.a[0] + d * ux - uz * offset * side
        const z = segment.a[1] + d * uz + ux * offset * side
        if (inCourtArea(x,z,exclusions,8)||nearPark(x, z, 7)||nearLandmark(x,z)) continue
        if (canalPoints.some((p) => Math.hypot(p.x - x, p.z - z) < 9)) continue
        if (roadSegments.some((other) => other !== segment && distanceToSegment(x, z, other.a, other.b) < other.width / 2 + 4.2)) continue
        if (occupiedNear(x, z)) continue
        const variation = Math.abs(Math.sin(x * 8.17 + z * 14.83) * 43758.5453) % 1
        const tone = brickPalette[(toneIndex + (variation < .18 ? 1 : variation > .85 ? brickPalette.length - 1 : 0)) % brickPalette.length]
        house(x, z, angle, width, depth + (variation - .5) * .6, height + (variation - .5) * 1.15, tone)
        // Back gardens: the side facing away from this road. Planted later from
        // their own random stream so existing park trees keep their positions.
        if (gardenRnd() < .5) {
          const along = (gardenRnd() - .5) * width * .7, back = side * (depth / 2 + 3.2 + gardenRnd() * 2.6)
          gardenTrees.push({ x: x + along * Math.cos(angle) + back * Math.sin(angle), z: z - along * Math.sin(angle) + back * Math.cos(angle) })
        }
      }
    }
  }
  instances(box, bodyMaterial, bodies)
  instances(roof, roofMaterial, roofs)
  instances(box, trimMaterial, trims)
  instances(box, windowMaterial, windows, false)
  instances(box, doorMaterial, doors, false)
  instances(box, bodyMaterial, chimneys)
  instances(cylinder, standard('#a5755b'), pots)
  instances(box, roofMaterial, roofDetails)
  instances(box, pathMaterial, gardenPaving, false)
  instances(box, bodyMaterial, gardenWalls)

  const treeTrunks: Instance[] = []
  const treeCrowns: Instance[] = []
  const treeBranches: Instance[] = []
  const shrubs: Instance[] = []
  const foliageColors = ['#64814a', '#769354', '#8da260', '#a0ad6e', '#6d8b4d', '#a8b676']
  // Compact trees (gardens, avenues) use four lobes and skip the outer clusters,
  // keeping crown instances near the original budget while doubling coverage.
  function tree(x: number, z: number, size = 1, compact = false) {
    const species = Math.floor(rnd() * foliageColors.length)
    const color = foliageColors[species]
    const height = (3.8 + rnd() * 2.2) * size
    const detailedLocal = detailedNeighbourhood(x, z, 95)
    // Mixed species everywhere: round limes, columnar poplars, wide spreading planes.
    const silhouette = species % 3
    treeTrunks.push({ x, y: height * .4, z, sx: .19 * size, sy: height * .8, sz: .19 * size })
    // Gaps between lobes let sunlight through, so crowns cast broken, dappled shade.
    // Irregular clusters give mature trees layered crowns and soft, broken silhouettes.
    for (let lobe=0;lobe<(compact?4:7);lobe++) {
      const angle=lobe*2.399+height, ring=lobe===0?0:height*(compact?.15:silhouette===1?.19:silhouette===2?.31:.25);
      const radius=height*(lobe===0?.37:(compact?.28:.24)+rnd()*.07);
      treeCrowns.push({x:x+Math.cos(angle)*ring,y:height*(lobe===0?.84:.63+rnd()*.16),z:z+Math.sin(angle)*ring,
        sx:radius,sy:radius*(silhouette===1?1.4:silhouette===2?.65:.85+rnd()*.3),sz:radius,ry:rnd()*6,
        color: lobe > 0 && (lobe + species) % 5 === 0 ? foliageColors[(species + 1) % foliageColors.length] : color});
    }
    if (detailedLocal && !compact) {
      for (let branch = 0; branch < 4; branch++) {
        const angle = branch * Math.PI / 2 + height
        treeBranches.push({ x: x + Math.cos(angle) * height * .1, y: height * .55,
          z: z + Math.sin(angle) * height * .1, sx: height * .36, sy: .09 * size,
          sz: .1 * size, ry: -angle })
      }
      // Small outer clusters break up the crown rather than increasing every tree's cost.
      for (let tip = 0; tip < 5; tip++) {
        const angle = tip * 2.399 + height, radius = height * .14
        treeCrowns.push({ x: x + Math.cos(angle) * height * .38, y: height * (.68 + tip * .025),
          z: z + Math.sin(angle) * height * .38, sx: radius, sy: radius * .8,
          sz: radius, color: foliageColors[(species + tip) % foliageColors.length] })
      }
    }
  }
  for (let i = 0; i < 5800; i++) {
    const x = rnd() * 1050 - 525, z = rnd() * 1110 - 555
    if(inCourtArea(x,z,exclusions,5)||nearLandmark(x,z))continue
    const inPark = nearPark(x, z, -5)
    if (!inPark && rnd() > .62) continue
    if (venues.some((venue) => { const p = geoPosition(venue.lat, venue.lng); return venue.id!=='highbury-fields' && Math.abs(p.x - x) < 27 && Math.abs(p.z - z) < 29 })) continue
    if (canalPoints.some((p) => Math.hypot(p.x - x, p.z - z) < 7)) continue
    if (roadSegments.some((road) => distanceToSegment(x, z, road.a, road.b) < road.width / 2 + (inPark ? .5 : 7))) continue
    tree(x, z, inPark ? .9 + rnd() * .45 : .8 + rnd() * .35)
  }
  for (const p of parks) {
    for (let i = 0; i < 48; i++) {
      const angle = i / 48 * Math.PI * 2
      const x = p.x + Math.cos(angle) * (p.rx - 1.5)
      const z = p.z + Math.sin(angle) * (p.rz - 1.5)
      if (!inCourtArea(x,z,exclusions,5)&&!nearLandmark(x,z)&&!roadSegments.some((road) => distanceToSegment(x, z, road.a, road.b) < road.width / 2 + 2)) tree(x, z, .9 + rnd() * .25)
    }
  }
  for(let i=0;i<260;i++){
    const x=70+rnd()*76,z=-105+rnd()*140;
    if(!nearPark(x,z,-5)||inCourtArea(x,z,exclusions,5)||nearLandmark(x,z))continue;
    if(roadSegments.some(road=>distanceToSegment(x,z,road.a,road.b)<road.width/2+3))continue;
    tree(x,z,.85+rnd()*.4);
  }
  // Street planes on avenues and trees behind terraces: the concept's leafy
  // density. Clearances keep trunks off carriageways, buildings and venues.
  const houseCells = new Map<string, Instance[]>()
  for (const body of bodies) {
    const key = `${Math.floor(body.x / 8)},${Math.floor(body.z / 8)}`
    if (!houseCells.has(key)) houseCells.set(key, [])
    houseCells.get(key)!.push(body)
  }
  const nearHouse = (x: number, z: number, clearance: number) => {
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
      for (const body of houseCells.get(`${Math.floor(x / 8) + ox},${Math.floor(z / 8) + oz}`) ?? []) {
        if (Math.hypot(body.x - x, body.z - z) < clearance) return true
      }
    }
    return false
  }
  const planted = new Set<string>()
  const plantable = (x: number, z: number, roadClearance: number, houseClearance: number) => {
    const key = `${Math.round(x / 3.5)},${Math.round(z / 3.5)}`
    if (planted.has(key) || inCourtArea(x, z, exclusions, 5) || nearLandmark(x, z) || nearHouse(x, z, houseClearance)) return false
    if (canalPoints.some(p => Math.hypot(p.x - x, p.z - z) < 7)) return false
    if (roadSegments.some(road => distanceToSegment(x, z, road.a, road.b) < road.width / 2 + roadClearance)) return false
    planted.add(key)
    return true
  }
  for (const segment of roadSegments) {
    if (!segment.avenue) continue
    const dx = segment.b[0] - segment.a[0], dz = segment.b[1] - segment.a[1], length = Math.hypot(dx, dz)
    for (let d = 5.5; d < length - 3; d += 11) {
      for (const side of [-1, 1]) {
        const offset = segment.width / 2 + 1.35
        const x = segment.a[0] + dx / length * d - dz / length * offset * side
        const z = segment.a[1] + dz / length * d + dx / length * offset * side
        if (plantable(x, z, 1.1, 3.4)) tree(x, z, .62 + rnd() * .12, true)
      }
    }
  }
  for (const p of gardenTrees) {
    if (!nearPark(p.x, p.z, 2) && plantable(p.x, p.z, 2.5, 4.4)) tree(p.x, p.z, .7 + rnd() * .3, true)
  }
  instances(cylinder, trunkMaterial, treeTrunks)
  instances(box, trunkMaterial, treeBranches)
  instances(sphere, leafMaterial, treeCrowns)

  // A low, open mesh fence and individually marked courts make every venue tangible.
  const courtMarkings: Instance[] = []
  function addLine(a: THREE.Vector3, b: THREE.Vector3) {
    courtMarkings.push({x:(a.x+b.x)/2,y:a.y,z:(a.z+b.z)/2,sx:a.distanceTo(b),sy:.016,sz:.08,ry:-Math.atan2(b.z-a.z,b.x-a.x)})
  }
  const courtFencePosts: Instance[] = []
  const courtFenceRails: Instance[] = []
   const benchWood = finishes.timber
  const benches: Instance[] = []
  const benchLegs: Instance[] = []
  const lighting=createCourtLighting();root.add(lighting.root);
   const highburyModel=createHighbury(lighting,finishes,courtSurfaces);root.add(highburyModel.root);
  const litCourtMaterials = new Map<string, THREE.MeshStandardMaterial>()
  const highburyFocus=new THREE.Vector3(99,0,-30);
  courtFocusAnchors.set('highbury-fields',highburyFocus);anchors.set('highbury-fields',highburyFocus.clone().setY(.4));
  for(const c of renderedHighburyCourts.filter(c=>c.x>100).slice(0,4))animatedCourts.push({center:new THREE.Vector3(c.x,0,c.z),rotation:c.rotation,scale:c.depth/10.8});
  for (const venue of venues) {
    if(venue.id==='highbury-fields')continue;
    const hasFloodlights=/flood/i.test(venue.lighting);
    const surface = townCourtSurface(venue.surface)
    let courtPlaying = courtSurfaces[surface]
    if (hasFloodlights) {
      let lit = litCourtMaterials.get(surface)
      if (!lit) {
        lit = cloneCourtFinish(courtPlaying);lit.emissive.set('#a4c9b2');lit.emissiveIntensity=0
        litCourtMaterials.set(surface,lit)
      }
      courtPlaying = lit
    }
    const venueCenter = geoPosition(venue.lat, venue.lng)
    const isHighbury = /highbury fields/i.test(venue.name)
    const isTennisCentre = /islington tennis centre/i.test(venue.name)
    const groups = isHighbury
      ? [{ count: 8, columns: 2, x: 6, z: 7 }, { count: 3, columns: 1, x: -14, z: -13 }]
      : isTennisCentre ? [{ count: 2, columns: 1, x: 7, z: 0 }]
      : [{ count: Math.max(1, Math.min(venue.courts || 1, 14)), columns: (venue.courts || 1) > 5 ? 3 : (venue.courts || 1) > 1 ? 2 : 1, x: 0, z: 0 }]
    for (const layout of groups) {
    const center = venueCenter.clone().add(new THREE.Vector3(layout.x, 0, layout.z))
    const { count, columns } = layout
    const rows = Math.ceil(count / columns)
    const cw = 7.2, ch = 13.2
    const w = columns * cw + 2.8, h = rows * ch + 2.8
    mesh(box, courtSurfaces.concrete, center.x, .15, center.z, w + 4, .15, h + 4)
    mesh(box, courtOuter, center.x, .25, center.z, w, .14, h)
    if(hasFloodlights)lighting.add(center.x,center.z,w,h);
    for (let i = 0; i < count; i++) {
      const x = center.x + (i % columns - (columns - 1) / 2) * cw
      const z = center.z + (Math.floor(i / columns) - (rows - 1) / 2) * ch
      if (!courtFocusAnchors.has(venue.id)) {
        const focus=new THREE.Vector3(x,0,z)
        courtFocusAnchors.set(venue.id,focus)
        if(venue.access==='public'||venue.id==='barbican') animatedCourts.push({center:focus.clone(),rotation:0,scale:1})
      } else if(isHighbury && layout===groups[0] && i===1) animatedCourts.push({center:new THREE.Vector3(x,0,z),rotation:0,scale:1})
      mesh(box, courtPlaying, x, .345, z, 5.3, .025, 10.8)
      const line = (x1: number, z1: number, x2: number, z2: number) => addLine(new THREE.Vector3(x + x1, .38, z + z1), new THREE.Vector3(x + x2, .38, z + z2))
      line(-2.65, -5.4, 2.65, -5.4); line(-2.65, 5.4, 2.65, 5.4)
      line(-2.65, -5.4, -2.65, 5.4); line(2.65, -5.4, 2.65, 5.4)
      line(-2, -5.4, -2, 5.4); line(2, -5.4, 2, 5.4)
      line(-2, -2.9, 2, -2.9); line(-2, 2.9, 2, 2.9)
      line(0, -2.9, 0, 2.9)
      mesh(box, netMaterial, x, .73, z, 6, .8, .055)
      mesh(box, courtLine, x, 1.14, z, 6.05, .08, .065)
      for (const sign of [-1, 1]) courtFencePosts.push({ x: x + sign * 3.05, y: .79, z, sx: .095, sy: 1.12, sz: .095 })
    }
    for (const sign of [-1, 1]) {
      const endFence = mesh(courtFenceGeometry(w, 2.6), courtSurfaces.fence, center.x, 1.55, center.z + sign * h / 2)
      const sideFence = mesh(courtFenceGeometry(h, 2.6), courtSurfaces.fence, center.x + sign * w / 2, 1.55, center.z, 1, 1, 1, Math.PI / 2)
      endFence.castShadow = sideFence.castShadow = false
      for (let x = -w / 2; x <= w / 2 + .1; x += w / Math.ceil(w / 3.8)) courtFencePosts.push({ x: center.x + x, y: 1.55, z: center.z + sign * h / 2, sx: .095, sy: 2.6, sz: .095 })
      for (let z = -h / 2; z <= h / 2 + .1; z += h / Math.ceil(h / 3.8)) courtFencePosts.push({ x: center.x + sign * w / 2, y: 1.55, z: center.z + z, sx: .095, sy: 2.6, sz: .095 })
      for (const y of [.75, 1.4, 2.05, 2.85]) {
        courtFenceRails.push({ x: center.x, y, z: center.z + sign * h / 2, sx: w, sy: .045, sz: .045 })
        courtFenceRails.push({ x: center.x + sign * w / 2, y, z: center.z, sx: .045, sy: .045, sz: h })
      }
      benches.push({ x: center.x + sign * (w / 2 + 1.4), y: .7, z: center.z, sx: .7, sy: .15, sz: 2.6 })
      benches.push({ x: center.x + sign * (w / 2 + 1.65), y: 1.12, z: center.z, sx: .13, sy: .75, sz: 2.6 })
      benchLegs.push({ x: center.x + sign * (w / 2 + 1.4), y: .35, z: center.z - .95, sx: .5, sy: .7, sz: .18 })
      benchLegs.push({ x: center.x + sign * (w / 2 + 1.4), y: .35, z: center.z + .95, sx: .5, sy: .7, sz: .18 })
    }
    if (/centre/i.test(venue.name)) {
      const shedx = center.x - w / 2 - 12
      mesh(box, standard('#bcbaa8'), shedx, 4.8, center.z, 17, 9.6, h)
      mesh(roof, standard('#727f71'), shedx, 9.6, center.z, 18.5, 3.2, h + 1.2)
      mesh(box, windowMaterial, shedx + 8.55, 5, center.z, .1, 3, h * .82)
    }
    if (/highbury fields/i.test(venue.name)) {
      for (let i = 0; i < 25; i++) {
        const a = i / 25 * Math.PI * 2
        shrubs.push({ x: center.x + Math.cos(a) * (w / 2 + 4), y: .7, z: center.z + Math.sin(a) * (h / 2 + 4), sx: 1, sy: .6, sz: 1.3, color: '#708950' })
      }
    }
    }
  }
  instances(box, courtSurfaces.steel, courtFencePosts)
  instances(box, courtSurfaces.steel, courtFenceRails, false)
  instances(box, benchWood, benches)
  instances(box, metalMaterial, benchLegs)
  instances(sphere, leafMaterial, shrubs)
  instances(box, courtLine, courtMarkings, false)

  // A few Islington silhouettes: church spires, a civic clock, and a small football ground.
  function church(x: number, z: number, scale = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); root.add(g)
    mesh(box, stoneMaterial, 0, 5, 0, 8, 10, 17, 0, g)
    mesh(roof, roofMaterial, 0, 10, 0, 17.7, 4, 8.7, Math.PI / 2, g)
    mesh(box, stoneMaterial, 0, 8.8, 10, 5.6, 17.6, 5.6, 0, g)
    mesh(new THREE.ConeGeometry(4.1, 13, 4), roofMaterial, 0, 23.5, 10, 1, 1, 1, Math.PI / 4, g)
    mesh(box, windowMaterial, 0, 13, 12.85, 1.6, 3.2, .15, 0, g)
    for (let i = -1; i <= 1; i++) for (const side of [-1, 1]) mesh(box, windowMaterial, side * 4.04, 6.3, i * 4.8, .1, 4, 1.5, 0, g)
  }
  // Highbury buildings now come from mapped footprints, including the church.
  church(38, 134, .75)
  church(-227, -32, .72)

  root.add(createLandmarks(geoPosition,finishes))
  const gear=createGear(geoPosition);root.add(gear.root)

  const stations: Station[] = mapStations.map(s=>({name:s.name,position:geoPosition(s.lat,s.lng).setY(6),lines:s.lines}))
  const transit = new THREE.Group(); root.add(transit)
  for (const route of tubeConnections) {
    const points=route.stops.map(name=>stations.find(s=>s.name===name)!.position.clone().setY(.6))
    transit.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:route.color,dashSize:3,gapSize:2,transparent:true,opacity:.7})).computeLineDistances())
  }
  const stationBrick = standard('#b27e5d')
  for (const station of stations) {
    const p = station.position
    mesh(box, stationBrick, p.x, 2.5, p.z, 7, 5, 5, 0, transit)
    mesh(box, trimMaterial, p.x, 5.2, p.z, 7.8, .55, 5.8, 0, transit)
    mesh(box, doorMaterial, p.x, 1.5, p.z + 2.6, 3.5, 3, .1, 0, transit)
  }

  // An intentionally playful model railway, not a representation of live railway routes.
  const railway = new THREE.Group(); root.add(railway)
  const track = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-304, 8, 265), new THREE.Vector3(-338, 8, -54),
    new THREE.Vector3(-246, 8, -295), new THREE.Vector3(-8, 8, -297),
    new THREE.Vector3(174, 8, -210), new THREE.Vector3(302, 8, 5),
    new THREE.Vector3(251, 8, 256), new THREE.Vector3(-11, 8, 335),
  ], true, 'catmullrom', .42)
  const archProfile=new THREE.Shape();
  archProfile.moveTo(-6,0);archProfile.lineTo(-6,7.4);archProfile.lineTo(6,7.4);archProfile.lineTo(6,0);
  archProfile.lineTo(4.85,0);archProfile.lineTo(4.85,2.0);archProfile.absarc(0,2.0,4.85,0,Math.PI,false);archProfile.lineTo(-4.85,0);archProfile.closePath();
  const archGeometry=new THREE.ExtrudeGeometry(archProfile,{depth:3.6,bevelEnabled:false,curveSegments:12});archGeometry.translate(0,0,-1.8);
  const archRing=new THREE.RingGeometry(4.84,5.15,28,1,0,Math.PI);archRing.translate(0,2,0);
  const arches:Instance[]=[],archFaces:Instance[]=[];
  const parapets: Instance[] = [], copings: Instance[] = [], piers: Instance[] = []
  const tracksideShrubs: Instance[] = [], ballastStones: Instance[] = []
  const archCount=Math.ceil(track.getLength()/12);
  for(let i=0;i<archCount;i++){
    const t=(i+.5)/archCount,p=track.getPointAt(t),tangent=track.getTangentAt(t),ry=-Math.atan2(tangent.z,tangent.x);
    if(inCourtArea(p.x,p.z,exclusions,5))continue;
    arches.push({x:p.x,y:0,z:p.z,sx:track.getLength()/archCount/12+.015,sy:1,sz:1,ry});
    for(const side of [-1,1])archFaces.push({x:p.x-tangent.z*side*1.82,y:0,z:p.z+tangent.x*side*1.82,sx:1,sy:1,sz:1,ry:ry+(side===-1?Math.PI:0)});
    for (const side of [-1, 1]) {
      const x = p.x - tangent.z * side * 2.1, z = p.z + tangent.x * side * 2.1
      parapets.push({ x, y: 8.35, z, sx: track.getLength() / archCount + .12, sy: 1.05, sz: .32, ry })
      copings.push({ x, y: 8.91, z, sx: track.getLength() / archCount + .16, sy: .16, sz: .46, ry })
      piers.push({ x, y: 4, z, sx: .5, sy: 8, sz: .5, ry })
      // Trackside growth belongs to the illustrative railway, not a new surveyed route.
      const bx = p.x - tangent.z * side * 4.4, bz = p.z + tangent.x * side * 4.4
      if (detailedNeighbourhood(bx, bz, 250) &&
          !inCourtArea(bx, bz, exclusions, 4) && !nearLandmark(bx, bz) &&
          !roadSegments.some(road => distanceToSegment(bx, bz, road.a, road.b) < road.width / 2 + 2)) {
        tracksideShrubs.push({ x: bx, y: .65, z: bz, sx: 1.8, sy: .75, sz: 1.3, ry,
          color: foliageColors[i % foliageColors.length] })
      }
    }
  }
   const railwayBrick=finishes.brick.clone();railwayBrick.color.set('#b27e5d');
   instances(archGeometry,railwayBrick,arches,true,railway);
  instances(archRing,trimMaterial,archFaces,false,railway);
  instances(box,bodyMaterial,parapets,true,railway)
  instances(box,trimMaterial,copings,true,railway)
  instances(box,bodyMaterial,piers,true,railway)
  instances(sphere,leafMaterial,tracksideShrubs,true,railway)
  const sleepers: Instance[] = []
  const ballast: Instance[] = []
  const railPositions: number[] = []
  const railsMat = new THREE.LineBasicMaterial({ color: '#626b62' })
  const samples = 900
  for (let i = 0; i < samples; i++) {
    const t = i / samples, next = (i + 1) / samples
    const p = track.getPointAt(t), q = track.getPointAt(next)
    const tangent = track.getTangentAt(t)
    const ry = -Math.atan2(tangent.z, tangent.x)
    ballast.push({ x: p.x, y: p.y - .38, z: p.z, sx: p.distanceTo(q) + .1, sy: .65, sz: 3.7, ry })
    if (i % 3 === 0) sleepers.push({ x: p.x, y: p.y + .02, z: p.z, sx: .26, sy: .15, sz: 2.9, ry })
    if (i % 2 === 0 && detailedNeighbourhood(p.x, p.z, 250)) {
      for (const side of [-1, 1]) {
        ballastStones.push({ x: p.x - tangent.z * side * 1.48, y: p.y + .03,
          z: p.z + tangent.x * side * 1.48, sx: .28, sy: .1, sz: .2, ry: i * .71,
          color: i % 4 === 0 ? '#b4b1a5' : '#8a8c83' })
      }
    }
    for (const side of [-1, 1]) {
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(side * .87)
      const qt = track.getTangentAt(next)
      const qnormal = new THREE.Vector3(-qt.z, 0, qt.x).multiplyScalar(side * .87)
      railPositions.push(p.x + normal.x, p.y + .18, p.z + normal.z, q.x + qnormal.x, q.y + .18, q.z + qnormal.z)
    }
  }
   instances(box, finishes.ballast, ballast, true, railway)
   instances(box, finishes.timber, sleepers, false, railway)
  instances(box,stoneMaterial,ballastStones,false,railway)
  const railsGeo = new THREE.BufferGeometry(); railsGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3))
  railway.add(new THREE.LineSegments(railsGeo, railsMat))
  const carriages: THREE.Group[] = []
  const red = standard('#c24f39'), blue = standard('#344a64'), white = standard('#ece9d8')
  const trainGlass = standard('#456775', { emissive: '#e8c27b', emissiveIntensity: .1 })
  for (let c = 0; c < 5; c++) {
    const carriage = new THREE.Group(); railway.add(carriage); carriages.push(carriage)
    mesh(box, blue, 0, .66, 0, 2.75, .85, 7.9, 0, carriage)
    mesh(box, white, 0, 1.53, 0, 2.7, 1.2, 7.6, 0, carriage)
    mesh(box, red, 0, 1.4, 3.58, 2.75, 1.6, .48, 0, carriage)
    mesh(box, red, 0, 1.4, -3.58, 2.75, 1.6, .48, 0, carriage)
    mesh(box, trimMaterial, 0, 2.2, 0, 2.85, .24, 7.95, 0, carriage)
    for (const side of [-1, 1]) {
      for (let w = 0; w < 4; w++) mesh(box, trainGlass, side * 1.37, 1.55, -2.7 + w * 1.8, .04, .64, 1.18, 0, carriage)
      mesh(box, red, side * 1.4, 1.3, 0, .06, 1.55, .45, 0, carriage)
    }
    if (c === 0) mesh(box, trainGlass, 0, 1.64, 3.84, 2.05, .66, .05, 0, carriage)
  }
  const trackLength = track.getLength()
  const walkPaths=[
    [[68,-90],[92,-106],[130,-91],[150,-61],[152,-21],[130,20],[108,25],[72,27],[64,3],[64,-38]].map(([x,z])=>new THREE.Vector3(x,.2,z)),
    ...parks.slice(1,3).map(park=>Array.from({length:32},(_,i)=>{
      const angle=i/32*Math.PI*2;
      return new THREE.Vector3(park.x+Math.cos(angle)*(park.rx-7),.2,park.z+Math.sin(angle)*(park.rz-7));
    })),
  ];
  const walkPieces:Instance[]=[]
  for(const points of walkPaths)for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length]
    if(!inCourtArea((a.x+b.x)/2,(a.z+b.z)/2,exclusions,1))walkPieces.push({x:(a.x+b.x)/2,y:.12,z:(a.z+b.z)/2,sx:a.distanceTo(b)+.2,sy:.06,sz:1.4,ry:-Math.atan2(b.z-a.z,b.x-a.x)})
  }
  instances(box,pathMaterial,walkPieces,false)
  const life=createTownLife(animatedCourts,walkPaths,geoPosition,exclusions)
  root.add(life.root)
  let trainDistance = .4
  let windTime=0
  let windStrength = .045
  let previous = 0
  let trainPositioned = false
  function animate(seconds: number, runTrain: boolean, runActivity: boolean, runBuses: boolean) {
    const delta = Math.min(.08, Math.max(0, seconds - previous)); previous = seconds
    gear.animate(delta,runActivity)
    life.animate(delta,runActivity,runBuses)
    if(runActivity) windTime += delta
    finishes.setWind(windTime, windStrength)
    if (!runTrain && trainPositioned) return
    if (runTrain) trainDistance = (trainDistance + delta * 12 / trackLength) % 1
    carriages.forEach((carriage, index) => {
      const t = (trainDistance - index * 8.9 / trackLength + 1) % 1
      const p = track.getPointAt(t), tangent = track.getTangentAt(t)
      carriage.position.copy(p).setY(p.y + .25)
      carriage.rotation.y = Math.atan2(tangent.x, tangent.z)
    })
    trainPositioned = true
  }
  animate(0, false, false, false)

  return {
    root, stations, anchors, courtFocusAnchors,
    vanPosition:gear.van.position,
    setActivity:life.setActivity,
    setWind(strength: number) { windStrength = strength },
    setBuses:life.setBuses,
    setBusRoute:life.setBusRoute,
    setNight(night) {
      lighting.setNight(night);highburyModel.setNight(night);litCourtMaterials.forEach(material => { material.emissiveIntensity=night?.22:0 });
      streetLamps.setNight(night)
      windowMaterial.emissiveIntensity = night ? .75 : 0
      windowMaterial.color.set(night ? '#e0bd7d' : '#465e65')
      trainGlass.emissiveIntensity = night ? .65 : .1
      life.setNight(night)
    },
    setTransit(visible) { transit.visible = visible },
    animate,
    dispose() {
      lighting.dispose();streetLamps.dispose();finishes.dispose();courtSurfaces.dispose();
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      root.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          geometries.add(object.geometry)
          const mats = Array.isArray(object.material) ? object.material : [object.material]
          mats.forEach((material) => materials.add(material))
        }
      })
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
    },
  }
}
