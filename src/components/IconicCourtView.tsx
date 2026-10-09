import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { iconicClubs, tournamentDates, type IconicClubId, type Tournament } from '../data/tennisAtlas'
import { AtlasMiniature } from './AtlasMiniature'
import { Icon } from './Icon'
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
  const canopy = new THREE.IcosahedronGeometry(1, 1)
  const tree = (x: number, z: number, size: number, shade: string) => {
    cylinder(x, size * .58, z, size * .12, size * 1.15, '#716849')
    const crown = new THREE.Mesh(canopy, material(shade))
    crown.position.set(x, size * 1.55, z)
    crown.scale.set(size * .8, size * .91, size * .8)
    crown.castShadow = true
    crown.receiveShadow = true
    scene.add(crown)
  }
  const court = (cx: number, cz: number, compact = false) => {
    const width = compact ? 16 : 19, depth = compact ? 32 : 37
    const apronW = width + 11, apronD = depth + 11
    box(cx, .04, cz, apronW + 1, .13, apronD + 1, '#ddd7bd', false)
    box(cx, .13, cz, apronW, .08, apronD, '#326c4c', false)
    box(cx, .2, cz, width, .045, depth, '#5c934e', false)
    for (let i = 0; i < 8; i++) box(cx - width / 2 + (i + .5) * width / 8, .225, cz, width / 8, .006, depth, i % 2 ? '#639a53' : '#5f954f', false)
    const line = (x: number, z: number, w: number, d: number) => box(cx + x, .24, cz + z, w, .015, d, '#f6f2dd', false)
    const halfW = width * .39, halfD = depth * .43
    for (const side of [-1, 1]) {
      line(side * halfW, 0, .15, halfD * 2)
      line(0, side * halfD, halfW * 2, .15)
      line(0, side * halfD * .52, halfW * 2, .13)
      line(side * halfW * .79, 0, .1, halfD * 2)
    }
    line(0, 0, .1, halfD * 1.04)
    box(cx, .77, cz, halfW * 2 + .7, .67, .035, '#dee5db', false)
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

  box(0, -.55, 0, 188, 1, 154, id === 'wimbledon' ? '#9db685' : '#a4b989', false)
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
  } else {
    court(-30, 8); stand(-30, 8, 30, 48, 3)
    court(42, 28, true); court(42, -34, true)
    box(5, .05, 0, 4, .08, 117, '#d6cbb1', false)
    box(-29, 3.8, -55, 51, 7.3, 11, '#966c55')
    box(-29, 7.75, -55, 53, .65, 13, '#4c5844')
    for (let i = -3; i <= 3; i++) {
      box(-29 + i * 6, 4.2, -49.37, 2.1, 2.6, .15, '#d4d6ba', false)
      box(-29 + i * 6, 4.2, -49.24, 1.6, 2.15, .12, '#315b53', false)
    }
    for (const [x, z] of [[-75, -17], [-75, 31], [78, -9], [78, 38], [7, -56]] as const) tree(x, z, 3.2, '#678852')
  }

  scene.add(new THREE.HemisphereLight('#fff7e3', '#587460', 1.4))
  const sun = new THREE.DirectionalLight('#fff7db', 2.2)
  sun.position.set(-60, 105, 42)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -115; sun.shadow.camera.right = 115
  sun.shadow.camera.top = 95; sun.shadow.camera.bottom = -95
  sun.shadow.normalBias = .03
  scene.add(sun)
  return { scene, dispose: () => {
    scene.traverse(object => { if (object instanceof THREE.Mesh && object.geometry !== unitBox && object.geometry !== canopy) object.geometry.dispose() })
    unitBox.dispose(); canopy.dispose(); materials.forEach(value => value.dispose()); sun.shadow.map?.dispose()
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
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }) }
    catch { setFailed(true); return }
    const world = buildScene(clubId)
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
      renderer.render(world.scene, camera)
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
      renderer.setSize(width, height)
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
