import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { iconicClubs, tournamentDates, type IconicClubId, type Tournament } from '../data/tennisAtlas'
import { AtlasMiniature } from './AtlasMiniature'
import { Icon } from './Icon'
import { createMiniatureMaterials } from '../scene/miniatureMaterials'
import { addSkyEnvironment, scenePixelRatio } from '../scene/renderQuality'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import './IconicCourtView.css'

type CourtStop = { id: string; name: string; note: string; x: number; z: number }

const COURTS: Record<IconicClubId, CourtStop[]> = {
  wimbledon: [
    { id: 'centre', name: 'Centre Court', note: 'The Championships’ principal show court, set inside its familiar green stands.', x: -36, z: 9 },
    { id: 'number-one', name: 'No. 1 Court', note: 'Another major show court in the Wimbledon grounds, with its own surrounding stands.', x: 43, z: -24 },
    { id: 'outer', name: 'Outer courts', note: 'A small illustrated group represents the grass courts beyond the two main show courts.', x: 48, z: 43 },
  ],
  queens: [
    { id: 'centre', name: 'Centre Court', note: 'The grass show court at the heart of the HSBC Championships.', x: -30, z: 8 },
    { id: 'outer', name: 'Outer courts', note: 'A court-side glimpse of the grass courts around the club.', x: 42, z: 28 },
    { id: 'practice', name: 'Practice courts', note: 'The club’s practice-court atmosphere, shown as an illustrative court pair.', x: 43, z: -34 },
  ],
}

type SceneHandle = { focus: (courtId: string) => void; zoom: (factor: number) => void; reset: () => void }

