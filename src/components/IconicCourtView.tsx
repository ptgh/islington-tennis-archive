import type { ViewSettings } from '../data/viewQuality'
import { QualityControl } from './QualityControl'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'
import { iconicClubs, tournamentDates, type IconicClubId, type Tournament } from '../data/tennisAtlas'
import { AtlasMiniature } from './AtlasMiniature'
import { Icon } from './Icon'
import { LightingControl } from './LightingControl'
import { cloneArchitecturalFinish, createMiniatureMaterials, SHADOW_PROXY_LAYER } from '../scene/miniatureMaterials'
import { createTownLife } from '../scene/createTownLife'
import { createVenueLighting } from '../scene/createVenueLighting'
import { updateSceneLight, weatherWind } from '../scene/sceneAtmosphere'
import { createWeather, type WeatherSceneKind } from '../scene/createWeather'
import { createMappedVenue, mappedCourtPosition } from '../scene/mappedVenue'
import { addSkyEnvironment, scenePixelRatio, createAdaptiveResolution, createLensFinish, resizeLensFinish, applyViewFocus, applySceneGrade, SCENE_TONE_MAPPING } from '../scene/renderQuality'
import { createClubSurfaces, type ClubCourtSurface } from '../scene/clubSurfaces'
import { createAntialiasedBeauty } from '../scene/antialiasedBeauty'
import './IconicCourtView.css'

// Club scenes were authored brighter than the town (1.18 vs 1.0 under ACES).
const ICONIC_DAY_LIFT = 1.18

type CourtStop = { id: string; name: string; note: string; x: number; z: number }

const COURTS: Record<IconicClubId, CourtStop[]> = {
  wimbledon: [
    { id: 'centre', name: 'Centre Court', note: 'The principal show court sits south of No. 1 Court, with the Tea Lawn on its Church Road side.', x: 0, z: 34 },
    { id: 'number-one', name: 'No. 1 Court', note: 'The rounder northern show court sits beside The Hill and the Aorangi entrance.', x: 0, z: -73 },
    { id: 'number-two', name: 'No. 2 Court', note: 'A smaller show court anchors the south-east corner of the main grounds.', x: 76, z: 117 },
    { id: 'number-three', name: 'No. 3 Court', note: 'No. 3 Court sits to the west of the southern outer-court rows.', x: -76, z: 113 },
    { id: 'outer', name: 'Outer courts', note: 'Courts 14–17 sit between the two great show courts; Courts 4–11 make two rows to the south.', x: 30, z: -11 },
  ],
  queens: [
    { id: 'arena', name: 'Andy Murray Arena', note: 'The former Centre Court is framed by the South, East and North stands beside the clubhouse.', x: -60, z: 0 },
    { id: 'court-one', name: 'Court 1', note: 'Court 1 sits closest to the arena in the middle bank of numbered grass courts.', x: 13, z: 0 },
    { id: 'outer', name: 'Courts 2–10', note: 'The numbered courts form three compact rows: 5–6 to the north, 1–4 centrally, and 7–10 to the south.', x: 64, z: 1 },
    { id: 'practice', name: 'Practice viewing', note: 'The tournament plan marks practice-court viewing along the eastern side of the numbered courts.', x: 102, z: -8 },
  ],
}

const GROUNDS_MAPS: Record<IconicClubId, string> = {
  wimbledon: 'https://www.wimbledon.com/en_GB/maps',
  queens: 'https://www.lta.org.uk/49afa0/siteassets/events/hsbc/map/hsbc-championships-site-map-2025.pdf',
}

type SceneHandle = { focus: (courtId: string) => void; zoom: (factor: number) => void; reset: () => void; activate: (id: IconicClubId) => void; frame: () => void }

