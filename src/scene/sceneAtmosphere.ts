import * as THREE from 'three'
import type { WeatherSceneKind } from './createWeather.ts'

const RAD = Math.PI / 180
const DAY = 86400000
const LONDON = { lat: 51.51, lng: -.14 }

export function weatherWind(weather: WeatherSceneKind) {
  return weather === 'rain' ? .10 : weather === 'snow' ? .06 : weather === 'cloud' ? .065 : .045
}

// Low-order orbital elements: https://stjarnhimlen.se/comp/ppcomp.html
// Deliberately omits lunar perturbations/refraction: suitable for miniature
// lighting, not navigation or published moonrise times. Scene axes: east +X,
// up +Y, south +Z. Intensity is art-directed to keep the map readable.
function orbit(anomaly: number, eccentricity: number) {
  let eccentric = anomaly
  for (let i = 0; i < 5; i++) eccentric -= (eccentric - eccentricity * Math.sin(eccentric) - anomaly) / (1 - eccentricity * Math.cos(eccentric))
  return Math.atan2(Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentric), Math.cos(eccentric) - eccentricity)
}

export function skyPosition(date: Date, location = LONDON) {
  const days = (date.getTime() - Date.UTC(1999, 11, 31)) / DAY
  const obliquity = (23.4393 - 3.563e-7 * days) * RAD
  const sunLongitude = orbit(((356.047 + .9856002585 * days) % 360) * RAD, .016709 - 1.151e-9 * days) + (282.9404 + 4.70935e-5 * days) * RAD
  const sun = new THREE.Vector3(Math.cos(sunLongitude), Math.sin(sunLongitude), 0)
  const node = (125.1228 - .0529538083 * days) * RAD
  const argument = orbit(((115.3654 + 13.0649929509 * days) % 360) * RAD, .0549) + (318.0634 + .1643573223 * days) * RAD
  const inclination = 5.1454 * RAD
  const moon = new THREE.Vector3(
    Math.cos(node) * Math.cos(argument) - Math.sin(node) * Math.sin(argument) * Math.cos(inclination),
    Math.sin(node) * Math.cos(argument) + Math.cos(node) * Math.sin(argument) * Math.cos(inclination),
    Math.sin(argument) * Math.sin(inclination),
  )
  const illumination = THREE.MathUtils.clamp((1 - sun.dot(moon)) / 2, 0, 1)
  const sidereal = (280.46061837 + 360.98564736629 * (days - 1.5) + location.lng) * RAD
  const latitude = location.lat * RAD
  const horizontal = (ecliptic: THREE.Vector3) => {
    const equatorial = ecliptic.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), obliquity)
    const declination = Math.asin(equatorial.z)
    const hourAngle = sidereal - Math.atan2(equatorial.y, equatorial.x)
    return new THREE.Vector3(
      -Math.cos(declination) * Math.sin(hourAngle),
      Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle),
      Math.sin(latitude) * Math.cos(declination) * Math.cos(hourAngle) - Math.cos(latitude) * Math.sin(declination),
    ).normalize()
  }
  return { sun: horizontal(sun), moon: horizontal(moon), illumination }
}

/** Actual date-led sun/moon positions. Explicit Day at night previews noon;
 * explicit Night during daylight previews midnight on the same UTC date. */
export function lightCycle(date: Date, night: boolean, weather: WeatherSceneKind) {
  let sky = skyPosition(date)
  const preview = night ? sky.sun.y > 0 : sky.sun.y <= 0
  if (preview) {
    const override = new Date(date)
    override.setUTCHours(night ? 0 : 12, 0, 0, 0)
    sky = skyPosition(override)
  }
  const cloud = weather === 'clear' ? 0 : weather === 'cloud' ? .5 : .8
  const elevation = Math.max(0, night ? sky.moon.y : sky.sun.y)
  const moonlight = Math.pow(sky.illumination, 2) * Math.sqrt(elevation) * (1 - cloud * .85)
  const direction = (night ? sky.moon : sky.sun).clone()
  // Bound near-horizon shadow lengths to the scene, without illuminating from
  // below the ground. Moon below horizon still contributes no directional light.
  direction.y = Math.max(.10, direction.y)
  direction.normalize()
  return {
    direction,
    direct: night ? 1.05 * moonlight : (1.7 + Math.sqrt(elevation) * 1.1) * (1 - cloud * .65),
    ambient: night ? .48 + moonlight * .35 : .88 + cloud * .22,
    warmth: night ? 0 : Math.pow(1 - elevation, 3),
    illumination: sky.illumination,
    moonAboveHorizon: sky.moon.y > 0,
    preview,
  }
}

export function updateSceneLight(sun: THREE.DirectionalLight, ambient: THREE.HemisphereLight, target: THREE.Vector3, distance: number, date: Date, night: boolean, weather: WeatherSceneKind) {
  const cycle = lightCycle(date, night, weather)
  sun.position.copy(target).addScaledVector(cycle.direction, distance)
  sun.target.position.copy(target)
  sun.intensity = cycle.direct
  sun.color.set(night ? '#b7cde4' : '#fff0dc')
  if (!night) sun.color.lerp(new THREE.Color('#f6b879'), cycle.warmth * .8)
  ambient.intensity = cycle.ambient
  ambient.color.set(night ? '#a9bfda' : '#f7f2e9')
  ambient.groundColor.set(night ? '#263d44' : '#59634f')
}
