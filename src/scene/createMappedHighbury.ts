import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { highburyGeography, highburyCourts, projectPoint } from './courtGeometry.ts'
import { createMiniatureMaterials, cloneWorldArchitecturalFinish, cloneArchitecturalFinish, SHADOW_PROXY_LAYER } from './miniatureMaterials.ts'

const [west, south, east, north] = highburyGeography.bbox
const nw = projectPoint(west, north), se = projectPoint(east, south)
export const mappedHighburyBounds = { minX: nw[0], maxX: se[0], minZ: nw[1], maxZ: se[1] }
export const mappedHighburyCourtBounds = {
  minX: Math.min(...highburyCourts.map(court => court.x - court.width)) - 5,
  maxX: Math.max(...highburyCourts.map(court => court.x + court.width)) + 5,
  minZ: Math.min(...highburyCourts.map(court => court.z - court.depth)) - 5,
  maxZ: Math.max(...highburyCourts.map(court => court.z + court.depth)) + 5,
}
export const mappedHighburyCenter = { x: (nw[0] + se[0]) / 2, z: (nw[1] + se[1]) / 2 }
export const mappedHighburyGroups = [
  { name: 'Courts 9–11 · north-west', courts: highburyCourts.filter(court => court.x < 100) },
  { name: 'Courts 1–8 · east side', courts: highburyCourts.filter(court => court.x >= 100) },
].map(group => ({ name: group.name, x: group.courts.reduce((sum, court) => sum + court.x, 0) / group.courts.length, z: group.courts.reduce((sum, court) => sum + court.z, 0) / group.courts.length, count: group.courts.length }))

/** A consistent geographic scale: one world unit is about ten metres. Snapshot
 * footprints/centre-lines are retained. Heights, road widths and crowns are illustrations.
 * Owns its resources and uses TownMap's existing renderer and light/grade pipeline. */
