import { attachMapOrbitGesture, flightPlan, flightZoom, orbitMapCamera, wheelBelongsToMap } from '../scene/mapNavigation';
import { CloseButton } from './CloseButton';
import type { ViewSettings } from '../data/viewQuality'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {boroughAmenities} from '../data/boroughAmenities'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { createAntialiasedBeauty } from '../scene/antialiasedBeauty'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'
import { geoPosition } from '../scene/createTown'
import type { MapVenue } from '../scene/types'
import { mappedServices } from '../data/hub'
import { createWeather, type WeatherSceneKind } from '../scene/createWeather'
import { highburyCourts } from '../scene/courtGeometry'
import { mapStations } from '../data/transit'
import { Icon } from './Icon'
import { updateSceneLight, weatherWind } from '../scene/sceneAtmosphere'
import { SHADOW_PROXY_LAYER } from '../scene/miniatureMaterials'
import { createViewShadowFitter } from '../scene/viewShadows'
import { freeLabel, type NextFree } from '../data/freeCourts'
import { cameraAvailability, type TrafficCamera } from '../data/trafficCameras'
import { addSkyEnvironment, scenePixelRatio, createAdaptiveResolution, createLensFinish, resizeLensFinish, applyViewFocus, applySceneGrade, SCENE_TONE_MAPPING, createOcclusionExclusionTracker } from '../scene/renderQuality'
import { createIslington, type IslingtonWorld, type BusRideStatus } from '../scene/createIslington'
import { boroughBounds, boroughGeography, courtPicker, courtsNearVenue, otherCourtPins } from '../scene/boroughGeometry'
import { BOROUGH_NEIGHBOURS, NEIGHBOUR_LABEL_MAX_ZOOM } from '../scene/createBoroughBoundary'
import '../scene/TownMap.css'
import {places} from '../data/places'

export interface TownMapHandle {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  orbit: (yaw: number, pitch: number) => void
  visitCourt: (id: string) => void
  locate: (lat: number, lng: number, zoom?: number) => void
  lifeLocation: (kind:'cycle'|'fox'|'emergency') => {lat:number;lng:number}|null
  visitVan: () => void
  followRoute: (id: string) => boolean
}

interface TownMapProps {
  viewSettings: ViewSettings
  suspended?: boolean
  venues: MapVenue[]
  selectedId: string | null
  coachingPins?: boolean
  playCounts?: Record<string, number>
  /** Next free start per venue from Better's live feed; pins show it as a chip. */
  nextFree?: Record<string, NextFree>
  onSelect: (id: string) => void
  visibleIds: string[]
  night: boolean
  lightingTime: number | null
  naturalTime?: boolean
  weather: WeatherSceneKind
  windMph?: number
  onClearPlace?: () => void
  locatedPlace?: {lat:number;lng:number;name:string;wildlife?:boolean}|null
  showTransit: boolean
  trainRunning: boolean
  activityRunning: boolean
  showTrains: boolean
  showBuses: boolean
  busRouteId: string | null
  showShops: boolean
  selectedServiceId: string | null
  followVan?: boolean
  activeVisitId: string | null
  onSelectService: (id: string) => void
  onReset?: () => void
  onReady?: () => void
  cameras?: readonly TrafficCamera[]
  showCameras?: boolean
  showOtherCourts?: boolean
  selectedCameraId?: string
  onSelectCamera?: (camera: TrafficCamera) => void
  onVisitSite?: (id: string) => void
}

interface SceneHandle {
  camera: THREE.OrthographicCamera
  controls: OrbitControls
  scene: THREE.Scene
  world: IslingtonWorld
  sunlight: THREE.DirectionalLight
  ambient: THREE.HemisphereLight
  renderer: THREE.WebGLRenderer
  reset: () => void
  resize: () => void
  frame: () => void
  focus: (point: THREE.Vector3) => void
  travel: (point: THREE.Vector3, zoom: number) => void
  cancelTravel: () => void
  followRoute: (id: string) => boolean
  visitCourt: (id: string) => void
}


const STATION_NAMES = mapStations.map(s=>s.name)
const CAMERA_OFFSET = new THREE.Vector3(275, 480, 475)
const DAY_BACKGROUND = '#b8bca8'
/** Only miniature traffic moves on a still map: 30 frames a second is plenty, and drawing flat out just heats the machine. */
const IDLE_FRAME_MS = 31
/** Close enough that the players read at a one-court site; bigger venues still fit in view. */
const RALLY_MAX_ZOOM = 44
/** Quiet map labels hide before they reach the header and the bottom row of buttons. */
const LABEL_CLEAR_TOP = 110, LABEL_CLEAR_BOTTOM = 90