function buildScene(id: IconicClubId, invalidate: () => void) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(id === 'wimbledon' ? '#dce7d5' : '#e4e8d7')
  const unitBox = new THREE.BoxGeometry(1, 1, 1)
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 9)
  // One bevel segment is sufficient for these instanced roadside miniatures.
  const carShell = new RoundedBoxGeometry(1, 1, 1, 1, .08)
  const carCabin = new THREE.BoxGeometry(1, 1, 1)
  const cabinVertices = carCabin.getAttribute('position')
  for (let i = 0; i < cabinVertices.count; i++) if (cabinVertices.getY(i) > 0) {
    cabinVertices.setX(i, cabinVertices.getX(i) * .76)
    cabinVertices.setZ(i, cabinVertices.getZ(i) * .82)
  }
  carCabin.computeVertexNormals()
  const carWheel = new THREE.CylinderGeometry(1, 1, 1, 10)
  carWheel.rotateX(Math.PI / 2)
  const finishes = createMiniatureMaterials()
  const surfaces = createClubSurfaces(finishes.parkGrass, invalidate)
  const unitPlane = new THREE.PlaneGeometry(1, 1)
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const batches = new Map<string, { material: THREE.Material; geometry: THREE.BufferGeometry; castShadow: boolean; matrices: THREE.Matrix4[] }>()
  const transform = new THREE.Object3D()
  let placement = new THREE.Matrix4()
  const place = (x: number, z: number, angle: number, scale: number, draw: () => void) => {
    const previous = placement
    placement = previous.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle), new THREE.Vector3(scale, scale, scale)))
    try { draw() } finally { placement = previous }
  }
  const matches: { center: THREE.Vector3; rotation: number; scale: number; halfLength: number; groundY: number }[] = []
  const grassColours = new Set(['#a4bd8b', '#a9bd90', '#8eac70', '#95b579', '#668e4d', '#6d9653', '#739b57', '#2f6948', '#3b6e4b'])
  const pavingColours = new Set(['#d6d5bf', '#dcdac4', '#d8d4be', '#ddd7c4', '#ded9c6'])
  const material = (colour: string) => {
    let value = materials.get(colour)
    if (!value) {
      const base = grassColours.has(colour) ? finishes.parkGrass : colour === '#c9c2ad' ? finishes.parkPath : colour === '#ccc5b0' ? finishes.paving : [...pavingColours, '#ded6c4', '#c2baa6', '#d8ddd7', '#e4e5d4'].includes(colour) ? surfaces.concrete : ['#a9775a', '#986b55', '#ad866b', '#aa7c60', '#ad7759', '#b39a79'].includes(colour) ? finishes.brick : ['#3d5143', '#4d5e56', '#66736c', '#52625c', '#727d73', '#5c6964'].includes(colour) ? finishes.slate : colour === '#85897e' ? finishes.asphalt : colour === '#746b51' ? finishes.timber : colour === '#3f5b49' ? surfaces.steel : null
      value = colour === '#456b63' ? cloneArchitecturalFinish(finishes.glazing, colour) : base ? (base === finishes.paving || base === finishes.asphalt || base === finishes.parkPath ? cloneArchitecturalFinish(base, colour) : base.clone()) : new THREE.MeshStandardMaterial({ roughness: .9 })
      value.color.set(colour)
      if (colour === '#50686a') { value.roughness = .3; value.metalness = .08; value.envMapIntensity = .8 }
      if (colour === '#f5f2df') { value.emissive.set('#f5f2df'); value.emissiveIntensity = .12 }
      materials.set(colour, value)
    }
    return value
  }
  const instance = (mat: THREE.Material, castShadow = true, geometry: THREE.BufferGeometry = unitBox) => {
    transform.updateMatrix()
    const key = `${geometry.uuid}-${mat.uuid}-${castShadow}`
    if (!batches.has(key)) batches.set(key, { material: mat, geometry, castShadow, matrices: [] })
    batches.get(key)?.matrices.push(placement.clone().multiply(transform.matrix))
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, colour: string, shadow = true) => {
    transform.position.set(x, y, z)
    transform.rotation.set(0, 0, 0)
    transform.scale.set(w, h, d)
    instance(material(colour), shadow)
  }
  const beam = (a: THREE.Vector3, b: THREE.Vector3, thickness: number, colour: string) => {
    transform.position.copy(a).add(b).multiplyScalar(.5)
    transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    transform.scale.set(thickness, a.distanceTo(b), thickness)
    instance(material(colour))
  }
  const cylinder = (x: number, y: number, z: number, radius: number, height: number, colour: string) => {
    transform.position.set(x, y, z)
    transform.rotation.set(0, 0, 0)
    transform.scale.set(radius, height, radius)
    instance(material(colour), true, unitCylinder)
  }
  const ring = (x: number, y: number, z: number, innerX: number, innerZ: number, outerX: number, outerZ: number, colour: string, sides: number, depth = .15) => {
    const shape = new THREE.Shape()
    const hole = new THREE.Path()
    const trace = (path: THREE.Path, rx: number, rz: number, reverse: boolean) => {
      for (let i = 0; i <= sides; i++) {
        const angle = i * Math.PI * 2 / sides * (reverse ? -1 : 1)
        const px = Math.cos(angle) * rx, py = Math.sin(angle) * rz
        if (i === 0) path.moveTo(px, py)
        else path.lineTo(px, py)
      }
    }
    trace(shape, outerX, outerZ, false)
    trace(hole, innerX, innerZ, true)
    shape.holes.push(hole)
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 }), material(colour))
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.applyMatrix4(placement)
    scene.add(mesh)
  }
  const seat = (x: number, y: number, z: number, angle: number, colour: string) => {
    transform.rotation.set(0, angle, 0)
    transform.position.set(x, y, z)
    transform.scale.set(.65, .18, .62)
    instance(material(colour))
    transform.position.set(x + Math.sin(angle) * .27, y + .3, z + Math.cos(angle) * .27)
    transform.scale.set(.65, .55, .12)
    instance(material(colour))
  }
  const canopy = finishes.foliageGeometry
  const foliageBatches = new Map<string, THREE.Matrix4[]>()
  const treeDetailCentres = COURTS[id].map(stop => mappedCourtPosition(id, stop.id))
  const tree = (x: number, z: number, size: number, shade: string) => {
    cylinder(x, size * .58, z, size * .12, size * 1.15, '#746b51')
    if (!foliageBatches.has(shade)) foliageBatches.set(shade, [])
    // Three silhouettes (round, columnar, spreading) so no two neighbours repeat.
    const kind = Math.floor(Math.abs(Math.sin(x * 12.9 + z * 78.2)) * 3)
    const spread = kind === 1 ? .28 : kind === 2 ? .62 : .48, lift = kind === 1 ? 1.25 : 1
    for (let lobe = 0; lobe < 4; lobe++) {
      const angle = lobe * 2.399 + x, radius = lobe === 0 ? 0 : size * spread
      transform.position.set(x + Math.cos(angle) * radius, size * (lobe === 0 ? 1.7 : 1.35 + (kind === 1 ? lobe * .12 : 0)) * lift, z + Math.sin(angle) * radius)
      transform.rotation.set(0, angle, 0)
      transform.scale.setScalar(size * (lobe === 0 ? .65 : .46))
      transform.updateMatrix()
      foliageBatches.get(shade)?.push(placement.clone().multiply(transform.matrix))
      if(lobe>0){
        const fork=new THREE.Vector3(x+Math.cos(angle)*radius,size*1.5,z+Math.sin(angle)*radius)
        beam(new THREE.Vector3(x,size*.8,z),fork,size*.055,'#746b51')
        if(treeDetailCentres.some(p=>Math.hypot(x-p.x,z-p.z)<115))beam(fork,new THREE.Vector3(x+Math.cos(angle+.3)*radius*1.12,size*1.77,z+Math.sin(angle+.3)*radius*1.12),size*.028,'#746b51')
      }
    }
  }
  // Parked vehicles share geometry and instanced parts, like the façades.
  // Their original length/width and roadside positions stay unchanged.
  const parkedCar = (colour: string, variation: number) => {
    const part = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, w: number, h: number, d: number, tone: string, shadow = false) => {
      transform.position.set(x, y, z); transform.rotation.set(0, 0, 0); transform.scale.set(w, h, d)
      instance(material(tone), shadow, geometry)
    }
    const tall = variation % 3 === 0, cabinHeight = tall ? .66 : .53
    part(carShell, 0, .65, 0, 3.8, .74, 1.55, colour, true)
    part(carCabin, -.15, 1.02 + cabinHeight / 2, 0, tall ? 2.3 : 2.05, cabinHeight, 1.33, '#50686a')
    part(carShell, -.15, 1.04 + cabinHeight, 0, tall ? 1.78 : 1.58, .075, 1.12, colour)
    for (const side of [-1, 1]) {
      box(-.15, 1.02 + cabinHeight / 2, side * .67, .075, cabinHeight, .04, colour, false)
      for (const axle of [-1.15, 1.15]) {
        part(carWheel, axle, .35, side * .70, .31, .31, .15, '#39433c')
        part(carWheel, axle, .35, side * .778, .16, .16, .025, '#b5ad96')
      }
      for (const end of [-1, 1]) box(end * 1.88, .77, side * .51, .04, .16, .31, end > 0 ? '#ded8c3' : '#92614f', false)
      box(side * 1.86, .48, 0, .08, .13, 1.27, '#39433c', false)
    }
  }
  const court = (cx: number, cz: number, width = 12, depth = 23, apron = 3, surface: ClubCourtSurface = 'grass') => {
    box(cx, .08, cz, width + apron * 2, .12, depth + apron * 2, '#2f6948', false)
    const floor = (x: number, z: number, w: number, d: number, mat: THREE.Material, y = .18) => {
      transform.position.set(x, y, z); transform.rotation.set(-Math.PI / 2, 0, 0); transform.scale.set(w, d, 1)
      instance(mat, false, unitPlane)
    }
    floor(cx, cz, width + apron * 2, depth + apron * 2, surfaces[surface])
    // A narrow maintenance path keeps grass runoffs intact; larger walkways
    // remain in their original mapped positions.
    for (const side of [-1, 1]) {
      floor(cx + side * (width / 2 + apron - .45), cz, .7, depth + apron * 2, surfaces.concrete, .185)
      floor(cx, cz + side * (depth / 2 + apron - .45), width + apron * 2, .7, surfaces.concrete, .185)
    }
    // Slightly exaggerated paint remains legible at miniature overview scale.
    const line = (x: number, z: number, w: number, d: number) => box(cx + x, .25, cz + z, w, .025, d, '#f5f2df', false)
    const doubles = width * .44, singles = width * .36, baseline = depth * .44, service = depth * .23
    for (const side of [-1, 1]) {
      line(side * doubles, 0, .18, baseline * 2)
      line(side * singles, 0, .16, baseline * 2)
      line(0, side * baseline, doubles * 2, .2)
      line(0, side * service, singles * 2, .18)
      line(0, side * service / 2, .16, service)
    }
    transform.position.set(cx,.61,cz);transform.rotation.set(0,0,0);transform.scale.set(doubles*2,.65,.015)
    instance(finishes.net,true)
    box(cx, .96, cz, doubles * 2 + .5, .045, .07, '#fcf8e9', false)
    for (const side of [-1, 1]) cylinder(cx + side * (doubles + .25), .54, cz, .055, 1.08, '#3f5b49')
    // Court-side furniture and fine perimeter fencing use the main map's miniature scale.
    const fenceX = width / 2 + apron - .2, fenceZ = depth / 2 + apron - .2
    if (width < 15) {
      for (const side of [-1, 1]) {
        transform.position.set(cx + side * fenceX, 1.4, cz); transform.rotation.set(0, Math.PI / 2, 0); transform.scale.set(fenceZ * 2, 2.4, 1)
        instance(surfaces.fence, false, unitPlane)
        transform.position.set(cx, 1.4, cz + side * fenceZ); transform.rotation.set(0, 0, 0); transform.scale.set(fenceX * 2, 2.4, 1)
        instance(surfaces.fence, false, unitPlane)
        for (let i = 0; i <= 6; i++) box(cx + side * fenceX, 1.35, cz - fenceZ + i * fenceZ / 3, .07, 2.5, .07, '#3f5b49')
        for (let i = 0; i <= 4; i++) box(cx - fenceX + i * fenceX / 2, 1.35, cz + side * fenceZ, .07, 2.5, .07, '#3f5b49')
        for (const y of [.4, 1.4, 2.6]) {
          box(cx + side * fenceX, y, cz, .025, .025, fenceZ * 2, '#3f5b49')
          box(cx, y, cz + side * fenceZ, fenceX * 2, .025, .025, '#3f5b49')
        }
      }
    }
    box(cx - fenceX + .8, .55, cz - 3, .65, .15, 2.4, '#e8e5d2')
    for (const dz of [-.8, .8]) box(cx - fenceX + .8, .3, cz - 3 + dz, .5, .5, .1, '#3f5b49')
    box(cx + fenceX - .8, 1.3, cz, .8, .18, .8, '#e8e5d2')
    for (const dz of [-.3, .3]) beam(new THREE.Vector3(cx + fenceX - 1.2, .2, cz + dz), new THREE.Vector3(cx + fenceX - .8, 1.3, cz + dz), .075, '#3f5b49')
    const scale = new THREE.Vector3().setFromMatrixScale(placement).x
    const rotation = Math.atan2(placement.elements[8], placement.elements[10])
    matches.push({ center: new THREE.Vector3(cx, 0, cz).applyMatrix4(placement), rotation, scale: 1.25 * scale, halfLength: depth * .34 / 1.25, groundY: .23 })
  }
  const bowl = (cx: number, cz: number, tiers: number) => {
    for (let row = 0; row < tiers * 3; row++) {
      const innerX = 12 + row * 1.48, innerZ = 20 + row * 1.48
      ring(cx, .48 + row * .6, cz, innerX, innerZ, innerX + 1.6, innerZ + 1.6, row % 2 ? '#416e59' : '#315b4c', 48)
      for (let sub = 0; sub < 1; sub++) for (let s = 0; s < 168; s++) {
        if (s % 21 < 2) continue
        const angle = s * Math.PI * 2 / 168
        seat(cx + Math.sin(angle) * (innerX + .7 + sub), .76 + row * .62 + sub * .13, cz + Math.cos(angle) * (innerZ + .7 + sub), angle, '#487a62')
      }
    }
    const edgeX = 21 + tiers * 2.65, edgeZ = 27 + tiers * 2.8
    ring(cx, .55 + tiers * .62, cz, edgeX - .25, edgeZ - .25, edgeX + 1.65, edgeZ + 1.65, '#e4e5d4', 48)
    ring(cx, .1, cz, edgeX + .3, edgeZ + .3, edgeX + 1.5, edgeZ + 1.5, '#aa7c60', 64, 10.5)
    ring(cx, 13, cz, 23, 30, edgeX + 3, edgeZ + 3, '#d8ddd7', 64, .6)
    for (const y of [2.8, 7.4]) ring(cx,y,cz,edgeX+.25,edgeZ+.25,edgeX+1.65,edgeZ+1.65,'#c4b9a1',64,.14)
    for (let bay=0;bay<48;bay++) {
      const angle=bay*Math.PI/24
      place(cx+Math.sin(angle)*(edgeX+1.58),cz+Math.cos(angle)*(edgeZ+1.58),angle,1,()=>{
        box(0,5,0,1.5,2.8,.18,'#456b63',false)
        box(0,5,.12,.08,2.8,.12,'#c4b9a1',false)
        box(1.5,5.1,0,.22,9.5,.32,'#ba997c')
      })
    }
    // Open roof aperture: radial ribs and folded northern/southern roof packs.
    for (let s = 0; s < 32; s++) {
      const a = s * Math.PI / 16, sx = Math.sin(a), sz = Math.cos(a)
      beam(new THREE.Vector3(cx + sx * 23, 13.7, cz + sz * 30), new THREE.Vector3(cx + sx * (edgeX + 3), 13.7, cz + sz * (edgeZ + 3)), .22, '#faf9ef')
      if (s % 2 === 0) beam(new THREE.Vector3(cx + sx * edgeX, 4, cz + sz * edgeZ), new THREE.Vector3(cx + sx * edgeX, 13, cz + sz * edgeZ), .28, '#52665b')
    }
    for (const side of [-1, 1]) for (let rib = 0; rib < 6; rib++) box(cx, 13.9 + (rib % 2) * .3, cz + side * (30 + rib * .8), 34, .4, .45, '#f1f0e5')
  }
  const centreStand = (cx: number, cz: number, tiers: number) => {
    // Continuous raked seating brings the spectators down to the playing apron.
    const rows = tiers * 4
    for (let row = 0; row < rows; row++) {
      const spread = row * 1.08, y = .65 + row * .52
      const rx = 12 + spread, rz = 20 + spread
      const shade = row % 2 ? '#426a55' : '#315b4b'
      for (const side of [-1, 1]) {
        box(cx + side * rx, y, cz, 1.18, .55, rz * 2, shade)
        box(cx, y, cz + side * rz, rx * 2, .55, 1.18, shade)
        for (let s = -Math.floor(rz); s <= rz; s++) {
          if (Math.abs(s) % 10 < 2) continue
          seat(cx + side * rx, y + .48, cz + s, side * Math.PI / 2, '#487a62')
        }
        for (let s = -Math.floor(rx) + 1; s < rx; s++) {
          if (Math.abs(s) % 10 < 2) continue
          seat(cx + s, y + .48, cz + side * rz, side > 0 ? 0 : Math.PI, '#487a62')
        }
      }
    }
    for (const side of [-1, 1]) {
      box(cx + side * 34.5, 5.5, cz, 1.4, 11, 85, '#aa7c60')
      box(cx, 5.5, cz + side * 42, 70, 11, 1.4, '#aa7c60')
      for (const y of [1,5.5,10.8]) {
        box(cx, y, cz+side*42.8,70,.22,.32,'#c4b9a1')
        box(cx+side*35.3,y,cz,.32,.22,85,'#c4b9a1')
      }
      for(let x=-32;x<=32;x+=4) {
        box(cx+x,5.3,cz+side*42.8,.28,10.5,.32,'#ba997c')
        // Centre Court's ivy-covered frontage, documented by Merton's archive.
        // Broken edges leave the glazing and stone bands readable in miniature.
        if(side===1)for(let leaf=0;leaf<7;leaf++) {
          const y=1.1+leaf*1.25, spread=.7+.35*Math.sin(x+leaf*2.1)
          box(cx+x,y,cz+43,spread,1.45,.25,leaf%2?'#61774b':'#516e47',false)
        }
        for(const y of [3.3,8]) {
          box(cx+x+1.8,y,cz+side*42.85,1.8,2.3,.16,'#456b63',false)
          box(cx+x+1.8,y,cz+side*42.96,.08,2.3,.1,'#c4b9a1',false)
        }
      }
      box(cx + side * 29.5, 13.2, cz, 15, .65, 86, '#d8ddd7')
      box(cx, 13.2, cz + side * 35.5, 44, .65, 13, '#d8ddd7')
      for (let z = -40; z <= 40; z += 4) {
        beam(new THREE.Vector3(cx + side * 22, 13.6, cz + z), new THREE.Vector3(cx + side * 37, 14.3, cz + z), .18, '#faf9ef')
        beam(new THREE.Vector3(cx + side * 22, 13.6, cz + z), new THREE.Vector3(cx + side * 34.5, 11, cz + z), .12, '#b8c5bd')
        box(cx + side * 34.5, 12.1, cz + z, .22, 3.1, .22, '#52665b')
        box(cx + side * 35.3, 4, cz + z, .12, 2.3, 1.8, '#456b63')
      }
      for (let rib = 0; rib < 8; rib++) box(cx, 13.7 + rib % 2 * .28, cz + side * (29 + rib * .72), 44, .35, .42, '#f1f0e5')
      // Dark scoreboards and the court-level perimeter screen define the playing enclosure.
      box(cx + side * 12, 1.1, cz, .3, 1.8, 38, '#244b3d')
      box(cx, 1.1, cz + side * 19.5, 24, 1.8, .3, '#244b3d')
      box(cx + side * 17, 4.3, cz + side * 24, 5, 2.5, .3, '#273e34')
    }
  }
  const smallerStand = (cx: number, cz: number, tiers: number) => {
    for (let row = 0; row < tiers; row++) {
      const innerX = 16 + row * 2.2, innerZ = 21 + row * 2.2
      ring(cx, .4 + row * .48, cz, innerX, innerZ, innerX + 2.4, innerZ + 2.4, row % 2 ? '#52705a' : '#385d4d', 24)
      for (let s = 0; s < 96; s++) {
        if (s % 12 === 0) continue
        const a = s * Math.PI / 48
        seat(cx + Math.sin(a) * (innerX + .8), .8 + row * .48, cz + Math.cos(a) * (innerZ + .8), a, '#487a62')
      }
    }
  }
  const queensStand = () => {
    for (let row = 0; row < 7; row++) {
      const spread = row * 1.7, y = .65 + row * .65
      for (const side of [-1, 1]) {
        box(0, y, side * (24 + spread), 38 + spread * 2, .6, 1.9, '#975952')
        for (let seatIndex = -20; seatIndex <= 20; seatIndex++) if (seatIndex % 9 !== 0) seat(seatIndex, y + .5, side * (24 + spread), side > 0 ? 0 : Math.PI, '#b56e61')
      }
      box(19 + spread, y, 0, 1.9, .6, 48 + spread * 2, '#975952')
      for (let seatIndex = -24; seatIndex <= 24; seatIndex++) if (seatIndex % 9 !== 0) seat(19 + spread, y + .5, seatIndex, Math.PI / 2, '#b56e61')
    }
    for (const z of [-36, 36]) {
      box(0, 5.1, z, 64, .35, 2.4, '#e5dcc7')
      for (let x = -28; x <= 29; x += 4) {
        box(x, 2.5, z, .22, 5, .22, '#52665b')
        beam(new THREE.Vector3(x, .1, z), new THREE.Vector3(x + 3.8, 4.8, z), .12, '#52665b')
      }
    }
  }
  const mapped = createMappedVenue(id, { scene, finishes, box, place, tree, parkedCar, court, bowl, centreStand, smallerStand, queensStand })

  for (const { material: mat, geometry, castShadow, matrices } of batches.values()) {
    const mesh = new THREE.InstancedMesh(geometry, mat, matrices.length)
    if (geometry === carShell) mesh.name = 'Parked car shells'
    if (geometry === carCabin) mesh.name = 'Parked car glazing'
    if (geometry === carWheel) mesh.name = 'Parked car wheels'
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix))
    mesh.castShadow = castShadow; mesh.receiveShadow = !['f5f2df', 'fcf8e9'].includes((mat as THREE.MeshStandardMaterial).color.getHexString()); mesh.computeBoundingSphere(); scene.add(mesh)
  }
  for (const [shade, matrices] of foliageBatches) {
    const mat = finishes.foliage.clone(); finishes.wind(mat); mat.color.set(shade); materials.set(`foliage-${shade}`, mat)
    const mesh = new THREE.InstancedMesh(canopy, mat, matrices.length)
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix))
    mesh.castShadow = false; mesh.receiveShadow = true; mesh.computeBoundingSphere(); scene.add(mesh)
    // Keep every visible leaf, but use the town's low-poly crowns for shadows.
    const proxy = new THREE.InstancedMesh(finishes.foliageShadowGeometry, finishes.foliageShadowProxy, matrices.length)
    proxy.name = 'Club tree shadow proxies'
    proxy.instanceMatrix = mesh.instanceMatrix
    proxy.castShadow = true
    proxy.customDepthMaterial = finishes.foliageShadowDepth
    proxy.layers.set(SHADOW_PROXY_LAYER)
    proxy.computeBoundingSphere(); scene.add(proxy)
  }
  const courtLighting = createVenueLighting()
  const litCourts = id === 'wimbledon' ? ['centre', 'number-one'].map(stop => {
    const p = mappedCourtPosition(id, stop)
    if ('angle' in p) courtLighting.add(id, stop, p.x, p.z, p.angle)
    return p
  }) : []
  scene.add(courtLighting.root)
  const life = createTownLife(matches.map(match => ({ ...match, nightPlayable: litCourts.some(p => Math.hypot(p.x-match.center.x,p.z-match.center.z)<1) })), mapped.paths, () => new THREE.Vector3(), [], false)
  life.root.name = 'Court players and visitors'
  scene.add(life.root)
  const ambient = new THREE.HemisphereLight('#f7f2e9', '#59634f', .88)
  const sun = new THREE.DirectionalLight('#fff0dc', 2.8)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  sun.shadow.camera.left = -430; sun.shadow.camera.right = 430
  sun.shadow.camera.top = 480; sun.shadow.camera.bottom = -480
  sun.shadow.camera.far = 1600
  sun.shadow.normalBias = .08
  sun.shadow.bias = -.00006
  scene.add(sun, sun.target, ambient)
  let windTime = 0, clock = new Date(), lastNight: boolean | undefined
  const lightTarget = new THREE.Vector3(0, 0, id === 'wimbledon' ? 15 : 0)
  return { scene, weatherClearance: matches.map(match => match.center),
    animate(delta: number, running: boolean, night: boolean, weather: WeatherSceneKind, lightingTime: number | null, windMph?:number) {
      life.setNight(night)
      life.animate(delta, running, false)
      if (running) { windTime += delta; clock = new Date() }
      finishes.setWind(windTime, weatherWind(weather,windMph))
      finishes.setRain(weather==='rain')
      updateSceneLight(sun, ambient, lightTarget, 850, lightingTime === null ? clock : new Date(lightingTime), night, weather)
      if (night !== lastNight) {
        courtLighting.setNight(night)
        scene.background = new THREE.Color(night ? '#253940' : id === 'wimbledon' ? '#dce7d5' : '#e4e8d7')
        const glass = materials.get('#456b63')
        if (glass) { glass.emissive.set('#e0bd7d'); glass.emissiveIntensity = night ? .65 : 0 }
        lastNight = night
      }
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>(), usedMaterials = new Set<THREE.Material>()
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry)
          const mats = Array.isArray(object.material) ? object.material : [object.material]
          mats.forEach(mat => usedMaterials.add(mat))
        }
      })
      geometries.forEach(geometry => geometry.dispose())
      usedMaterials.forEach(mat => mat.dispose())
      courtLighting.dispose(); surfaces.dispose(); finishes.dispose(); sun.shadow.map?.dispose()
    },
  }
}