export function createMappedHighbury() {
  const root = new THREE.Group(); root.name = 'Mapped Highbury'
  const finishes = createMiniatureMaterials()
  const brick = cloneWorldArchitecturalFinish(finishes.brick, '#b5a18a', false, .1)
  const slate = cloneWorldArchitecturalFinish(finishes.slate, '#b8bfba', true, .1)
  const glazing = cloneArchitecturalFinish(finishes.glazing, '#4c6461')
  const trim = new THREE.MeshStandardMaterial({ color: '#d6cdbc', roughness: .95 })
  const lawn = finishes.parkGrass
  const ground = new THREE.MeshStandardMaterial({ color: '#b8b5a8', roughness: 1 })
  const road = new THREE.MeshStandardMaterial({ color: '#858b83', roughness: .96 })
  const path = new THREE.MeshStandardMaterial({ color: '#c4bfac', roughness: 1 })
  const court = new THREE.MeshStandardMaterial({ color: '#548b8a', roughness: .98 })
  const outer = new THREE.MeshStandardMaterial({ color: '#3d7773', roughness: .98 })
  const white = new THREE.MeshStandardMaterial({ color: '#ecebdc', roughness: .9 })
  const steel = new THREE.MeshStandardMaterial({ color: '#56665d', roughness: .8 })
  const trunk = new THREE.MeshStandardMaterial({ color: '#766a53', roughness: 1 })
  const box = new THREE.BoxGeometry(1, 1, 1), transform = new THREE.Object3D()
  const boxes = new Map<THREE.Material, THREE.Matrix4[]>()
  const polygons = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const addBox = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, rotation = 0) => {
    transform.position.set(x, y, z); transform.rotation.set(0, rotation, 0); transform.scale.set(w, h, d); transform.updateMatrix()
    const batch = boxes.get(material) ?? []; batch.push(transform.matrix.clone()); boxes.set(material, batch)
  }
  const collect = (material: THREE.Material, geometry: THREE.BufferGeometry) => {
    const plain = geometry.index ? geometry.toNonIndexed() : geometry
    if (plain !== geometry) geometry.dispose()
    const batch = polygons.get(material) ?? []; batch.push(plain); polygons.set(material, batch)
  }
  const shape = (points: number[][], material: THREE.Material, y: number, height = 0) => {
    const polygon = new THREE.Shape(points.slice(0, -1).map(([x, z]) => new THREE.Vector2(x, -z)))
    const geometry = height ? new THREE.ExtrudeGeometry(polygon, { depth: height, bevelEnabled: false, steps: 1 }) : new THREE.ShapeGeometry(polygon)
    geometry.rotateX(-Math.PI / 2); geometry.translate(0, y, 0); collect(material, geometry)
  }
  addBox(ground, mappedHighburyCenter.x, -.025, mappedHighburyCenter.z, se[0] - nw[0], .04, se[1] - nw[1])
  for (const park of highburyGeography.parks) shape(park.map(([lng, lat]) => projectPoint(lng, lat)), lawn, .002)
  let roadSegments = 0
  for (const street of highburyGeography.roads) {
    const walking = ['footway', 'path', 'pedestrian', 'steps', 'cycleway'].includes(street.kind)
    const width = walking ? .18 : ['primary', 'secondary', 'tertiary'].includes(street.kind) ? .75 : street.kind === 'service' ? .32 : .5
    for (let i = 1; i < street.points.length; i++) {
      const a = projectPoint(...street.points[i - 1] as [number, number]), b = projectPoint(...street.points[i] as [number, number])
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]); if (length < .001) continue
      addBox(walking ? path : road, (a[0] + b[0]) / 2, .004, (a[1] + b[1]) / 2, length, .004, width, -Math.atan2(b[1] - a[1], b[0] - a[0])); roadSegments++
    }
  }
  for (const building of highburyGeography.buildings) {
    const points = building.points.map(([lng, lat]) => projectPoint(lng, lat))
    shape(points, brick, .006, building.height)
    shape(points, slate, building.height + .009)
    // Modest illustrative window relief follows each real wall, preserving its
    // footprint. It supplies scale without claiming a surveyed facade or gate.
    const area = points.slice(1).reduce((sum, p, i) => sum + points[i][0] * p[1] - p[0] * points[i][1], 0)
    const floors = Math.max(1, Math.min(4, Math.round(building.height / .32)))
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz)
      if (length < .36) continue
      const columns = Math.max(1, Math.min(8, Math.floor(length / .4))), sign = area > 0 ? 1 : -1
      const nx = dz / length * sign, nz = -dx / length * sign, angle = -Math.atan2(dz, dx)
      for (let col = 0; col < columns; col++) for (let floor = 0; floor < floors; floor++) {
        const t = (col + .5) / columns, x = a[0] + dx * t, z = a[1] + dz * t
        const y = (floor + .58) * building.height / floors
        addBox(trim, x + nx * .003, y, z + nz * .003, .115, .165, .006, angle)
        addBox(glazing, x + nx * .007, y, z + nz * .007, .083, .13, .003, angle)
      }
    }
  }
  const netGeometry = new THREE.PlaneGeometry(1, 1)
  for (const c of highburyCourts) {
    const position = (x: number, z: number) => ({ x: c.x + x * Math.cos(c.rotation) + z * Math.sin(c.rotation), z: c.z - x * Math.sin(c.rotation) + z * Math.cos(c.rotation) })
    const part = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => { const p = position(x, z); addBox(material, p.x, y, p.z, w, h, d, c.rotation) }
    const w = c.width, d = c.depth, ow = w * 1.46, od = d * 1.32
    part(outer, 0, .008, 0, ow, .005, od); part(court, 0, .012, 0, w, .002, d)
    for (const side of [-1, 1]) {
      part(white, side * w / 2, .014, 0, .008, .001, d)
      part(white, side * w * .375, .014, 0, .008, .001, d)
      part(white, 0, .014, side * d / 2, w, .001, .008)
      part(white, 0, .014, side * d * .27, w * .75, .001, .008)
      part(steel, side * w * .57, .065, 0, .012, .107, .012)
      for (const sideFence of [true, false]) {
        const fence = new THREE.Mesh(netGeometry, finishes.net)
        const p = position(sideFence ? side * ow / 2 : 0, sideFence ? 0 : side * od / 2)
        fence.position.set(p.x, .14, p.z); fence.rotation.y = c.rotation + (sideFence ? Math.PI / 2 : 0); fence.scale.set(sideFence ? od : ow, .26, 1); root.add(fence)
      }
    }
    part(white, 0, .014, 0, .008, .001, d * .54)
    const net = new THREE.Mesh(netGeometry, finishes.net); net.position.set(c.x, .065, c.z); net.rotation.y = c.rotation; net.scale.set(w * 1.12, .1, 1); root.add(net)
    part(white, 0, .116, 0, w * 1.12, .006, .006)
  }
  const crowns: THREE.Matrix4[] = []
  for (const [index, [lng, lat]] of highburyGeography.trees.entries()) {
    const [x, z] = projectPoint(lng, lat), size = .7 + (index % 7) * .055
    addBox(trunk, x, size * .32, z, .025, size * .64, .025)
    transform.position.set(x, size * .8, z); transform.rotation.set(0, index * 2.399, 0); transform.scale.set(size * .43, size * .5, size * .43); transform.updateMatrix(); crowns.push(transform.matrix.clone())
  }
  const batchMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[], shadows = true) => {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);mesh.name=material===court?'Mapped tennis surfaces':material===outer?'Mapped court surroundings':'Mapped detail'; matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix)); mesh.castShadow = shadows; mesh.receiveShadow = true; mesh.computeBoundingSphere(); root.add(mesh); return mesh
  }
  for (const [material, matrices] of boxes) batchMesh(box, material, matrices, material !== white && material !== road && material !== path && material !== ground)
  const leaves = batchMesh(finishes.foliageGeometry, finishes.foliage, crowns, false)
  crowns.forEach((_, index) => leaves.setColorAt(index, new THREE.Color(['#69864f', '#7b9359', '#5b784a', '#82975e'][index % 4])))
  const proxies = batchMesh(finishes.foliageShadowGeometry, finishes.foliageShadowProxy, crowns); proxies.layers.set(SHADOW_PROXY_LAYER); proxies.customDepthMaterial = finishes.foliageShadowDepth
  for (const [material, pieces] of polygons) {
    const geometry = mergeGeometries(pieces); pieces.forEach(piece => piece.dispose())
    if (geometry) { const mesh = new THREE.Mesh(geometry, material);mesh.name=material===brick?'Mapped building footprints':material===slate?'Mapped building roofs':'Mapped park polygons'; mesh.castShadow = material === brick; mesh.receiveShadow = true; root.add(mesh) }
  }
  root.userData.coverage = { buildings: highburyGeography.buildings.length, courts: highburyCourts.length, parkPolygons: highburyGeography.parks.length, trees: crowns.length, roadSegments, checked: highburyGeography.checked }
  return { root, setNight(night: boolean) { glazing.emissiveIntensity = night ? .5 : 0 }, setRain: finishes.setRain, dispose() {
    const geometries = new Set<THREE.BufferGeometry>([box, netGeometry]), materials = new Set<THREE.Material>()
    root.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)) } })
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); finishes.dispose()
  } }
}
