import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'
import { createTown, geoPosition } from '../scene/createTown'
import type { MapVenue, TownWorld } from '../scene/types'
import { mappedServices } from '../data/hub'
import { busRoutes } from '../data/busRoutes'
import { createWeather, type WeatherSceneKind } from '../scene/createWeather'
import { courtAreas } from '../scene/courtGeometry'
import { mapStations } from '../data/transit'
import { Icon } from './Icon'
import { updateSceneLight, weatherWind } from '../scene/sceneAtmosphere'
import { addSkyEnvironment, scenePixelRatio, createLensFinish } from '../scene/renderQuality'
import '../scene/TownMap.css'

export interface TownMapHandle {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  rotate: () => void
  visitCourt: (id: string) => void
  locate: (lat: number, lng: number) => void
  visitVan: () => void
  followRoute: (id: string) => void
}

interface TownMapProps {
  venues: MapVenue[]
  selectedId: string | null
  coachingPins?: boolean
  playCounts?: Record<string, number>
  onSelect: (id: string) => void
  visibleIds: string[]
  night: boolean
  lightingTime: number | null
  weather: WeatherSceneKind
  showTransit: boolean
  trainRunning: boolean
  activityRunning: boolean
  showBuses: boolean
  busRouteId: string | null
  showShops: boolean
  selectedServiceId: string | null
  activeVisitId: string | null
  onSelectService: (id: string) => void
  onReset?: () => void
  onReady?: () => void
}

interface SceneHandle {
  camera: THREE.OrthographicCamera
  controls: OrbitControls
  scene: THREE.Scene
  world: TownWorld
  sunlight: THREE.DirectionalLight
  ambient: THREE.HemisphereLight
  renderer: THREE.WebGLRenderer
  reset: () => void
  resize: () => void
  frame: () => void
  focus: (point: THREE.Vector3) => void
  travel: (point: THREE.Vector3, zoom: number) => void
  cancelTravel: () => void
  visitCourt: (id: string) => void
}

const STATION_NAMES = mapStations.map(s=>s.name)
const CAMERA_OFFSET = new THREE.Vector3(275, 480, 475)
const DAY_BACKGROUND = '#b8bca8'