export function IconicCourtView({ viewSettings, onViewSettings, active = true, clubId, event, onBack, onHome, onSwitch, night, motionRunning, weather, windMph, onNight, onMotion, lightingTime, onLightingTime }: { viewSettings: ViewSettings; onViewSettings: (settings: ViewSettings) => void; active?: boolean; clubId: IconicClubId; event?: Tournament; onBack: () => void; onHome: () => void; onSwitch: (id: IconicClubId) => void; night: boolean; lightingTime: number | null; onLightingTime: (time: number | null) => void; motionRunning: boolean; weather: WeatherSceneKind; windMph?: number; onNight: () => void; onMotion: () => void }) {
  const runtime = useRef({ viewSettings, active, night, motionRunning, weather, windMph, lightingTime })
  // Dev builds only: window.__townOverride pins weather/time for render comparisons.
  runtime.current = { viewSettings, active, night, motionRunning, weather, windMph, lightingTime,
    ...(import.meta.env.DEV ? (window as { __townOverride?: object }).__townOverride : undefined) }
  const host = useRef<HTMLDivElement>(null)
  const engine = useRef<SceneHandle | null>(null)
  const [failed, setFailed] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [card, setCard] = useState<'time' | 'quality' | null>(null)
  const [preparing, setPreparing] = useState(true)
  const [selectedId, setSelectedId] = useState(COURTS[clubId][0].id)
  const club = iconicClubs.find(item => item.id === clubId) ?? iconicClubs[0]
  const courts = COURTS[clubId]
  const selected = courts.find(item => item.id === selectedId) ?? courts[0]

  useEffect(() => {
    const element = host.current
    if (!element) return
    const initialize = () => {
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }) }
    catch { setFailed(true); return }
    let textureDirty = false
    let activeId = clubId
    let world = buildScene(activeId, () => { textureDirty = true })
    // One weather system follows the shared renderer between cached club worlds.
    const weatherWorld = createWeather()
    world.scene.add(weatherWorld.root)
    const worlds = new Map<IconicClubId, ReturnType<typeof buildScene>>([[activeId, world]])
    const disposeEnvironment = addSkyEnvironment(renderer, world.scene)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = SCENE_TONE_MAPPING
    renderer.shadowMap.enabled = true
    // The beauty and AO passes share one shadow map per frame.
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const renderShadows = renderer.shadowMap.render.bind(renderer.shadowMap)
    renderer.shadowMap.render = (lights, scene, camera) => {
      const mask = camera.layers.mask
      camera.layers.enable(SHADOW_PROXY_LAYER)
      try { renderShadows(lights, scene, camera) } finally { camera.layers.mask = mask }
    }
    renderer.domElement.className = 'atlas-court-canvas'
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute('aria-label', `Illustrated interactive courts at ${club.name}. Drag to pan, scroll to zoom, right-drag to rotate.`)
    element.appendChild(renderer.domElement)
    const camera = new THREE.OrthographicCamera(-140, 140, 135, -135, .5, 2400)
    // Match the main map's contact shading, with a capped AO buffer so the
    // animated scene remains practical on smaller displays.
    const composer = new EffectComposer(renderer)
    const beauty = createAntialiasedBeauty(world.scene, camera)
    const occlusion = new GTAOPass(world.scene, camera, 1, 1)
    const drawOcclusion = occlusion.render.bind(occlusion)
    occlusion.render = (renderer, writeBuffer, readBuffer) => {
      const visible = weatherWorld.root.visible
      weatherWorld.root.visible = false
      try { drawOcclusion(renderer, writeBuffer, readBuffer, 0, false) }
      finally { weatherWorld.root.visible = visible }
    }
    occlusion.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.5, thickness: 1, distanceFallOff: 1, scale: 1, samples: element.clientWidth > 760 ? 16 : 8, screenSpaceRadius: false })
    occlusion.updatePdMaterial({ lumaPhi: 5, depthPhi: 1, normalPhi: 3, radius: 4, samples: 8 })
    const sizeOcclusion = occlusion.setSize.bind(occlusion)
    occlusion.setSize = (w: number, h: number) => {
      const ratio = Math.min(element.clientWidth > 760 ? .75 : .5, Math.sqrt(1600000 / (w * h)))
      sizeOcclusion(Math.max(1, Math.ceil(w * ratio)), Math.max(1, Math.ceil(h * ratio)))
    }
    const output = new OutputPass(), antialias = new ShaderPass(FXAAShader)
    const lens = new ShaderPass(createLensFinish())
    composer.addPass(beauty); composer.addPass(occlusion); composer.addPass(output); composer.addPass(antialias); composer.addPass(lens)
    let compact = element.clientWidth < 760
    let viewSpan = 270
    const updateProjection = () => {
      // Keep a selected court centred in the clear area above the mobile panel,
      // rather than multiplying the vertical offset as the camera zooms in.
      const lift = compact ? viewSpan * .22 / camera.zoom : 0
      camera.top = viewSpan / 2 - lift
      camera.bottom = -viewSpan / 2 - lift
      camera.updateProjectionMatrix()
    }
    const overview = new THREE.Vector3(compact ? 0 : -85, 0, compact ? 0 : 35)
    const offset = new THREE.Vector3(420, 510, 680)
    camera.position.copy(offset).add(overview)
    camera.lookAt(overview)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(overview)
    controls.update()
    controls.enableDamping = false
    controls.minZoom = .7
    controls.maxZoom = 4
    controls.maxPolarAngle = Math.PI * .44
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }
    const quality = createAdaptiveResolution(1000 / 30, runtime.current.viewSettings.preset)
    let resolutionDirty = false
    let animation = 0, previous = 0, rendered = 0, onScreen = true, atmosphere = ''
    let journey: { start: number; position: THREE.Vector3; target: THREE.Vector3; zoom: number; destination: THREE.Vector3; destinationZoom: number } | null = null
    const cancelJourney = () => { journey = null }
    const frame = () => {
      const state = runtime.current
      if (!state.active) return
      if (quality.setPreset(state.viewSettings.preset)) applyResolution()
      applyViewFocus(lens.uniforms, state.viewSettings.sharp)
      world.animate(0, false, state.night, state.weather, state.lightingTime, state.windMph)
      weatherWorld.setKind(state.weather)
      weatherWorld.setView(camera, camera.zoom, world.weatherClearance)
      applySceneGrade(renderer, lens.uniforms, state.night, ICONIC_DAY_LIFT)
      occlusion.blendIntensity = state.night ? .16 : .30
      renderer.shadowMap.needsUpdate = true
      composer.render(); textureDirty = false
    }
    if (import.meta.env.DEV) Object.assign(window, { __club: { camera, controls, frame, renderer, runtime, composer, quality } })
    const applyResolution = () => {
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight)
      const ratio = scenePixelRatio(width, height, window.devicePixelRatio || 1, quality.scale)
      renderer.setPixelRatio(ratio)
      renderer.setSize(width, height)
      composer.setPixelRatio(ratio); composer.setSize(width, height)
      antialias.uniforms.resolution.value.set(1 / (width * ratio), 1 / (height * ratio))
      resizeLensFinish(lens.uniforms, width, height, ratio)
      resolutionDirty = false
      quality.pause()
    }
    const resize = () => {
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight)
      if (compact !== (width < 760)) {
        cancelJourney()
        compact = width < 760
        overview.set(compact ? 0 : -85, 0, compact ? 0 : 35)
        camera.position.copy(offset).add(overview)
        controls.target.copy(overview)
        camera.zoom = 1
        controls.update()
      }
      viewSpan = Math.max(activeId === 'wimbledon' ? 430 : 290, (compact ? (activeId === 'wimbledon' ? 560 : 410) : activeId === 'wimbledon' ? 620 : 510) * height / width)
      camera.left = -viewSpan * width / height / 2
      camera.right = -camera.left
      updateProjection()
      applyResolution()
      frame()
    }
    const reset = () => { cancelJourney(); camera.position.copy(offset).add(overview); controls.target.copy(overview); camera.zoom = 1; updateProjection(); controls.update(); frame() }
    const focus = (courtId: string) => {
      const stop = COURTS[activeId].find(item => item.id === courtId)
      if (!stop) return
      const position = mappedCourtPosition(activeId, courtId)
      const target = new THREE.Vector3(position.x, 0, position.z)
      const destinationZoom = stop.id === 'court-one' ? 3.1 : stop.id === 'outer' || stop.id === 'practice' ? 2.4 : 2.3
      if (!compact) {
        const panelWidth = element.parentElement?.querySelector('.atlas-court-panel')?.clientWidth ?? 335
        const clearAreaOffset = (panelWidth + 38) / 2 * viewSpan / element.clientHeight / destinationZoom
        target.addScaledVector(new THREE.Vector3(offset.z, 0, -offset.x).normalize(), -clearAreaOffset)
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cancelJourney(); camera.position.copy(offset).add(target); controls.target.copy(target); camera.zoom = destinationZoom
        updateProjection(); controls.update(); frame()
      } else journey = { start: performance.now(), position: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom, destination: target, destinationZoom }
    }
    const zoom = (factor: number) => { cancelJourney(); camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom); updateProjection(); frame() }
    const activate = (id: IconicClubId) => {
      if (id !== activeId) {
        cancelJourney()
        let next = worlds.get(id)
        if (!next) {
          next = buildScene(id, () => { textureDirty = true })
          next.scene.environment = world.scene.environment
          next.scene.environmentIntensity = world.scene.environmentIntensity
          worlds.set(id, next)
        }
        quality.pause()
        activeId = id; world = next
        world.scene.add(weatherWorld.root)
        beauty.scene = world.scene; occlusion.scene = world.scene
        renderer.domElement.setAttribute('aria-label', `Illustrated interactive courts at ${iconicClubs.find(item => item.id === id)?.name}.`)
        overview.set(compact ? 0 : -85, 0, compact ? 0 : 35)
        camera.position.copy(offset).add(overview); controls.target.copy(overview); camera.zoom = 1
        resize()
      }
      textureDirty = true
      setPreparing(false)
    }
    engine.current = { focus, zoom, reset, activate, frame }
    // Camera updates request one frame instead of rendering twice per journey step.
    const controlChange = () => { textureDirty = true }
    controls.addEventListener('change', controlChange)
    controls.addEventListener('start', cancelJourney)
    renderer.domElement.addEventListener('dblclick', reset)
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    const visibility = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting })
    visibility.observe(element)
    const tick = (time: number) => {
      animation = requestAnimationFrame(tick)
      if (document.hidden || !onScreen || !runtime.current.active) { previous = time; quality.pause(); return }
      const state = runtime.current
      // Update activity only when drawing it; camera gestures remain immediate.
      const stateKey = `${state.night}-${state.weather}-${state.windMph}-${state.motionRunning}-${state.lightingTime}`
      // RAF timestamps may round two 60 Hz refreshes to 33.3 ms. Accept that
      // boundary instead of waiting a third refresh and falsely detecting load.
      if ((textureDirty || journey || state.motionRunning || stateKey !== atmosphere) && time - rendered >= 1000 / 30 - .5) {
        if (journey) {
          const progress = Math.min(1, (time - journey.start) / 850), ease = progress * progress * (3 - 2 * progress)
          controls.target.lerpVectors(journey.target, journey.destination, ease)
          camera.position.lerpVectors(journey.position, offset.clone().add(journey.destination), ease)
          camera.zoom = THREE.MathUtils.lerp(journey.zoom, journey.destinationZoom, ease)
          updateProjection(); controls.update()
          if (progress === 1) cancelJourney()
        }
        const delta = previous ? Math.min(.08, (time - previous) / 1000) : 0
        previous = time
        world.animate(delta, state.motionRunning, state.night, state.weather, state.lightingTime, state.windMph)
        weatherWorld.setKind(state.weather)
        weatherWorld.animate(time / 1000, state.motionRunning, weatherWind(state.weather, state.windMph))
        // Keep the previous image until the new buffers can be drawn immediately.
        if (resolutionDirty) applyResolution()
        const started = performance.now()
        frame(); rendered = time; atmosphere = stateKey
        if (quality.sample(time, performance.now() - started)) { resolutionDirty = true; textureDirty = true }
      } else if (!textureDirty && !journey && !state.motionRunning) { previous = time; quality.pause() }
    }
    animation = requestAnimationFrame(tick)
    resize()
    setPreparing(false)
    return () => {
      engine.current = null
      observer.disconnect()
      visibility.disconnect()
      cancelAnimationFrame(animation)
      renderer.domElement.removeEventListener('dblclick', reset)
      controls.removeEventListener('change', controlChange)
      controls.removeEventListener('start', cancelJourney)
      controls.dispose()
      beauty.dispose(); occlusion.dispose(); output.dispose(); antialias.dispose(); lens.dispose(); composer.dispose(); disposeEnvironment()
      occlusion.gtaoMaterial.dispose(); occlusion.blendMaterial.dispose()
      weatherWorld.root.removeFromParent()
      weatherWorld.dispose()
      worlds.forEach(cached => cached.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
    }
    let dispose: (() => void) | undefined
    // Paint the sheet and tabs before the first synchronous geometry build.
    const timer = window.setTimeout(() => { dispose = initialize() }, 60)
    return () => { window.clearTimeout(timer); dispose?.() }
  }, [])

  useEffect(() => {
    if (!active) return
    setSelectedId(COURTS[clubId][0].id)
    setPreparing(true)
    const timer = window.setTimeout(() => engine.current?.activate(clubId), 80)
    return () => window.clearTimeout(timer)
  }, [clubId, active])

  useEffect(() => { engine.current?.frame() }, [viewSettings, active])

  function chooseCourt(id: string) { setSelectedId(id); engine.current?.focus(id) }

  return <section className={`atlas-court-view${night ? ' atlas-court-view--night' : ''}${panelOpen ? '' : ' atlas-court-view--panel-closed'}`} aria-label={`${club.name} illustrated court view`}>
    <div ref={host} className="atlas-court-stage">
      {failed && <div className="atlas-court-fallback"><AtlasMiniature place={clubId}/><p>The court miniature is unavailable on this device. The venue details are still here.</p></div>}
    </div>
    {preparing && !failed && <p className="atlas-court-preparing" role="status">Opening {club.name}…</p>}
    <div id="atlas-club-details" className="atlas-court-panel" inert={!panelOpen} aria-hidden={!panelOpen}>
      <button className="atlas-court-back" type="button" onClick={onBack}><Icon name="back" size={16}/> London icons</button>
      <span className="atlas-eyebrow">A COURT-SIDE VIEW / {club.area.toUpperCase()}</span>
      <h3>{club.name}</h3>
      <p className="atlas-court-intro">{club.description}</p>
      <div className="atlas-court-choices" aria-label="Explore courts">{courts.map(court => <button key={court.id} aria-pressed={selected.id === court.id} onClick={() => chooseCourt(court.id)}>{court.name}</button>)}</div>
      <article className="atlas-court-selected"><span>ON THE GRASS</span><h4>{selected.name}</h4><p>{selected.note}</p></article>
      <p className="atlas-court-access">{club.access}</p>
      {event && <div className="atlas-court-event"><span>Next on the calendar</span><strong>{event.name}</strong><small>{tournamentDates(event)}{event.status === 'provisional' ? ' · provisional' : ''}</small></div>}
      <a className="atlas-court-visit" href={club.url} target="_blank" rel="noreferrer">{club.linkLabel}<Icon name="external" size={15}/></a>
      <a className="atlas-court-source" href={club.source} target="_blank" rel="noreferrer">Visitor & location information <Icon name="external" size={13}/></a>
      <a className="atlas-court-source" href={GROUNDS_MAPS[clubId]} target="_blank" rel="noreferrer">Official grounds map <Icon name="external" size={13}/></a>
      <p className="atlas-court-disclaimer">Street, building and court footprints follow OpenStreetMap. Heights, façades and planting are illustrated; check the venue for access.</p>
      {night && <p className="atlas-court-disclaimer">{clubId === 'wimbledon' ? 'Sports lighting is shown on Centre Court and No. 1 Court. Other courts rest after dark.' : 'The grass courts rest after dark; no tournament floodlighting is shown.'} An evening illustration, not live court use.</p>}
    </div>
    <button className="pill atlas-court-panel-toggle" aria-controls="atlas-club-details" aria-expanded={panelOpen} onClick={() => setPanelOpen(open => !open)}><Icon name={panelOpen ? 'layers' : 'court'} size={16}/>{panelOpen ? 'Explore map' : 'Club details'}</button>
    <div className="atlas-court-switch" aria-label="Switch London venue"><button className="atlas-court-switch__home" onClick={onHome} aria-label="Return to Islington map"><span className="atlas-home-dot"/>Islington</button><button aria-pressed={clubId === 'wimbledon'} onClick={() => onSwitch('wimbledon')}>Wimbledon</button><button aria-pressed={clubId === 'queens'} onClick={() => onSwitch('queens')}>Queen’s</button></div>
    <div className="atlas-court-world" aria-label="Miniature atmosphere">
      <LightingControl night={night} time={lightingTime} onTime={onLightingTime} onNight={onNight} open={card === 'time'} onOpenChange={open => setCard(open ? 'time' : null)}/>
      <button onClick={onMotion} aria-label={motionRunning ? 'Pause world' : 'Run world'}><Icon name={motionRunning ? 'pause' : 'play'} size={14}/>{motionRunning ? 'Pause' : 'Run'}</button>
    </div>
    <div className="atlas-quality-control"><QualityControl settings={viewSettings} onChange={onViewSettings} open={card === 'quality'} onOpenChange={open => setCard(open ? 'quality' : null)}/></div>
    <div className="atlas-court-controls" aria-label="Court view controls"><button onClick={() => engine.current?.zoom(1.25)} aria-label="Zoom in">+</button><button onClick={() => engine.current?.zoom(.8)} aria-label="Zoom out">−</button><button onClick={() => engine.current?.reset()} aria-label="Reset court view"><Icon name="reset" size={18}/></button></div>
    <p className="atlas-court-hint">Drag to move · scroll to zoom · double-click to reset</p>
  </section>
}
