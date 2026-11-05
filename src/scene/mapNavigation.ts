import * as THREE from 'three';

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