function buildScene(id: IconicClubId) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(id === 'wimbledon' ? '#dce6d4' : '#e5e8d6')
  const unitBox = new THREE.BoxGeometry(1, 1, 1)
  const finishes = createMiniatureMaterials()
  const detailBatches = new Map<THREE.Material, { x: number; y: number; z: number; w: number; h: number; d: number; angle: number }[]>()
  const detail = (x: number, y: number, z: number, w: number, h: number, d: number, surface: THREE.Material, angle = 0) => {
    const batch = detailBatches.get(surface) ?? []
    batch.push({ x, y, z, w, h, d, angle })
    detailBatches.set(surface, batch)
  }
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const material = (colour: string) => {
    let value = materials.get(colour)
    if (!value) { value = new THREE.MeshStandardMaterial({ color: colour, roughness: .94 }); materials.set(colour, value) }
    return value
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, colour: string, shadow = true) => {
    const mesh = new THREE.Mesh(unitBox, material(colour))
    mesh.position.set(x, y, z)
    mesh.scale.set(w, h, d)
    mesh.castShadow = shadow
    mesh.receiveShadow = true
    scene.add(mesh)
    return mesh
  }
  const cylinder = (x: number, y: number, z: number, radius: number, height: number, colour: string) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 9), material(colour))
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
  }
  const canopy = finishes.foliageGeometry
  const tree = (x: number, z: number, size: number, shade: string) => {
    cylinder(x, size * .58, z, size * .12, size * 1.15, '#716849')
    const species = Math.floor(Math.abs(Math.sin(x * 1.7 + z * .9)) * 3)
    const surface = finishes.foliage.clone()
    surface.color.set(shade)
    const crowns = new THREE.InstancedMesh(canopy, surface, 12)
    const transform = new THREE.Object3D()
    for (let lobe = 0; lobe < 12; lobe++) {
      const angle = lobe * 2.399 + x, outer = lobe > 6
      const ring = lobe === 0 ? 0 : size * (outer ? .78 : .46)
      const radius = size * (lobe === 0 ? .72 : outer ? .27 : .48)
      transform.position.set(x + Math.cos(angle) * ring, size * (outer ? 1.45 + lobe * .025 : 1.38 + (lobe % 3) * .16), z + Math.sin(angle) * ring)
      transform.scale.set(radius, radius * (species === 1 ? 1.4 : species === 2 ? .72 : 1), radius)
      transform.rotation.set(0, angle, 0)
      transform.updateMatrix()
      crowns.setMatrixAt(lobe, transform.matrix)
    }
    crowns.castShadow = true; crowns.receiveShadow = true
    scene.add(crowns)
    for (let branch = 0; branch < 4; branch++) {
      const angle = branch * Math.PI / 2 + x
      detail(x + Math.cos(angle) * size * .25, size * 1.1, z + Math.sin(angle) * size * .25, size * .85, size * .07, size * .08, material('#716849'), -angle)
    }
  }
  // Local facade relief matches the town treatment without moving any court.
  const facade = (cx: number, cz: number, width: number, height: number, depth: number) => {
    const trim = material('#e6ded0'), glass = material('#465e65'), metal = material('#394e44')
    const columns = Math.max(2, Math.floor(width / 3))
    for (const side of [-1, 1]) {
      const front = cz + side * (depth / 2 + .12)
      for (const y of [.3, height - .2, height * .52]) detail(cx, y, front, width + .2, .16, .24, trim)
      for (let col = 0; col < columns; col++) {
        const x = cx + (col + .5) * width / columns - width / 2
        for (let floor = 0; floor < Math.max(1, Math.floor(height / 2.2)); floor++) {
          const y = 1.25 + floor * 2.1
          detail(x, y, front, 1.25, 1.55, .18, trim)
          detail(x, y, front + side * .12, .96, 1.25, .06, glass)
          detail(x, y, front + side * .17, .045, 1.3, .04, trim)
          detail(x, y, front + side * .17, 1.02, .055, .04, trim)
          detail(x, y - .78, front, 1.4, .12, .42, trim)
        }
      }
      detail(cx - width * .45, height / 2, front + side * .16, .09, height, .09, metal)
      detail(cx, .65, front + side * 1.35, width, .06, .06, metal)
      for (let post = 0; post <= columns * 3; post++) detail(cx - width / 2 + post * width / (columns * 3), .38, front + side * 1.35, .04, .65, .04, metal)
    }
    for (const side of [-1, 1]) {
      detail(cx + side * width * .32, height + .5, cz, .85, 1.4, .85, finishes.brick)
      detail(cx + side * width * .32, height + 1.23, cz, 1.05, .15, 1.05, trim)
      detail(cx + side * width * .32, height + 1.5, cz, .22, .48, .22, finishes.brick)
    }
  }
  const court = (cx: number, cz: number, compact = false) => {
    const width = compact ? 16 : 19, depth = compact ? 32 : 37
    const apronW = width + 11, apronD = depth + 11
    box(cx, .04, cz, apronW + 1, .13, apronD + 1, '#ddd7bd', false)
    box(cx, .13, cz, apronW, .08, apronD, '#326c4c', false)
    const turf=box(cx, .2, cz, width, .045, depth, '#5c934e', false);turf.material=finishes.parkGrass
    for (let i = 0; i < 8; i++) {
      const stripe=box(cx - width / 2 + (i + .5) * width / 8, .225, cz, width / 8, .006, depth, i % 2 ? '#639a53' : '#5f954f', false)
      const surface=finishes.parkGrass.clone();surface.color.set(i % 2 ? '#639a53' : '#5f954f');stripe.material=surface
    }
    const line = (x: number, z: number, w: number, d: number) => box(cx + x, .24, cz + z, w, .015, d, '#f6f2dd', false)
    const halfW = width * .39, halfD = depth * .43
    for (const side of [-1, 1]) {
      line(side * halfW, 0, .15, halfD * 2)
      line(0, side * halfD, halfW * 2, .15)
      line(0, side * halfD * .52, halfW * 2, .13)
      line(side * halfW * .79, 0, .1, halfD * 2)
    }
    line(0, 0, .1, halfD * 1.04)
    const net=box(cx, .77, cz, halfW * 2 + .7, .67, .035, '#dee5db', false);net.material=finishes.net
    box(cx, 1.13, cz, halfW * 2 + .9, .07, .08, '#f8f6e8', false)
    for (const side of [-1, 1]) cylinder(cx + side * (halfW + .45), .61, cz, .07, 1.2, '#405f4d')
    // Slim perimeter posts give the courts depth without filling the scene with mesh.
    for (const side of [-1, 1]) {
      for (let i = -2; i <= 2; i++) box(cx + side * apronW / 2, 1.1, cz + i * apronD / 4, .1, 2.1, .1, '#526a55')
      box(cx + side * apronW / 2, 1.9, cz, .045, .045, apronD, '#728871', false)
    }
  }
  const stand = (cx: number, cz: number, width: number, depth: number, tier: number, roof = false) => {
    const green = id === 'wimbledon' ? '#315c48' : '#416449'
    for (let row = 0; row < tier; row++) {
      const spread = row * 2.1
      const rise = .7 + row * .61
      box(cx - width / 2 - 2.1 - spread, rise, cz, 1.8, .56, depth + 6 + spread * 2, row % 2 ? '#6c8064' : green)
      box(cx + width / 2 + 2.1 + spread, rise, cz, 1.8, .56, depth + 6 + spread * 2, row % 2 ? '#6c8064' : green)
      box(cx, rise, cz - depth / 2 - 2.1 - spread, width + 6 + spread * 2, .56, 1.8, row % 2 ? '#6c8064' : green)
      box(cx, rise, cz + depth / 2 + 2.1 + spread, width + 6 + spread * 2, .56, 1.8, row % 2 ? '#6c8064' : green)
    }
    if (roof) {
      const spread = tier * 2.1 + 2
      const y = tier * .61 + 1.2
      box(cx - width / 2 - spread, y, cz, 2.7, .3, depth + spread * 2, '#e8e6d5')
      box(cx + width / 2 + spread, y, cz, 2.7, .3, depth + spread * 2, '#e8e6d5')
      box(cx, y, cz - depth / 2 - spread, width + spread * 2, .3, 2.7, '#e8e6d5')
      box(cx, y, cz + depth / 2 + spread, width + spread * 2, .3, 2.7, '#e8e6d5')
    }
  }

  const ground=box(0, -.55, 0, 188, 1, 154, id === 'wimbledon' ? '#9db685' : '#a4b989', false);ground.material=finishes.grass
  for (const z of [-64, 68]) box(0, .015, z, 176, .04, 3, '#d5d3b6', false)
  for (const x of [-84, 85]) box(x, .015, 0, 3, .04, 134, '#d5d3b6', false)
  for (const [x, z, size, shade] of [
    [-79, -57, 4.1, '#6a8955'], [-69, -57, 3.2, '#75965c'], [-75, 53, 4.6, '#5c8050'],
    [-60, 65, 3.7, '#77945b'], [80, -57, 3.7, '#5b8050'], [73, 61, 4.2, '#6f8f55'],
    [87, 43, 3.1, '#658653'], [-3, 61, 3.4, '#618452'], [5, -57, 3.7, '#76945a'],
  ] as const) tree(x, z, size, shade)

  if (id === 'wimbledon') {
    court(-36, 9); stand(-36, 9, 30, 48, 5, true)
    court(43, -24); stand(43, -24, 30, 48, 3, true)
    court(35, 45, true); court(62, 45, true)
    box(-3, .05, 10, 4.3, .08, 113, '#d8d2b8', false)
    box(0, .05, -55, 113, .08, 3.5, '#d8d2b8', false)
    box(-71, 2.2, -52, 16, 4.3, 9, '#c9b797')
    box(-71, 4.55, -52, 17, .5, 10, '#415944')
    facade(-71, -52, 16, 4.3, 9)
  } else {
    court(-30, 8); stand(-30, 8, 30, 48, 3)
    court(42, 28, true); court(42, -34, true)
    box(5, .05, 0, 4, .08, 117, '#d6cbb1', false)
    box(-29, 3.8, -55, 51, 7.3, 11, '#966c55')
    box(-29, 7.75, -55, 53, .65, 13, '#4c5844')
    facade(-29, -55, 51, 7.3, 11)
    for (let i = -3; i <= 3; i++) {
      box(-29 + i * 6, 4.2, -49.37, 2.1, 2.6, .15, '#d4d6ba', false)
      box(-29 + i * 6, 4.2, -49.24, 1.6, 2.15, .12, '#315b53', false)
    }
    for (const [x, z] of [[-75, -17], [-75, 31], [78, -9], [78, 38], [7, -56]] as const) tree(x, z, 3.2, '#678852')
  }

  // The surroundings are illustrative; do not place a fictitious railway in the club grounds.
  for (let i = 0; i < 11; i++) {
    const x = -75 + i * 14
    const height = 4.8 + (i % 3) * .55
    box(x, height / 2, -72, 10.5, height, 5.5, i % 2 ? '#b9997f' : '#ad816a')
    box(x, height + .25, -72, 11, .5, 6, '#415944')
    facade(x, -72, 10.5, height, 5.5)
  }
  for (let i = 0; i < 12; i++) {
    const z = -49 + i * 9.5
    tree(-89, z, 2.7 + (i % 3) * .4, i % 2 ? '#769354' : '#64814a')
    tree(90, z, 2.5 + (i % 4) * .3, i % 2 ? '#8da260' : '#6d8b4d')
  }
  for (const [surface, batch] of detailBatches) {
    const group = new THREE.InstancedMesh(unitBox, surface, batch.length)
    const transform = new THREE.Object3D()
    batch.forEach((item, index) => {
      transform.position.set(item.x, item.y, item.z)
      transform.scale.set(item.w, item.h, item.d)
      transform.rotation.set(0, item.angle, 0)
      transform.updateMatrix(); group.setMatrixAt(index, transform.matrix)
    })
    group.castShadow = true; group.receiveShadow = true
    scene.add(group)
  }

  scene.add(new THREE.HemisphereLight('#fff7e3', '#587460', 1.4))
  const sun = new THREE.DirectionalLight('#fff7db', 2.2)
  sun.position.set(-60, 105, 42)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -115; sun.shadow.camera.right = 115
  sun.shadow.camera.top = 95; sun.shadow.camera.bottom = -95
  sun.shadow.normalBias = .03
  scene.add(sun)
  return { scene, dispose: () => {
    const geometries = new Set<THREE.BufferGeometry>(), surfaces = new Set<THREE.Material>()
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      geometries.add(object.geometry)
      for (const surface of Array.isArray(object.material) ? object.material : [object.material]) surfaces.add(surface)
    })
    geometries.forEach(value => value.dispose()); surfaces.forEach(value => value.dispose())
    materials.forEach(value => { if(!surfaces.has(value))value.dispose() })
    finishes.dispose(); sun.shadow.map?.dispose()
  } }
}

