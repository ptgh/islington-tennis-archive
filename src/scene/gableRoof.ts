import * as THREE from 'three'

/** Unit gable: ridge along X at y=1, eaves at z=±.5, gable ends at x=±.5. */
export function gableRoofGeometry() {
  const points = [
    -.5, 0, -.5, .5, 0, -.5, .5, 1, 0,
    -.5, 0, -.5, .5, 1, 0, -.5, 1, 0,
    -.5, 1, 0, .5, 1, 0, .5, 0, .5,
    -.5, 1, 0, .5, 0, .5, -.5, 0, .5,
    -.5, 0, .5, -.5, 0, -.5, -.5, 1, 0,
    .5, 0, -.5, .5, 0, .5, .5, 1, 0,
  ]
  const geometry = new THREE.BufferGeometry()
  // Roof faces must point outward; otherwise the building's flat top shows through.
  for (let triangle = 0; triangle < points.length; triangle += 9) {
    for (let axis = 0; axis < 3; axis++) {
      const a = triangle + 3 + axis, b = triangle + 6 + axis
      ;[points[a], points[b]] = [points[b], points[a]]
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(points.flatMap((_, i) => i % 3 === 0 ? [points[i] + .5, points[i + 2] + .5 + points[i + 1] * .5] : []), 2))
  geometry.computeVertexNormals()
  return geometry
}
