import type * as THREE from 'three'

export interface MapVenue {
  id: string
  name: string
  lat: number
  lng: number
  courts: number | null
  lighting: string
  access: string
}

export interface Station {
  name: string
  position: THREE.Vector3
  lines: string
}

export interface TownWorld {
  vanPosition: THREE.Vector3
  root: THREE.Group
  stations: Station[]
  anchors: Map<string, THREE.Vector3>
  courtFocusAnchors: Map<string, THREE.Vector3>
  setWind: (strength: number) => void
  setNight: (night: boolean) => void
  setTransit: (visible: boolean) => void
  setActivity: (visible: boolean) => void
  setBuses: (visible: boolean) => void
  setBusRoute: (id: string | null) => void
  animate: (seconds: number, runTrain: boolean, runActivity: boolean, runBuses: boolean) => void
  dispose: () => void
}