export const TownMap = forwardRef<TownMapHandle, TownMapProps>(function TownMap({ viewSettings, suspended = false, venues, selectedId, playCounts, nextFree, coachingPins, onSelect, visibleIds, night, lightingTime, naturalTime = false, locatedPlace, onClearPlace, weather, windMph, showTransit, trainRunning, activityRunning, showBuses, showTrains, busRouteId, showShops, selectedServiceId, followVan = true, activeVisitId, onSelectService, onReset, onReady, cameras = [], showCameras = false, showOtherCourts = false, selectedCameraId, onSelectCamera, onVisitSite }, forwardedRef) {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<SceneHandle | null>(null)
  const markerRefs = useRef(new Map<string, HTMLButtonElement>())
  const placeRef=useRef<HTMLDivElement>(null)
  const stationRefs = useRef(new Map<string, HTMLDivElement>())
  const vanRef=useRef<HTMLButtonElement>(null)
  const busPinRef=useRef<HTMLDivElement>(null)
  const shopRefs = useRef(new Map<string, HTMLButtonElement>())
  const cameraRefs = useRef(new Map<string, HTMLButtonElement>())
  const neighbourRefs = useRef(new Map<string, HTMLDivElement>())
  const siteRefs = useRef(new Map<string, HTMLButtonElement>())
  const courtHoverRef = useRef<HTMLDivElement>(null)
  const courtHoverNameRef = useRef<HTMLElement>(null)
  const runtimeRef = useRef({ viewSettings, locatedPlace, suspended, selectedServiceId, followVan, night, lightingTime, naturalTime, weather, windMph, showTransit, trainRunning, activityRunning, showBuses, showShops, showCameras, showOtherCourts, cameras, selectedId, activeVisitId, visibleIds, onReset, onReady, onVisitSite })
  // Dev builds only: window.__townOverride pins weather/time for render comparisons.
  runtimeRef.current = { viewSettings, locatedPlace, suspended, selectedServiceId, followVan, night, lightingTime, naturalTime, weather, windMph, showTransit, trainRunning, activityRunning, showBuses, showShops, showCameras, showOtherCourts, cameras, selectedId, activeVisitId, visibleIds, onReset, onReady, onVisitSite,
    ...(import.meta.env.DEV ? (window as { __townOverride?: object }).__townOverride : undefined) }
  const [failed, setFailed] = useState(false)
  const [mapStatus,setMapStatus]=useState('')
  const [ready, setReady] = useState(false)
  const [moving, setMoving] = useState(false)
  const [busRide,setBusRide]=useState<BusRideStatus|null>(null)

  useImperativeHandle(forwardedRef, () => ({
    lifeLocation(kind){const e=engineRef.current;if(!e)return null;const point=e.world.lifeLocation(kind,e.controls.target);return point?{lat:51.549-point.z/11100,lng:point.x/6900-.115}:null},
    visitVan(){const e=engineRef.current;if(e)e.travel(e.world.vanPosition.clone(),55);},
    zoomIn() {
      const engine = engineRef.current
      if (!engine) return
      engine.cancelTravel()
      engine.camera.zoom = Math.min(engine.controls.maxZoom, engine.camera.zoom * 1.3)
      engine.camera.updateProjectionMatrix()
      engine.frame()
    },
    zoomOut() {
      const engine = engineRef.current
      if (!engine) return
      engine.cancelTravel()
      engine.camera.zoom = Math.max(engine.controls.minZoom, engine.camera.zoom / 1.3)
      engine.camera.updateProjectionMatrix()
      engine.frame()
    },
    reset() { engineRef.current?.reset() },
    visitCourt(id) { engineRef.current?.visitCourt(id) },
    locate(lat,lng,zoom=18) { engineRef.current?.travel(geoPosition(lat,lng),zoom) },
    followRoute(id) { return engineRef.current?.followRoute(id) ?? false },
    orbit(yaw,pitch) {
      const engine=engineRef.current;
      if(!engine)return;
      engine.cancelTravel();
      orbitMapCamera(engine.camera,engine.controls.target,engine.controls.minPolarAngle,engine.controls.maxPolarAngle,yaw,pitch);
      engine.controls.update();engine.frame();
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
    // The render list is built before shadows, so proxies on this layer reach
    // the shadow map without ever being drawn (or written into the AO buffers).
    const renderShadows = renderer.shadowMap.render.bind(renderer.shadowMap)
    renderer.shadowMap.render = (lights, scene, camera) => {
      camera.layers.enable(SHADOW_PROXY_LAYER)
      try { renderShadows(lights, scene, camera) } finally { camera.layers.disable(SHADOW_PROXY_LAYER) }
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = SCENE_TONE_MAPPING
    renderer.domElement.className = 'town-map__canvas'
    renderer.domElement.setAttribute('aria-label', 'Continuous geographic map of Islington. Drag to pan, scroll or pinch to zoom, right-drag or Shift + two-finger scroll to tilt and rotate. Select court markers to discover venues.')
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.tabIndex = 0
    host.prepend(renderer.domElement)

    const scene = new THREE.Scene()
    const disposeEnvironment=addSkyEnvironment(renderer,scene)
    scene.environmentIntensity=runtimeRef.current.night?.07:.28
    scene.background = new THREE.Color(runtimeRef.current.night ? '#253940' : DAY_BACKGROUND)
    scene.fog = new THREE.Fog(runtimeRef.current.night ? '#253940' : DAY_BACKGROUND, 1400, 2800)
    const camera = new THREE.OrthographicCamera(-300, 300, 200, -200, 1, 3400)
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
    controls.minZoom = .1
    controls.maxZoom = 60
    controls.panSpeed = 1
    controls.rotateSpeed = .5
    controls.zoomSpeed = .65
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }

    let needsFrame = true
    const world = createIslington(venues, () => { needsFrame = true })
    scene.add(world.root)
    world.setNight(runtimeRef.current.night)
    const weatherWorld=createWeather();scene.add(weatherWorld.root)
    const weatherClearance=venues.map(venue=>geoPosition(venue.lat,venue.lng))
    // Ground the miniature with subtle contact occlusion. Colour stays at display
    // resolution, while the more expensive depth/AO buffers have a separate cap.
    const composer=new EffectComposer(renderer)
    const beauty=createAntialiasedBeauty(renderer,scene,camera)
    const occlusion=new GTAOPass(scene,camera,1,1)
    occlusion.updateGtaoMaterial({radius:1.6,distanceExponent:1.5,thickness:1.2,distanceFallOff:1,scale:1,samples:host.clientWidth>760?16:8,screenSpaceRadius:false})
    occlusion.updatePdMaterial({lumaPhi:5,depthPhi:1,normalPhi:3,radius:4,samples:8})
    const sizeOcclusion=occlusion.setSize.bind(occlusion)
    occlusion.setSize=(w:number,h:number)=>{
      // Rotation can cross the phone breakpoint without rebuilding the pass.
      occlusion.updateGtaoMaterial({samples:host.clientWidth>760?16:8})
      const ratio=Math.min(host.clientWidth>760?.8:.55,Math.sqrt(1800000/(w*h)))
      sizeOcclusion(Math.max(1,Math.ceil(w*ratio)),Math.max(1,Math.ceil(h*ratio)))
    }
    const transparentObjects=createOcclusionExclusionTracker(world.root)
    const drawOcclusion=occlusion.render.bind(occlusion)
    occlusion.render=(renderer,writeBuffer,readBuffer)=>{
      const weatherVisible=weatherWorld.root.visible
      const visible=transparentObjects().filter(object=>object.visible)
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
    let lastDraw = 0
    let destroyed = false
    let onScreen = true
    const projection = new THREE.Vector3()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const fitShadows=createViewShadowFitter()
    const raycaster = new THREE.Raycaster()
    let journey: {start:number;fromPosition:THREE.Vector3;toPosition:THREE.Vector3;fromTarget:THREE.Vector3;toTarget:THREE.Vector3;fromZoom:number;toZoom:number;duration:number;cruise:number|null}|null=null
    let followedRoute: string | null = null
    let homeView: {x:number;z:number;zoom:number}|null = null
    let lastRideUpdate=0
    const followedPosition = new THREE.Vector3(), followedPrevious = new THREE.Vector3(), followedDelta = new THREE.Vector3()
    const cancelTravel=()=>{journey=null;world.endFlight();followedRoute=null;setBusRide(null)}
    const visibleMapFrame=()=>{
      const mobile=width<=760, bounds=host.getBoundingClientRect()
      const panel=host.parentElement?.querySelector('.directory-panel')?.getBoundingClientRect()
      const panelVisible=!!panel&&!host.parentElement?.classList.contains('panel-closed')&&panel.top<bounds.bottom-5&&!runtimeRef.current.activeVisitId
      const left=!mobile&&panelVisible?panel!.right-bounds.left+28:24
      const places=host.parentElement?.querySelector('.places-panel')?.getBoundingClientRect()
      const right=places&&!mobile?Math.min(width-96,places.left-bounds.left-24):width-(mobile?65:96)
      const top=mobile?156:112
      const bottom=mobile&&panelVisible?panel!.top-bounds.top-28:height-180
      return {left,right,top,bottom:Math.max(top+100,bottom)}
    }
    const travel=(point:THREE.Vector3,zoom:number,immediate=false,offset=CAMERA_OFFSET)=>{
      followedRoute=null
      setBusRide(null)
      const available=visibleMapFrame()
      const x=(available.left+available.right)/2, y=(available.top+available.bottom)/2
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
      const plan=flightPlan(Math.hypot(target.x-controls.target.x,target.z-controls.target.z),camera.zoom,zoom,camera.right-camera.left,controls.minZoom)
      // Load a little wider than the final view, so 3D can take over before arrival.
      previewCamera.position.copy(position);previewCamera.lookAt(target);previewCamera.zoom=Math.max(Math.min(zoom,6.5),zoom*.8);previewCamera.updateProjectionMatrix()
      world.prepareFlight(previewCamera,target,width,plan.cruise!==null)
      journey={start:performance.now(),fromPosition:camera.position.clone(),toPosition:position,fromTarget:controls.target.clone(),toTarget:target,fromZoom:camera.zoom,toZoom:zoom,duration:plan.duration,cruise:plan.cruise}
      needsFrame=true
    }
    const insideSource=(p:THREE.Vector3)=>p.x>=boroughBounds.minX&&p.x<=boroughBounds.maxX&&p.z>=boroughBounds.minZ&&p.z<=boroughBounds.maxZ
    const followRoute=(id:string)=>{
      cancelTravel()
      if(!world.startBusRide(id)||!world.busPosition(id,followedPosition)||!insideSource(followedPosition))return false
      travel(followedPosition,45,false,new THREE.Vector3(180,650,180))
      followedPrevious.copy(followedPosition)
      followedRoute=id
      setBusRide(world.busRideStatus())
      return true
    }
    const visitCourt=(id:string,immediate=false)=>{
      const venue=venues.find(item=>item.id===id),site=otherCourtPins.find(item=>item.id===id)
      if(!venue&&!site)return
      const points:THREE.Vector3[]=[]
      const sourceCourts=site?site.courts:courtsNearVenue(venue!.lat,venue!.lng)
      for(const court of sourceCourts)for(const [x,z] of court.points)for(const y of [0,1.2])points.push(new THREE.Vector3(x,y,z))
      if(!points.length){const point=geoPosition(venue!.lat,venue!.lng);for(const x of [-5,5])for(const z of [-5,5])points.push(point.clone().add(new THREE.Vector3(x,0,z)))}
      frameCourts(points,immediate)
    }
    const frameCourts=(points:THREE.Vector3[],immediate=false)=>{
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
      travel(framedCenter,THREE.MathUtils.clamp(zoom,.7,RALLY_MAX_ZOOM),immediate)
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
      {
        const xs=highburyCourts.map(c=>c.x),zs=highburyCourts.map(c=>c.z)
        const bounds={minX:Math.min(...xs)-12,maxX:Math.max(...xs)+12,minZ:Math.min(...zs)-12,maxZ:Math.max(...zs)+12}
        const center=new THREE.Vector3((bounds.minX+bounds.maxX)/2,0,(bounds.minZ+bounds.maxZ)/2),preview=camera.clone()
        preview.position.copy(center).add(CAMERA_OFFSET);preview.lookAt(center);preview.zoom=1;preview.updateProjectionMatrix();preview.updateMatrixWorld()
        const points=[bounds.minX-3,bounds.maxX+3].flatMap(x=>[bounds.minZ-3,bounds.maxZ+3].map(z=>new THREE.Vector3(x,0,z).project(preview)))
        const spanX=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*width/2
        const spanY=(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*height/2
        const available=visibleMapFrame(),zoom=Math.min((available.right-available.left)*.98/spanX,(available.bottom-available.top)*.96/spanY)
        travel(center,THREE.MathUtils.clamp(zoom,4.5,18),true);homeView={x:controls.target.x,z:controls.target.z,zoom:camera.zoom};return
      }

    }
    // The furthest you can zoom out is the whole borough, edge to edge. Any further
    // only shows how little map lies beyond it.
    const boroughFitZoom=()=>{
      const xs=boroughGeography.boundary.map(p=>p[0]),zs=boroughGeography.boundary.map(p=>p[1])
      const center=new THREE.Vector3((Math.min(...xs)+Math.max(...xs))/2,0,(Math.min(...zs)+Math.max(...zs))/2),preview=camera.clone()
      preview.position.copy(center).add(CAMERA_OFFSET);preview.lookAt(center);preview.zoom=1;preview.updateProjectionMatrix();preview.updateMatrixWorld()
      const points=boroughGeography.boundary.map(([x,z])=>new THREE.Vector3(x,0,z).project(preview))
      const spanX=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*width/2
      const spanY=(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*height/2
      return Math.min(width*.92/spanX,height*.92/spanY)
    }
    const quality = createAdaptiveResolution(1000 / 60, runtimeRef.current.viewSettings.preset)
    let resolutionDirty = false
    const applyResolution = () => {
      const ratio = scenePixelRatio(width, height, window.devicePixelRatio || 1, quality.scale)
      renderer.setPixelRatio(ratio)
      renderer.setSize(width, height)
      composer.setPixelRatio(ratio); composer.setSize(width, height)
      const multisampled = beauty.resize(width * ratio, height * ratio, quality.stats.preset !== 'battery')
      antialias.enabled = !multisampled && ratio < 1.75
      antialias.uniforms.resolution.value.set(1 / (width * ratio), 1 / (height * ratio))
      resizeLensFinish(lens.uniforms, width, height, ratio)
      resolutionDirty = false
      quality.pause()
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
      controls.minZoom=boroughFitZoom()
      applyResolution()
      // The app follows the visible area, so a browser pinch-zoom looks like a resize.
      // Neither that nor a window change may take the camera away from where someone is looking.
      const pinched=(window.visualViewport?.scale??1)>1.01
      const atHome=!homeView||(Math.hypot(controls.target.x-homeView.x,controls.target.z-homeView.z)<.5&&Math.abs(camera.zoom/homeView.zoom-1)<.01)
      if(changed&&runtimeRef.current.activeVisitId&&!pinched)visitCourt(runtimeRef.current.activeVisitId,true)
      else if(wasMobile!==(width<=760)&&!pinched&&atHome)reset()
      frame()
    }
    const project = (point: THREE.Vector3, element: HTMLElement | undefined | null, enabled = true, lift = 0, top = 32, bottom = 40) => {
      if (!element) return
      projection.copy(point).project(camera)
      const x = (projection.x * .5 + .5) * width
      const y = (-projection.y * .5 + .5) * height - lift
      const visible = enabled && projection.z > -1 && projection.z < 1 && x > 12 && x < width - 12 && y > top && y < height - bottom
      element.style.display = visible ? '' : 'none'
      if (visible) {
        element.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`
        if(element===placeRef.current){element.style.setProperty('--label-x',`${x}px`);element.style.setProperty('--label-width',`${width}px`)}
      }
    }
    let lightClock = new Date()
    let previousVan=world.vanPosition.clone()
    const frame = () => {
      if(runtimeRef.current.selectedServiceId==='sweet-spot-stringer'&&runtimeRef.current.followVan&&!journey){const delta=world.vanPosition.clone().sub(previousVan);camera.position.add(delta);controls.target.add(delta);}
      previousVan.copy(world.vanPosition)
      if (destroyed || !onScreen || runtimeRef.current.suspended) return
      if (quality.setPreset(runtimeRef.current.viewSettings.preset)) applyResolution()
      applyViewFocus(lens.uniforms, runtimeRef.current.viewSettings.sharp)
      weatherWorld.setKind(runtimeRef.current.weather)
      weatherWorld.setView(camera,camera.zoom,weatherClearance)
      world.setRain(runtimeRef.current.weather==='rain')
      sunlight.shadow.normalBias=.0055
      updateSceneLight(sunlight, ambient, controls.target, 425, runtimeRef.current.lightingTime === null ? lightClock : new Date(runtimeRef.current.lightingTime), runtimeRef.current.night, runtimeRef.current.weather, runtimeRef.current.naturalTime || runtimeRef.current.lightingTime !== null);
      if(!fitShadows(sunlight,camera)){
        const span=Math.max(32,520/Math.sqrt(camera.zoom))
        sunlight.shadow.camera.left=-span;sunlight.shadow.camera.right=span;sunlight.shadow.camera.top=span;sunlight.shadow.camera.bottom=-span;sunlight.shadow.camera.updateProjectionMatrix()
      }
      occlusion.blendIntensity=runtimeRef.current.night?.16:.44
      applySceneGrade(renderer,lens.uniforms,runtimeRef.current.night)
      renderer.shadowMap.needsUpdate=true
      world.updateView(camera,camera.zoom,controls.target,width)
      const mapMessage=world.status.failed?'Some street detail could not load. The complete base map remains available.':world.status.loading?'Loading street detail…':''
      setMapStatus(previous=>previous===mapMessage?previous:mapMessage)
      composer.render()
      const runtime = runtimeRef.current
      for (const venue of venues) project(world.anchors.get(venue.id)!,markerRefs.current.get(venue.id),runtime.visibleIds.includes(venue.id),3)
      if(runtime.locatedPlace)project(geoPosition(runtime.locatedPlace.lat,runtime.locatedPlace.lng).setY(.3),placeRef.current,true,8)
      for (const place of BOROUGH_NEIGHBOURS) project(new THREE.Vector3(place.x,0,place.z),neighbourRefs.current.get(place.name),camera.zoom<NEIGHBOUR_LABEL_MAX_ZOOM,0,LABEL_CLEAR_TOP,LABEL_CLEAR_BOTTOM)
      for (const site of otherCourtPins) project(new THREE.Vector3(site.x,.15,site.z),siteRefs.current.get(site.id),!!runtime.showOtherCourts&&site.id!==runtime.activeVisitId&&(site.courts.length>=3||camera.zoom>=2.2),0,LABEL_CLEAR_TOP,LABEL_CLEAR_BOTTOM)
      host.classList.toggle('town-map--far',camera.zoom<1.4)
      for (const station of world.stations) project(station.position,stationRefs.current.get(station.name),runtime.showTransit)
      for (const camera of runtime.cameras) project(geoPosition(camera.lat,camera.lng).setY(.15),cameraRefs.current.get(camera.id),runtime.showCameras,3)
      project(world.vanPosition.clone().setY(.3),vanRef.current,runtime.showShops)
      const ride=world.busRideStatus()
      if(ride&&world.busPosition(ride.id,followedPosition))project(followedPosition.clone().setY(.65),busPinRef.current,!!followedRoute&&runtime.showBuses&&ride.progress<1)
      for(const service of mappedServices)project(geoPosition(service.lat,service.lng).setY(.3),shopRefs.current.get(service.id),runtime.showShops)

    }
    const engine: SceneHandle = { camera, controls, world, scene, sunlight, ambient, renderer, reset, resize, frame, focus, travel, cancelTravel, followRoute, visitCourt }
    engineRef.current = engine
    // Dev-only handle for pinned-camera render comparisons; stripped from production builds.
    if (import.meta.env.DEV) Object.assign(window, { __town: { engine, runtime: runtimeRef, composer, quality } })
    resize()
    if(runtimeRef.current.activeVisitId)visitCourt(runtimeRef.current.activeVisitId,true)
    else reset()
    const tick = (time: number) => {
      if (destroyed) return
      animation = requestAnimationFrame(tick)
      if (document.hidden || !onScreen || runtimeRef.current.suspended) { quality.pause(); return }
      if(journey){
        const progress=Math.min(1,Math.max(0,time-journey.start)/journey.duration)
        const eased=progress*progress*progress*(progress*(progress*6-15)+10)
        camera.position.lerpVectors(journey.fromPosition,journey.toPosition,eased)
        controls.target.lerpVectors(journey.fromTarget,journey.toTarget,eased)
        camera.zoom=flightZoom(journey.fromZoom,journey.toZoom,journey.cruise,eased)
        camera.updateProjectionMatrix();needsFrame=true
        if(progress===1){journey=null;world.endFlight()}
      }
      // Panning stops at the surveyed map, so nobody can drift off into empty ground.
      const heldX=THREE.MathUtils.clamp(controls.target.x,boroughBounds.minX,boroughBounds.maxX)-controls.target.x
      const heldZ=THREE.MathUtils.clamp(controls.target.z,boroughBounds.minZ,boroughBounds.maxZ)-controls.target.z
      if(heldX||heldZ){controls.target.x+=heldX;controls.target.z+=heldZ;camera.position.x+=heldX;camera.position.z+=heldZ;needsFrame=true}
      controls.update()
      if(!needsFrame&&!journey&&!followedRoute&&time-lastDraw<IDLE_FRAME_MS){quality.pause();return}
      weatherWorld.setKind(runtimeRef.current.weather)
      weatherWorld.animate(time / 1000, runtimeRef.current.activityRunning, weatherWind(runtimeRef.current.weather,runtimeRef.current.windMph))
      world.setWind(weatherWind(runtimeRef.current.weather,runtimeRef.current.windMph))
      if (runtimeRef.current.activityRunning) lightClock = new Date()
      // The parent defaults to paused for reduced motion; an explicit Run is respected.
      const animateTrain = runtimeRef.current.trainRunning
      world.animate(time / 1000, animateTrain, runtimeRef.current.activityRunning, runtimeRef.current.showBuses&&runtimeRef.current.activityRunning)
      if(followedRoute&&!journey){
        if(!runtimeRef.current.showBuses)cancelTravel()
        else if(world.busPosition(followedRoute,followedPosition)){
          // Follow the same vehicle without rebuilding its camera or drawing twice.
          if(!insideSource(followedPosition)){cancelTravel()}
          else {
            followedDelta.subVectors(followedPosition,followedPrevious)
            camera.position.add(followedDelta);controls.target.add(followedDelta)
            followedPrevious.copy(followedPosition)
            needsFrame=true
            const ride=world.busRideStatus()
            if(ride&&time-lastRideUpdate>250){setBusRide(ride);lastRideUpdate=time}
            if(ride?.progress===1){
              // Finish at the nearest court, while the bus remains on its road.
              visitCourt(ride.destinationId)
              setBusRide(ride)
            }
          }
        }
      }
      // OrbitControls reports damping changes. A still map needs no GPU redraws.
      if (needsFrame || animateTrain || runtimeRef.current.activityRunning) {
        // Resizing clears the canvas: do it immediately before the next draw.
        if (resolutionDirty) applyResolution()
        const started = performance.now(), cameraMoved = needsFrame||!!journey||!!followedRoute
        frame(); needsFrame = false; lastDraw = time
        // Only a moving camera says anything about pace: idle frames are capped on purpose.
        if (!cameraMoved) quality.pause()
        else if (quality.sample(time, performance.now() - started)) { resolutionDirty = true; needsFrame = true }
      } else quality.pause()
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
      if (event.key === '+' || event.key === '=') { event.preventDefault(); camera.zoom = Math.min(controls.maxZoom, camera.zoom * 1.2); camera.updateProjectionMatrix() }
      if (event.key === '-') { event.preventDefault(); camera.zoom = Math.max(controls.minZoom, camera.zoom / 1.2); camera.updateProjectionMatrix() }
      if (event.key === 'Home') { event.preventDefault(); if(runtimeRef.current.activeVisitId&&runtimeRef.current.onReset)runtimeRef.current.onReset();else reset() }
      frame()
    }
    const detachOrbitGesture=attachMapOrbitGesture(renderer.domElement,(yaw,pitch)=>{cancelTravel();orbitMapCamera(camera,controls.target,controls.minPolarAngle,controls.maxPolarAngle,yaw,pitch);controls.update();frame();});
    renderer.domElement.addEventListener('keydown', keydown)
    const app=host.parentElement
    const wheelOverlay=(event:WheelEvent)=>{
      const target=event.target as Element|null
      if(!target)return
      // OrbitControls skips preventDefault mid-gesture, which would let a pinch zoom the page.
      if(target===renderer.domElement){if(event.ctrlKey)event.preventDefault();return}
      if(!wheelBelongsToMap(target,event.ctrlKey))return
      event.preventDefault()
      renderer.domElement.dispatchEvent(new WheelEvent('wheel',event))
    }
    app?.addEventListener('wheel',wheelOverlay,{capture:true,passive:false})
    // Any court you can see can be opened. Only a tap counts: a drag is the map moving.
    const courtAt=courtPicker(venues)
    const courtUnder=(event:MouseEvent)=>{
      const box=renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,1-(event.clientY-box.top)/box.height*2),camera)
      const point=new THREE.Vector3()
      return raycaster.ray.intersectPlane(ground,point)?courtAt(point.x,point.z):null
    }
    let press:{x:number;y:number;time:number;id:number}|null=null
    const pointerDown=(event:PointerEvent)=>{press=press||event.button!==0?null:{x:event.clientX,y:event.clientY,time:performance.now(),id:event.pointerId}}
    const pointerUp=(event:PointerEvent)=>{
      const start=press;press=null
      if(!start||start.id!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>6||performance.now()-start.time>500)return
      const court=courtUnder(event)
      if(court)runtimeRef.current.onVisitSite?.(court.id)
    }
    // The tag carries the name while hovering, so the court's own label steps aside.
    let coveredLabel:HTMLElement|null=null
    const coverLabel=(label:HTMLElement|null)=>{if(label===coveredLabel)return;coveredLabel?.classList.remove('court-site--covered');label?.classList.add('court-site--covered');coveredLabel=label}
    const hideCourtHover=()=>{host.classList.remove('town-map--over-court');coverLabel(null);if(courtHoverRef.current)courtHoverRef.current.style.display='none'}
    const pointerMove=(event:PointerEvent)=>{
      if(event.pointerType!=='mouse')return
      const court=event.buttons?null:courtUnder(event),tip=courtHoverRef.current,name=courtHoverNameRef.current
      if(!court||!tip||!name){hideCourtHover();return}
      host.classList.add('town-map--over-court')
      coverLabel(siteRefs.current.get(court.id)??null)
      if(name.textContent!==court.name)name.textContent=court.name
      const box=host.getBoundingClientRect()
      tip.style.display='flex'
      tip.style.transform=`translate3d(${Math.min(event.clientX-box.left+14,box.width-250)}px,${event.clientY-box.top-34}px,0)`
    }
    renderer.domElement.addEventListener('pointerdown',pointerDown)
    renderer.domElement.addEventListener('pointerup',pointerUp)
    renderer.domElement.addEventListener('pointercancel',pointerUp)
    renderer.domElement.addEventListener('pointermove',pointerMove)
    renderer.domElement.addEventListener('pointerleave',hideCourtHover)
    const doubleClick = (event: MouseEvent) => { event.preventDefault(); if(courtUnder(event))return; if(runtimeRef.current.activeVisitId&&runtimeRef.current.onReset)runtimeRef.current.onReset();else reset() }
    renderer.domElement.addEventListener('dblclick', doubleClick)
    const contextLost = (event: Event) => { event.preventDefault(); setFailed(true) }
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    setReady(true)
    world.ready.then(()=>{if(!destroyed)runtimeRef.current.onReady?.()})
    return () => {
      destroyed = true
      cancelAnimationFrame(animation)
      observer.disconnect()
      visibility.disconnect()
      controls.removeEventListener('start', start)
      controls.removeEventListener('end', end)
      controls.removeEventListener('change', cameraChanged)
      reducedMotion.removeEventListener('change', motionChanged)
      detachOrbitGesture()
      app?.removeEventListener('wheel',wheelOverlay,{capture:true})
      controls.dispose()
      renderer.domElement.removeEventListener('keydown', keydown)
      renderer.domElement.removeEventListener('dblclick', doubleClick)
      renderer.domElement.removeEventListener('pointerdown',pointerDown)
      renderer.domElement.removeEventListener('pointerup',pointerUp)
      renderer.domElement.removeEventListener('pointercancel',pointerUp)
      renderer.domElement.removeEventListener('pointermove',pointerMove)
      renderer.domElement.removeEventListener('pointerleave',hideCourtHover)
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

  useEffect(() => { engineRef.current?.frame() }, [viewSettings, suspended])
  useEffect(() => { engineRef.current?.reset() }, [ready])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.world.setNight(night)
    engine.scene.environmentIntensity=night?.07:.28
    engine.scene.background = new THREE.Color(night ? '#253940' : DAY_BACKGROUND)
    engine.scene.fog = new THREE.Fog(night ? '#253940' : DAY_BACKGROUND, 1400, 2800)
    engine.sunlight.color.set(night ? '#b7cde4' : '#fff0dc')
    engine.sunlight.intensity = night ? .8 : 2.8
    engine.ambient.intensity = night ? .95 : .88
    engine.ambient.color.set(night ? '#a9bfda' : '#f7f2e9')
    engine.ambient.groundColor.set(night ? '#263d44' : '#59634f')
    engine.frame()
  }, [night, lightingTime, naturalTime, ready])

  useEffect(()=>{const matches=(p:{name:string;lat:number;lng:number})=>!!locatedPlace&&!locatedPlace.wildlife&&p.name===locatedPlace.name&&Math.abs(p.lat-locatedPlace.lat)<1e-6&&Math.abs(p.lng-locatedPlace.lng)<1e-6;const park=boroughAmenities.parks.find(matches),place=places.find(matches),target=park??place;engineRef.current?.world.setDestination(target?geoPosition(target.lat,target.lng):null,!!park||place?.kind==='park');},[locatedPlace,ready])

  // End a deselected bus tour once; unrelated layer/feed updates must not
  // cancel a Places camera journey.
  useEffect(() => {if(!busRouteId)engineRef.current?.cancelTravel()},[busRouteId])

  useEffect(() => {
    engineRef.current?.world.setTransit(true)
    engineRef.current?.world.setBuses(showBuses)
    engineRef.current?.world.setTrains(showTrains)
    engineRef.current?.world.setBusRoute(busRouteId)
    engineRef.current?.frame()
  }, [locatedPlace, showTransit, showBuses, showTrains, busRouteId, showShops, showCameras, cameras, visibleIds, weather, windMph, ready])

  useEffect(() => {
    if (!selectedId) return
    const engine = engineRef.current
    const venue = venues.find((item) => item.id === selectedId)
    if (!engine || !venue) return
    const point = engine.world.anchors.get(venue.id)??geoPosition(venue.lat, venue.lng)
    engine.focus(point)
    engine.frame()
  }, [selectedId, venues, ready])

  // Court pins describe; they don't promise a link. Once a court is selected its card is
  // already open, so the label is just the name (plus Better's free time when known).
  const pinSubline = (id: string) => {
    if (playCounts) return `${playCounts[id]??0} ${coachingPins?(playCounts[id]===1?'coaching option':'coaches & programmes'):playCounts[id]===1?'way to play together':'ways to play together'}`
    const free = nextFree?.[id]
    if (free) return `${free.courts} ${free.courts===1?'court':'courts'} free at ${freeLabel(free.start)} · Better`
    return selectedId === id ? null : 'View court details'
  }

  return (
    <div className={`town-map${night ? ' town-map--night' : ''}${moving ? ' town-map--moving' : ''}`} ref={hostRef}>
      {failed && <div className="town-map__fallback" role="status"><strong>The miniature map couldn’t start.</strong><span>You can still discover every court and open booking links in the directory.</span></div>}
      {busRide&&<section className="bus-tour" aria-label="Bus tour">
        <div className="bus-tour__heading"><Icon name="bus" size={21}/><strong>Route {busRide.id} · {busRide.progress===1?'Courts in view':'On the way'}</strong><CloseButton label="End bus tour" onClick={()=>engineRef.current?.cancelTravel()}/></div>
        <p>{venues.find(v=>v.id===busRide.destinationId)?.name}</p>
        <progress aria-label="Bus tour progress" max={1} value={busRide.progress}/>
        <small>{busRide.progress===1?`The bus stays on the road, about ${busRide.walkMetres} m from the court (straight-line estimate).`:!activityRunning?'Tour paused · use Play world to continue.':'Follow the coloured road line to the courts.'} Illustrative tour.</small>
        <div className="bus-tour__actions"><button onClick={()=>engineRef.current?.followRoute(busRide.id)}>Replay tour</button><button onClick={()=>{engineRef.current?.cancelTravel();onSelect(busRide.destinationId)}}>Court details <Icon name="arrow" size={14}/></button></div>
      </section>}
      {busRide&&<div ref={busPinRef} className="bus-tour-marker" aria-hidden="true" style={{display:'none'}}><span><Icon name="bus" size={14}/> {busRide.id}</span></div>}
      {BOROUGH_NEIGHBOURS.map(place=><div className="borough-neighbour" aria-hidden="true" key={place.name} ref={element=>{if(element)neighbourRefs.current.set(place.name,element);else neighbourRefs.current.delete(place.name)}} style={{display:'none'}}><span>{place.name}</span></div>)}
      <div className="court-hover" ref={courtHoverRef} aria-hidden="true" style={{display:'none'}}><b ref={courtHoverNameRef}/><small>Watch a rally</small></div>
      <div className="town-map__labels" aria-label="Courts on the map">
        {venues.map((venue, index) => (
          <button
            className={`town-pin${playCounts?' town-pin--play':''}${selectedId === venue.id ? ' town-pin--selected' : ''}`}
            type="button"
            key={venue.id}
            ref={(element) => { if (element) markerRefs.current.set(venue.id, element); else markerRefs.current.delete(venue.id) }}
            style={{ display: 'none' }}
            onClick={() => onSelect(venue.id)}
            aria-label={playCounts?`${venue.name}. ${playCounts[venue.id]??0} ${coachingPins?(playCounts[venue.id]===1?'coaching option':'coaches & programmes'):playCounts[venue.id]===1?'way to play together':'ways to play together'}`:`${index + 1}. ${venue.name}.${nextFree?.[venue.id]?` Next free court ${freeLabel(nextFree[venue.id].start)}.`:''} View court details`}
            aria-pressed={selectedId === venue.id}
          >
            <span className="town-pin__number">{playCounts?<Icon name={coachingPins?'ball':'people'} size={18}/>:index + 1}</span>{playCounts&&<span className="town-pin__count" aria-hidden="true">{playCounts[venue.id]??0}</span>}{!playCounts&&nextFree?.[venue.id]&&<span className="town-pin__free" aria-hidden="true">Free {freeLabel(nextFree[venue.id].start)}</span>}
            <span className="town-pin__label">{venue.name}{pinSubline(venue.id)&&<span>{pinSubline(venue.id)}</span>}</span>
          </button>
        ))}

        {cameras.map(camera => <button className={`town-pin town-pin--camera${camera.available===false?' town-pin--camera-offline':''}${selectedCameraId === camera.id ? ' town-pin--selected' : ''}`} key={camera.id} ref={element => { if (element) cameraRefs.current.set(camera.id,element); else cameraRefs.current.delete(camera.id) }} style={{display:'none'}} aria-label={`${camera.name}. Show TfL traffic camera. ${cameraAvailability(camera)}`} aria-pressed={selectedCameraId === camera.id} onClick={() => onSelectCamera?.(camera)}><span className="town-pin__number"><Icon name="camera" size={17}/></span><span className="town-pin__label">{camera.name}<span>TfL · {cameraAvailability(camera)} · refreshed still</span></span></button>)}
        {otherCourtPins.map(site=><button className="court-site" key={site.id} ref={element=>{if(element)siteRefs.current.set(site.id,element);else siteRefs.current.delete(site.id)}} style={{display:'none'}} aria-label={`${site.name}, ${site.courts.length} tennis ${site.courts.length===1?'court':'courts'}${site.note?`. ${site.note}`:''}. Watch a rally`} onClick={()=>onVisitSite?.(site.id)}><span className="court-site__dot" aria-hidden="true"/><span className="court-site__label" aria-hidden="true">{site.name}<small>{site.courts.length}{site.note?` · ${site.note}`:''}</small></span></button>)}
        {locatedPlace&&<div className={`map-destination${locatedPlace.wildlife?' map-destination--wildlife':''}`} ref={placeRef} style={{display:'none'}}><span><Icon name="pin" size={13}/><span role="status">{locatedPlace.name}</span><button type="button" className="map-destination__dismiss" onClick={onClearPlace} aria-label="Clear map selection" title="Clear map selection"><Icon name="close" size={14}/></button></span></div>}
        {STATION_NAMES.map((name) => (
          <div className={`town-station${name === 'Highbury & Islington' || name === 'Angel' ? ' town-station--major' : ''}`} key={name} ref={(element) => { if (element) stationRefs.current.set(name, element); else stationRefs.current.delete(name) }} style={{ display: 'none' }}>
            <span className="town-station__roundel" aria-hidden="true" /><span hidden={!showTransit}>{name}</span>
          </div>
        ))}
        <button className="town-pin town-pin--shop" ref={vanRef} style={{display:'none'}} aria-label="Sweet Spot Stringer van. Follow the miniature" onClick={()=>{onSelectService('sweet-spot-stringer');const e=engineRef.current;if(e)e.travel(e.world.vanPosition.clone(),55);}}><span className="town-pin__number"><Icon name="bus" size={17}/></span><span className="town-pin__label">Sweet Spot Stringer<span>Follow the miniature van</span></span></button>
        {mappedServices.map(service=><button className={`town-pin town-pin--shop${selectedServiceId===service.id?' town-pin--selected':''}`} key={service.id} ref={element=>{if(element)shopRefs.current.set(service.id,element);else shopRefs.current.delete(service.id)}} style={{display:'none'}} aria-label={`${service.name}. Show shop details`} onClick={()=>onSelectService(service.id)}><span className="town-pin__number"><Icon name="bag" size={16}/></span><span className="town-pin__label">{service.name}</span></button>)}
      </div>
      {mapStatus&&<div className="map-stream-status" role="status">{mapStatus}{mapStatus.startsWith('Some')&&<button onClick={()=>{engineRef.current?.world.retry();engineRef.current?.frame()}}>Retry</button>}</div>}
      <div className="town-map__vignette" aria-hidden="true" />
    </div>
  )
})

export default TownMap