export function IconicCourtView({ clubId, event, onBack, onSwitch }: { clubId: IconicClubId; event?: Tournament; onBack: () => void; onSwitch: (id: IconicClubId) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const pins = useRef(new Map<string, HTMLButtonElement>())
  const engine = useRef<SceneHandle | null>(null)
  const [failed, setFailed] = useState(false)
  const [selectedId, setSelectedId] = useState(COURTS[clubId][0].id)
  const club = iconicClubs.find(item => item.id === clubId)!
  const courts = COURTS[clubId]
  const selected = courts.find(item => item.id === selectedId) ?? courts[0]

  useEffect(() => {
    const element = host.current
    if (!element) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }) }
    catch { setFailed(true); return }
    const world = buildScene(clubId)
    const disposeEnvironment=addSkyEnvironment(renderer,world.scene)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.className = 'atlas-court-canvas'
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute('aria-label', `Illustrated interactive courts at ${club.name}. Drag to pan, scroll to zoom, right-drag to rotate.`)
    element.appendChild(renderer.domElement)
    const camera = new THREE.OrthographicCamera(-105, 105, 75, -75, .1, 600)
    const composer=new EffectComposer(renderer)
    const beauty=new RenderPass(world.scene,camera)
    const occlusion=new GTAOPass(world.scene,camera,1,1)
    occlusion.updateGtaoMaterial({radius:1.2,thickness:1,distanceExponent:1.5,distanceFallOff:1,scale:1,samples:8,screenSpaceRadius:false})
    occlusion.updatePdMaterial({lumaPhi:5,depthPhi:1,normalPhi:3,radius:4,samples:8})
    occlusion.blendIntensity=.32
    const output=new OutputPass()
    composer.addPass(beauty);composer.addPass(occlusion);composer.addPass(output)
    const sizeOcclusion=occlusion.setSize.bind(occlusion)
    occlusion.setSize=(w:number,h:number)=>{
      const ratio=Math.min(.65,Math.sqrt(1200000/(w*h)))
      sizeOcclusion(Math.max(1,Math.ceil(w*ratio)),Math.max(1,Math.ceil(h*ratio)))
    }
    const overview = new THREE.Vector3(0, 0, 0)
    const offset = new THREE.Vector3(115, 145, 155)
    camera.position.copy(offset)
    camera.lookAt(overview)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = false
    controls.minZoom = .7
    controls.maxZoom = 4
    controls.maxPolarAngle = Math.PI * .44
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }
    const frame = () => {
      composer.render()
      for (const stop of courts) {
        const button = pins.current.get(stop.id)
        if (!button) continue
        const point = new THREE.Vector3(stop.x, 2, stop.z).project(camera)
        button.style.left = `${(point.x + 1) * 50}%`
        button.style.top = `${(1 - point.y) * 50}%`
        button.hidden = point.z > 1 || point.x < -1 || point.x > 1 || point.y < -1 || point.y > 1
      }
    }
    const resize = () => {
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight)
      const span = Math.max(145, 188 * height / width)
      camera.left = -span * width / height / 2
      camera.right = -camera.left
      const lift = width < 760 ? span * .16 : 0
      camera.top = span / 2 - lift
      camera.bottom = -span / 2 - lift
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(scenePixelRatio(width,height,window.devicePixelRatio||1))
      renderer.setSize(width, height)
      composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(width,height)
      frame()
    }
    const reset = () => { camera.position.copy(offset); controls.target.copy(overview); camera.zoom = 1; camera.updateProjectionMatrix(); controls.update(); frame() }
    const focus = (courtId: string) => {
      const stop = courts.find(item => item.id === courtId)
      if (!stop) return
      const target = new THREE.Vector3(stop.x, 0, stop.z)
      camera.position.copy(offset).add(target)
      controls.target.copy(target)
      camera.zoom = 1.75
      camera.updateProjectionMatrix()
      controls.update(); frame()
    }
    const zoom = (factor: number) => { camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom); camera.updateProjectionMatrix(); frame() }
    engine.current = { focus, zoom, reset }
    controls.addEventListener('change', frame)
    renderer.domElement.addEventListener('dblclick', reset)
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()
    return () => {
      engine.current = null
      observer.disconnect()
      renderer.domElement.removeEventListener('dblclick', reset)
      controls.removeEventListener('change', frame)
      controls.dispose()
      beauty.dispose();occlusion.dispose();output.dispose();composer.dispose()
      occlusion.gtaoMaterial.dispose();occlusion.blendMaterial.dispose()
      disposeEnvironment()
      world.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [clubId, club.name, courts])

  function chooseCourt(id: string) { setSelectedId(id); engine.current?.focus(id) }

  return <section className="atlas-court-view" aria-label={`${club.name} illustrated court view`}>
    <div ref={host} className="atlas-court-stage">
      {failed && <div className="atlas-court-fallback"><AtlasMiniature place={clubId}/><p>The court miniature is unavailable on this device. The venue details are still here.</p></div>}
      {!failed && courts.map((court, index) => <button key={court.id} ref={node => { if (node) pins.current.set(court.id, node); else pins.current.delete(court.id) }} className="atlas-court-pin" type="button" aria-label={`Explore ${court.name}`} aria-pressed={selectedId === court.id} onClick={() => chooseCourt(court.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{court.name}</strong></button>)}
    </div>
    <div className="atlas-court-panel">
      <button className="atlas-court-back" type="button" onClick={onBack}><Icon name="back" size={16}/> London icons</button>
      <span className="atlas-eyebrow">A COURT-SIDE VIEW / {club.area.toUpperCase()}</span>
      <h3>{club.name}</h3>
      <p className="atlas-court-intro">{club.description}</p>
      <div className="atlas-court-choices" aria-label="Explore courts">{courts.map(court => <button key={court.id} aria-pressed={selectedId === court.id} onClick={() => chooseCourt(court.id)}>{court.name}</button>)}</div>
      <article className="atlas-court-selected"><span>ON THE GRASS</span><h4>{selected.name}</h4><p>{selected.note}</p></article>
      <p className="atlas-court-access">{club.access}</p>
      {event && <div className="atlas-court-event"><span>Next on the calendar</span><strong>{event.name}</strong><small>{tournamentDates(event)}{event.status === 'provisional' ? ' · provisional' : ''}</small></div>}
      <a className="atlas-court-visit" href={club.url} target="_blank" rel="noreferrer">{club.linkLabel}<Icon name="external" size={15}/></a>
      <a className="atlas-court-source" href={club.source} target="_blank" rel="noreferrer">Visitor & location information <Icon name="external" size={13}/></a>
      <p className="atlas-court-disclaimer">Illustrated courts, not a measured site plan or a live view. Check the venue for access.</p>
    </div>
    <div className="atlas-court-switch" aria-label="Switch London venue"><button aria-pressed={clubId === 'wimbledon'} onClick={() => onSwitch('wimbledon')}>Wimbledon</button><button aria-pressed={clubId === 'queens'} onClick={() => onSwitch('queens')}>Queen’s</button></div>
    <div className="atlas-court-controls" aria-label="Court view controls"><button onClick={() => engine.current?.zoom(1.25)} aria-label="Zoom in">+</button><button onClick={() => engine.current?.zoom(.8)} aria-label="Zoom out">−</button><button onClick={() => engine.current?.reset()} aria-label="Reset court view"><Icon name="reset" size={18}/></button></div>
    <p className="atlas-court-hint">Drag to move · scroll to zoom · double-click to reset</p>
  </section>
}
