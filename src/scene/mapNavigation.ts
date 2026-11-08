import * as THREE from 'three';

/** Long trips rise to a height where the flat map is sharp, then descend onto 3D that
 * has already loaded; flying low would stretch the overview across the whole screen. */
export function flightPlan(distance: number, fromZoom: number, toZoom: number, viewWidth: number, minZoom: number) {
  const duration = Math.round(THREE.MathUtils.clamp(1400 + distance * 3.4, 1700, 2600));
  if (distance < viewWidth / fromZoom * .6) return { duration, cruise: null };
  const cruise = THREE.MathUtils.clamp(viewWidth / (distance * 1.5), Math.max(minZoom, 1.6), 4.2);
  return { duration, cruise: cruise < Math.min(fromZoom, toZoom) ? cruise : null };
}

/** Zoom moves evenly in scale, which is what the eye reads as constant speed. */
export function flightZoom(fromZoom: number, toZoom: number, cruise: number | null, eased: number) {
  const from = Math.log(fromZoom), to = Math.log(toZoom);
  const dip = cruise === null ? 0 : Math.max(0, (from + to) / 2 - Math.log(cruise));
  return Math.exp(from + (to - from) * eased - dip * 4 * eased * (1 - eased));
}

const OWN_SCROLLING = 'dialog,.tennis-atlas,.directory-panel,.ask-dialog';
const FLOATS_OVER_MAP = '.pill,.icon-button,.map-toolbar,.map-footer,.app-header';
/** Pins, labels and floating buttons sit on top of the canvas, so a gesture that starts on
 * one never reaches it, and a pinch then zooms the whole page. Panels keep their own
 * scrolling, and the browser's pinch-zoom stays available over them for anyone who needs it. */
export function wheelBelongsToMap(target: { closest: (selector: string) => unknown }, pinch: boolean) {
  if (target.closest(OWN_SCROLLING)) return false;
  return !!target.closest('.town-map') || (pinch && !!target.closest(FLOATS_OVER_MAP));
}

/** Orbit around the current target, preserving zoom, distance and geographic focus. */
export function orbitMapCamera(camera: THREE.Camera, target: THREE.Vector3, minPolar: number, maxPolar: number, yaw: number, pitch: number) {
  const orbit = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
  orbit.theta += yaw;
  orbit.phi = THREE.MathUtils.clamp(orbit.phi + pitch, minPolar, maxPolar);
  camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(orbit));
  camera.lookAt(target);
}

/** Shift + trackpad scroll gives desktop users the phone's two-axis orbit gesture. */
export function attachMapOrbitGesture(canvas: HTMLElement, orbit: (yaw: number, pitch: number) => void) {
  const wheel = (event: WheelEvent) => {
    if (!event.shiftKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1;
    orbit(THREE.MathUtils.clamp(event.deltaX * scale, -100, 100) * -.004, THREE.MathUtils.clamp(event.deltaY * scale, -100, 100) * -.004);
  };
  canvas.addEventListener('wheel', wheel, { capture: true, passive: false });
  return () => canvas.removeEventListener('wheel', wheel, { capture: true });
}