export const TownMap = forwardRef<TownMapHandle, TownMapProps>(function TownMap({ venues, selectedId, playCounts, coachingPins, onSelect, visibleIds, night, lightingTime, weather, showTransit, trainRunning, activityRunning, showBuses, busRouteId, showShops, selectedServiceId, activeVisitId, onSelectService, onReset, onReady }, forwardedRef) {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<SceneHandle | null>(null)
  const markerRefs = useRef(new Map<string, HTMLButtonElement>())
  const stationRefs = useRef(new Map<string, HTMLDivElement>())
  const vanRef=useRef<HTMLButtonElement>(null)
  const shopRefs = useRef(new Map<string, HTMLButtonElement>())
  const runtimeRef = useRef({ selectedServiceId, night, lightingTime, weather, showTransit, trainRunning, activityRunning, showBuses, showShops, selectedId, activeVisitId, visibleIds, onReset, onReady })
  runtimeRef.current = { selectedServiceId, night, lightingTime, weather, showTransit, trainRunning, activityRunning, showBuses, showShops, selectedId, activeVisitId, visibleIds, onReset, onReady }
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [moving, setMoving] = useState(false)

  useImperativeHandle(forwardedRef, () => ({
    visitVan(){const e=engineRef.current;if(e)e.travel(e.world.vanPosition.clone(),9);},
    zoomIn() {
      const engine = engineRef.current
      if (!engine) return
      engine.cancelTravel()
      engine.camera.zoom = Math.min(60, engine.camera.zoom * 1.3)
      engine.camera.updateProjectionMatrix()
      engine.frame()
    },
    zoomOut() {
      const engine = engineRef.current
      if (!engine) return
      engine.cancelTravel()
      engine.camera.zoom = Math.max(.55, engine.camera.zoom / 1.3)
      engine.camera.updateProjectionMatrix()
      engine.frame()
    },
    reset() { engineRef.current?.reset() },
    visitCourt(id) { engineRef.current?.visitCourt(id) },
    locate(lat,lng) { engineRef.current?.travel(geoPosition(lat,lng),2.8) },
    followRoute(id) {
      const route=busRoutes.find(r=>r.id===id)
      if(!route)return
      const points=route.points.map(([lng,lat])=>geoPosition(lat,lng))
      if(!points.length)return
      const bounds=new THREE.Box3().setFromPoints(points)
      engineRef.current?.travel(bounds.getCenter(new THREE.Vector3()),.95)
    },
    rotate() {
      const engine = engineRef.current
      if (!engine) return
      engine.cancelTravel()
      const offset = engine.camera.position.clone().sub(engine.controls.target)
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6)
      engine.camera.position.copy(engine.controls.target).add(offset)
      engine.controls.update()
      engine.frame()
    },
  }), [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    } catch {
      setFailed(true)
      runtimeRef.current.onReady?.()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = runtimeRef.current.night ? .86 : 1
    renderer.domElement.className = 'town-map__canvas'
    renderer.domElement.setAttribute('aria-label', 'Interactive miniature map of Islington. Drag to pan, scroll or pinch to zoom, right-drag to rotate. Select court markers to discover venues.')
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.tabIndex = 0
    host.prepend(renderer.domElement)

    const scene = new THREE.Scene()
    const disposeEnvironment=addSkyEnvironment(renderer,scene)
    scene.environmentIntensity=runtimeRef.current.night?.07:.28
    scene.background = new THREE.Color(runtimeRef.current.night ? '#253940' : DAY_BACKGROUND)
    scene.fog = new THREE.Fog(runtimeRef.current.night ? '#253940' : DAY_BACKGROUND, 900, 1900)
    const camera = new THREE.OrthographicCamera(-300, 300, 200, -200, 1, 2400)
    const ambient = new THREE.HemisphereLight(runtimeRef.current.night ? '#a9bfda' : '#f7f2e9', runtimeRef.current.night ? '#263d44' : '#59634f', runtimeRef.current.night ? .95 : .88)
    scene.add(ambient)
    const sunlight = new THREE.DirectionalLight(runtimeRef.current.night ? '#b7cde4' : '#fff0dc', runtimeRef.current.night ? .8 : 2.8)
    sunlight.position.set(-240, 300, 185)
    sunlight.castShadow = true
    sunlight.shadow.mapSize.set(4096, 4096)
    sunlight.shadow.camera.left = -500
    sunlight.shadow.camera.right = 500
    sunlight.shadow.camera.top = 600
    sunlight.shadow.camera.bottom = -600
    sunlight.shadow.camera.far = 1200
    sunlight.shadow.normalBias = .055
    sunlight.shadow.bias = -.00025
    sunlight.shadow.radius = 2
    scene.add(sunlight, sunlight.target)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    controls.dampingFactor = .1
    controls.screenSpacePanning = false
    controls.minPolarAngle = Math.PI / 7
    controls.maxPolarAngle = Math.PI / 2.65
    controls.minZoom = .55
    controls.maxZoom = 60
    controls.panSpeed = 1
    controls.rotateSpeed = .5
    controls.zoomSpeed = .65
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }

    let needsFrame = true
    const world = createTown(venues, () => { needsFrame = true })
    scene.add(world.root)
    world.setNight(runtimeRef.current.night)
    const weatherWorld=createWeather();scene.add(weatherWorld.root)
    const weatherClearance=courtAreas(venues).flatMap(area=>{
      const c=Math.cos(area.rotation),s=Math.sin(area.rotation)
      return [[0,0],[-area.halfWidth,-area.halfDepth],[-area.halfWidth,area.halfDepth],[area.halfWidth,-area.halfDepth],[area.halfWidth,area.halfDepth]].map(([x,z])=>new THREE.Vector3(area.x+x*c+z*s,0,area.z-x*s+z*c))
    })
    // Ground the miniature with subtle contact occlusion. Colour stays at display
    // resolution, while the more expensive depth/AO buffers have a separate cap.
    const composer=new EffectComposer(renderer)
    const beauty=new RenderPass(scene,camera)
    const occlusion=new GTAOPass(scene,camera,1,1)
    occlusion.updateGtaoMaterial({radius:1.6,distanceExponent:1.5,thickness:1.2,distanceFallOff:1,scale:1,samples:host.clientWidth>760?16:8,screenSpaceRadius:false})
    occlusion.updatePdMaterial({lumaPhi:5,depthPhi:1,normalPhi:3,radius:4,samples:8})
    const sizeOcclusion=occlusion.setSize.bind(occlusion)
    occlusion.setSize=(w:number,h:number)=>{
      const ratio=Math.min(host.clientWidth>760?.8:.55,Math.sqrt(1800000/(w*h)))
      sizeOcclusion(Math.max(1,Math.ceil(w*ratio)),Math.max(1,Math.ceil(h*ratio)))
    }
    const transparentObjects:THREE.Object3D[]=[]
    world.root.traverse(object=>{
      const mesh=object as THREE.Mesh
      if(mesh.isMesh&&[mesh.material].flat().some(material=>material.transparent)||object instanceof THREE.Sprite)transparentObjects.push(object)
    })
    const drawOcclusion=occlusion.render.bind(occlusion)
    occlusion.render=(renderer,writeBuffer,readBuffer)=>{
      const weatherVisible=weatherWorld.root.visible
      const visible=transparentObjects.filter(object=>object.visible)
      weatherWorld.root.visible=false;visible.forEach(object=>{object.visible=false})
      try{drawOcclusion(renderer,writeBuffer,readBuffer,0,false)}
      finally{weatherWorld.root.visible=weatherVisible;visible.forEach(object=>{object.visible=true})}
    }
    const output=new OutputPass()
    const antialias=new ShaderPass(FXAAShader)
    const lens=new ShaderPass(createLensFinish())
    composer.addPass(beauty);composer.addPass(occlusion);composer.addPass(output);composer.addPass(antialias);composer.addPass(lens)
    let width = host.clientWidth, height = host.clientHeight
    let animation = 0
    let destroyed = false
    let onScreen = true
    const projection = new THREE.Vector3()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const raycaster = new THREE.Raycaster()
    let journey: {start:number;fromPosition:THREE.Vector3;toPosition:THREE.Vector3;fromTarget:THREE.Vector3;toTarget:THREE.Vector3;fromZoom:number;toZoom:number}|null=null
    const cancelTravel=()=>{journey=null}
    const visibleMapFrame=()=>{
      const mobile=width<=760, bounds=host.getBoundingClientRect()
      const panel=host.parentElement?.querySelector('.directory-panel')?.getBoundingClientRect()
      const panelVisible=!!panel&&!host.parentElement?.classList.contains('panel-closed')&&panel.top<bounds.bottom-5&&!runtimeRef.current.activeVisitId
      const left=!mobile&&panelVisible?panel!.right-bounds.left+28:24
      const right=width-(mobile?65:96)
      const top=mobile?156:112
      const bottom=mobile&&panelVisible?panel!.top-bounds.top-28:height-112
      return {left,right,top,bottom:Math.max(top+100,bottom)}
    }
    const travel=(point:THREE.Vector3,zoom:number,immediate=false)=>{
      const available=visibleMapFrame()
      const x=(available.left+available.right)/2, y=(available.top+available.bottom)/2
      const offset=CAMERA_OFFSET
      const previewCamera=camera.clone()
      previewCamera.position.copy(point).add(offset)
      previewCamera.lookAt(point)
      previewCamera.zoom=zoom
      previewCamera.updateProjectionMatrix();previewCamera.updateMatrixWorld()
      raycaster.setFromCamera(new THREE.Vector2(x/width*2-1,1-y/height*2),previewCamera)
      const underCursor=new THREE.Vector3()
      if(!raycaster.ray.intersectPlane(ground,underCursor))return
      const target=point.clone().add(point.clone().sub(underCursor)).setY(0)
      const position=target.clone().add(offset)
      if(reducedMotion.matches||immediate){
        cancelTravel()
        camera.position.copy(position);controls.target.copy(target);camera.zoom=zoom
        camera.updateProjectionMatrix();controls.update();frame();return
      }
      journey={start:performance.now(),fromPosition:camera.position.clone(),toPosition:position,fromTarget:controls.target.clone(),toTarget:target,fromZoom:camera.zoom,toZoom:zoom}
      needsFrame=true
    }
    const visitCourt=(id:string,immediate=false)=>{
      const venue=venues.find(item=>item.id===id)
      if(!venue)return
      const points:THREE.Vector3[]=[]
      for(const area of courtAreas([venue])){
        const c=Math.cos(area.rotation),s=Math.sin(area.rotation)
        for(const x of [-area.halfWidth,area.halfWidth])for(const z of [-area.halfDepth,area.halfDepth])for(const y of [0,7]){
          points.push(new THREE.Vector3(area.x+x*c+z*s,y,area.z-x*s+z*c))
        }
      }
      if(!points.length)return
      const center=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3()).setY(0)
      const preview=camera.clone();preview.position.copy(center).add(CAMERA_OFFSET);preview.lookAt(center);preview.zoom=1
      preview.updateProjectionMatrix();preview.updateMatrixWorld()
      const projected=points.map(point=>point.clone().project(preview))
      const minX=Math.min(...projected.map(p=>p.x)),maxX=Math.max(...projected.map(p=>p.x))
      const minY=Math.min(...projected.map(p=>p.y)),maxY=Math.max(...projected.map(p=>p.y))
      const spanX=(maxX-minX)*width/2,spanY=(maxY-minY)*height/2
      // An irregular group of courts has a different projected centre from its
      // world-axis box. Fit the visible enclosure, including the floodlights.
      const framedCenter=center.clone()
      raycaster.setFromCamera(new THREE.Vector2((minX+maxX)/2,(minY+maxY)/2),preview)
      raycaster.ray.intersectPlane(ground,framedCenter)
      const available=visibleMapFrame()
      const zoom=Math.min((available.right-available.left)*.88/spanX,(available.bottom-available.top)*.82/spanY)
      travel(framedCenter,THREE.MathUtils.clamp(zoom,.7,18),immediate)
    }
    const focus = (point: THREE.Vector3) => {
      camera.updateMatrixWorld()
      const mobile = width <= 760
      const panel = host.parentElement?.querySelector('.directory-panel')
      const panelBox = panel?.getBoundingClientRect()
      const bounds = host.getBoundingClientRect()
      const panelVisible = !!panelBox && !host.parentElement?.classList.contains('panel-closed') && panelBox.top < bounds.bottom - 5
      const left = mobile ? 35 : panelBox && panelVisible ? panelBox.right - bounds.left + 60 : width * .3
      const right = width - (mobile ? 65 : 105)
      const top = mobile ? 140 : 130
      const bottom = mobile && panelVisible ? Math.max(top + 50, panelBox!.top - bounds.top - 80) : height - 135
      const projected = point.clone().project(camera)
      const currentX = (projected.x * .5 + .5) * width
      const currentY = (-projected.y * .5 + .5) * height
      if (currentX >= left && currentX <= right && currentY >= top && currentY <= bottom) return
      const targetX = (left + right) / 2
      const targetY = (top + bottom) / 2
      raycaster.setFromCamera(new THREE.Vector2(targetX / width * 2 - 1, 1 - targetY / height * 2), camera)
      const visibleGround = new THREE.Vector3()
      if (!raycaster.ray.intersectPlane(ground, visibleGround)) return
      const delta = point.clone().setY(0).sub(visibleGround)
      controls.target.add(delta)
      camera.position.add(delta)
      controls.update()
      frame()
    }
    const reset = () => {
      cancelTravel()
      const mobile=width<=760
      const highbury=world.courtFocusAnchors.get('highbury-fields')??geoPosition(51.55122,-.09902)
      const showcase=highbury.clone().add(new THREE.Vector3(0,0,0))
      travel(showcase,mobile?1.9:3.1,true)
    }
    const resize = () => {
      const wasMobile = width <= 760
      const changed=width!==host.clientWidth||height!==host.clientHeight
      width = host.clientWidth; height = host.clientHeight
      if (!width || !height) return
      const aspect = width / height
      const halfHeight = width <= 760 ? 220 : 210
      camera.left = -halfHeight * aspect
      camera.right = halfHeight * aspect
      camera.top = halfHeight
      camera.bottom = -halfHeight
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(scenePixelRatio(width,height,window.devicePixelRatio||1))
      renderer.setSize(width, height)
      composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(width,height)
      // Retina already resolves fine edges; avoid softening brickwork twice.
      antialias.enabled=renderer.getPixelRatio()<1.75
      antialias.uniforms.resolution.value.set(1/(width*renderer.getPixelRatio()),1/(height*renderer.getPixelRatio()))
      lens.uniforms.resolution.value.set(width*renderer.getPixelRatio(),height*renderer.getPixelRatio())
      if(changed&&runtimeRef.current.activeVisitId)visitCourt(runtimeRef.current.activeVisitId,true)
      else if(wasMobile!==(width<=760))reset()
      frame()
    }
    const project = (point: THREE.Vector3, element: HTMLElement | undefined | null, enabled = true, lift = 0) => {
      if (!element) return
      projection.copy(point).project(camera)
      const x = (projection.x * .5 + .5) * width
      const y = (-projection.y * .5 + .5) * height - lift
      const visible = enabled && projection.z > -1 && projection.z < 1 && x > 12 && x < width - 12 && y > 32 && y < height - 40
      element.style.display = visible ? '' : 'none'
      if (visible) element.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`
    }
    let lightClock = new Date()
    let previousVan=world.vanPosition.clone()
    const frame = () => {
      if(runtimeRef.current.selectedServiceId==='sweet-spot-stringer'&&!journey){const delta=world.vanPosition.clone().sub(previousVan);camera.position.add(delta);controls.target.add(delta);}
      previousVan.copy(world.vanPosition)
      if (destroyed || !onScreen) return
      weatherWorld.setKind(runtimeRef.current.weather)
      weatherWorld.setView(camera,camera.zoom,weatherClearance)
      // Concentrate shadow texels around the visible neighbourhood when zoomed in.
      const span=Math.max(32,520/Math.sqrt(camera.zoom));
      updateSceneLight(sunlight, ambient, controls.target, 425, runtimeRef.current.lightingTime === null ? lightClock : new Date(runtimeRef.current.lightingTime), runtimeRef.current.night, runtimeRef.current.weather);
      sunlight.shadow.camera.left=-span;sunlight.shadow.camera.right=span;sunlight.shadow.camera.top=span;sunlight.shadow.camera.bottom=-span;sunlight.shadow.camera.updateProjectionMatrix();
      occlusion.blendIntensity=runtimeRef.current.night?.16:.44
      renderer.shadowMap.needsUpdate=true
      composer.render()
      const runtime = runtimeRef.current
      for (const venue of venues) project(world.anchors.get(venue.id)!, markerRefs.current.get(venue.id), runtime.visibleIds.includes(venue.id), 3)
      for (const station of world.stations) project(station.position, stationRefs.current.get(station.name), true)
      project(world.vanPosition.clone().setY(4),vanRef.current,runtime.showShops)
      for (const service of mappedServices) project(geoPosition(service.lat,service.lng).setY(5),shopRefs.current.get(service.id),runtime.showShops)
    }
    const engine: SceneHandle = { camera, controls, world, scene, sunlight, ambient, renderer, reset, resize, frame, focus, travel, cancelTravel, visitCourt }
    engineRef.current = engine
    resize()
    if(runtimeRef.current.activeVisitId)visitCourt(runtimeRef.current.activeVisitId,true)
    else reset()
    const tick = (time: number) => {
      if (destroyed) return
      animation = requestAnimationFrame(tick)
      if (document.hidden || !onScreen) { world.animate(time / 1000, false, false, false); return }
      if(journey){
        const progress=Math.min(1,(time-journey.start)/1100)
        const eased=progress*progress*(3-2*progress)
        camera.position.lerpVectors(journey.fromPosition,journey.toPosition,eased)
        controls.target.lerpVectors(journey.fromTarget,journey.toTarget,eased)
        camera.zoom=THREE.MathUtils.lerp(journey.fromZoom,journey.toZoom,eased)
        camera.updateProjectionMatrix();needsFrame=true
        if(progress===1)journey=null
      }
      controls.update()
      weatherWorld.setKind(runtimeRef.current.weather)
      weatherWorld.animate(time / 1000, runtimeRef.current.activityRunning)
      world.setWind(weatherWind(runtimeRef.current.weather))
      if (runtimeRef.current.activityRunning) lightClock = new Date()
      // The parent defaults to paused for reduced motion; an explicit Run is respected.
      const animateTrain = runtimeRef.current.trainRunning
      world.animate(time / 1000, animateTrain, runtimeRef.current.activityRunning, runtimeRef.current.showBuses&&animateTrain)
      // OrbitControls reports damping changes. A still map needs no GPU redraws.
      if (needsFrame || animateTrain || runtimeRef.current.activityRunning) { frame(); needsFrame = false }
    }
    animation = requestAnimationFrame(tick)
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    const visibility = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; if (onScreen) frame() })
    visibility.observe(host)
    const start = () => {cancelTravel();setMoving(true)}
    const end = () => setMoving(false)
    const cameraChanged = () => { needsFrame = true }
    const motionChanged = () => { controls.enableDamping = !reducedMotion.matches }
    controls.addEventListener('start', start)
    controls.addEventListener('end', end)
    controls.addEventListener('change', cameraChanged)
    reducedMotion.addEventListener('change', motionChanged)
    const keydown = (event: KeyboardEvent) => {
      const step = 18 / camera.zoom
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      direction.y = 0; direction.normalize()
      const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0))
      let vector: THREE.Vector3 | null = null
      if (event.key === 'ArrowUp') vector = direction.multiplyScalar(step)
      if (event.key === 'ArrowDown') vector = direction.multiplyScalar(-step)
      if (event.key === 'ArrowLeft') vector = right.multiplyScalar(-step)
      if (event.key === 'ArrowRight') vector = right.multiplyScalar(step)
      if (vector) { event.preventDefault(); camera.position.add(vector); controls.target.add(vector); controls.update() }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); camera.zoom = Math.min(60, camera.zoom * 1.2); camera.updateProjectionMatrix() }
      if (event.key === '-') { event.preventDefault(); camera.zoom = Math.max(.55, camera.zoom / 1.2); camera.updateProjectionMatrix() }
      if (event.key === 'Home') { event.preventDefault(); if(runtimeRef.current.activeVisitId&&runtimeRef.current.onReset)runtimeRef.current.onReset();else reset() }
      frame()
    }
    renderer.domElement.addEventListener('keydown', keydown)
    const doubleClick = (event: MouseEvent) => { event.preventDefault(); if(runtimeRef.current.activeVisitId&&runtimeRef.current.onReset)runtimeRef.current.onReset();else reset() }
    renderer.domElement.addEventListener('dblclick', doubleClick)
    const contextLost = (event: Event) => { event.preventDefault(); setFailed(true) }
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    setReady(true)
    runtimeRef.current.onReady?.()
    return () => {
      destroyed = true
      cancelAnimationFrame(animation)
      observer.disconnect()
      visibility.disconnect()
      controls.removeEventListener('start', start)
      controls.removeEventListener('end', end)
      controls.removeEventListener('change', cameraChanged)
      reducedMotion.removeEventListener('change', motionChanged)
      controls.dispose()
      renderer.domElement.removeEventListener('keydown', keydown)
      renderer.domElement.removeEventListener('dblclick', doubleClick)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      beauty.dispose();occlusion.dispose();output.dispose();antialias.dispose();lens.dispose();composer.dispose()
      // These two shader materials are not released by Three's GTAOPass.dispose().
      occlusion.gtaoMaterial.dispose();occlusion.blendMaterial.dispose()
      weatherWorld.dispose()
      world.dispose()
      disposeEnvironment()
      sunlight.shadow.map?.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      engineRef.current = null
    }
    // The venue dataset is static; changes recreate the scene cleanly.
  }, [venues])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.world.setNight(night)
    engine.scene.environmentIntensity=night?.07:.28
    engine.scene.background = new THREE.Color(night ? '#253940' : DAY_BACKGROUND)
    engine.scene.fog = new THREE.Fog(night ? '#253940' : DAY_BACKGROUND, 900, 1900)
    engine.sunlight.color.set(night ? '#b7cde4' : '#fff0dc')
    engine.sunlight.intensity = night ? .8 : 2.8
    engine.ambient.intensity = night ? .95 : .88
    engine.ambient.color.set(night ? '#a9bfda' : '#f7f2e9')
    engine.ambient.groundColor.set(night ? '#263d44' : '#59634f')
    engine.renderer.toneMappingExposure = night ? .86 : 1
    engine.frame()
  }, [night, lightingTime, ready])

  useEffect(() => {
    engineRef.current?.world.setTransit(true)
    engineRef.current?.world.setBuses(showBuses)
    engineRef.current?.world.setBusRoute(busRouteId)
    engineRef.current?.frame()
  }, [showTransit, showBuses, busRouteId, showShops, visibleIds, weather, ready])

  useEffect(() => {
    if (!selectedId) return
    const engine = engineRef.current
    const venue = venues.find((item) => item.id === selectedId)
    if (!engine || !venue) return
    const point = engine.world.anchors.get(venue.id)??geoPosition(venue.lat, venue.lng)
    engine.focus(point)
    engine.frame()
  }, [selectedId, venues])

  return (
    <div className={`town-map${night ? ' town-map--night' : ''}${moving ? ' town-map--moving' : ''}`} ref={hostRef}>
      {failed && <div className="town-map__fallback" role="status"><strong>The miniature map couldn’t start.</strong><span>You can still discover every court and open booking links in the directory.</span></div>}
      <div className="town-map__labels" aria-label="Courts on the map">
        {venues.map((venue, index) => (
          <button
            className={`town-pin${playCounts?' town-pin--play':''}${selectedId === venue.id ? ' town-pin--selected' : ''}`}
            type="button"
            key={venue.id}
            ref={(element) => { if (element) markerRefs.current.set(venue.id, element); else markerRefs.current.delete(venue.id) }}
            style={{ display: 'none' }}
            onClick={() => onSelect(venue.id)}
            aria-label={playCounts?`${venue.name}. ${playCounts[venue.id]??0} ${coachingPins?(playCounts[venue.id]===1?'coaching option':'coaches & programmes'):playCounts[venue.id]===1?'way to play together':'ways to play together'}`:`${index + 1}. ${venue.name}. Show court details`}
            aria-pressed={selectedId === venue.id}
          >
            <span className="town-pin__number">{playCounts?<Icon name={coachingPins?'ball':'people'} size={18}/>:index + 1}</span>{playCounts&&<span className="town-pin__count" aria-hidden="true">{playCounts[venue.id]??0}</span>}
            <span className="town-pin__label">{venue.name}<span>{playCounts?`${playCounts[venue.id]??0} ${coachingPins?(playCounts[venue.id]===1?'coaching option':'coaches & programmes'):playCounts[venue.id]===1?'way to play together':'ways to play together'} ↗`:'Explore this court ↗'}</span></span>
          </button>
        ))}
        {STATION_NAMES.map((name) => (
          <div className={`town-station${name === 'Highbury & Islington' || name === 'Angel' ? ' town-station--major' : ''}`} key={name} ref={(element) => { if (element) stationRefs.current.set(name, element); else stationRefs.current.delete(name) }} style={{ display: 'none' }}>
            <span className="town-station__roundel" aria-hidden="true" /><span hidden={!showTransit}>{name}</span>
          </div>
        ))}
        <button className="town-pin town-pin--shop" ref={vanRef} style={{display:'none'}} aria-label="Sweet Spot Stringer van. Follow the miniature" onClick={()=>{onSelectService('sweet-spot-stringer');const e=engineRef.current;if(e)e.travel(e.world.vanPosition.clone(),9);}}><span className="town-pin__number"><Icon name="bus" size={17}/></span><span className="town-pin__label">Sweet Spot Stringer<span>Follow the miniature van ↗</span></span></button>
        {mappedServices.map(service=><button className={`town-pin town-pin--shop${selectedServiceId===service.id?' town-pin--selected':''}`} key={service.id} ref={element=>{if(element)shopRefs.current.set(service.id,element);else shopRefs.current.delete(service.id)}} style={{display:'none'}} aria-label={`${service.name}. Show shop details`} onClick={()=>onSelectService(service.id)}><span className="town-pin__number"><Icon name="bag" size={16}/></span><span className="town-pin__label">{service.name}</span></button>)}
      </div>
      <div className="town-map__vignette" aria-hidden="true" />
    </div>
  )
})

export default TownMap
