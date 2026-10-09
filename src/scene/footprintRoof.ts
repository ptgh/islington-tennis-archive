import * as THREE from 'three'

/** Split triangulated mapped footprints at the ridge; never replace them with rectangles. */
export function createFootprintRoof(points: number[][], bounds: { x: number; z: number; width: number; angle: number }, height: number, rise: number) {
  const c = Math.cos(bounds.angle), s = Math.sin(bounds.angle)
  const polygon = points.slice(0, -1).map(([x, z]) => new THREE.Vector2((x - bounds.x) * c - (z - bounds.z) * s, (x - bounds.x) * s + (z - bounds.z) * c))
  const vertices: number[] = [], uv: number[] = []
  const emit = (p: THREE.Vector2, y: number) => {
    vertices.push(bounds.x + p.x * c + p.y * s, y, bounds.z - p.x * s + p.y * c)
    uv.push(p.y / 3, p.x / 3)
  }
  const roofY = (p: THREE.Vector2) => height + rise * Math.max(0, 1 - Math.abs(p.x) / (bounds.width / 2))
  for (const indices of THREE.ShapeUtils.triangulateShape(polygon, [])) {
    const triangle = indices.map(i => polygon[i])
    for (const side of [-1, 1]) {
      const clipped: THREE.Vector2[] = []
      for (let i = 0; i < triangle.length; i++) {
        const a = triangle[i], b = triangle[(i + 1) % triangle.length]
        const aInside = a.x * side >= 0, bInside = b.x * side >= 0
        if (aInside) clipped.push(a)
        if (aInside !== bInside) clipped.push(a.clone().lerp(b, a.x / (a.x - b.x)))
      }
      for (let i = 1; i < clipped.length - 1; i++) {
        // Counter-clockwise in world XZ is downward; reverse for upward normals.
        const face = [clipped[0], clipped[i], clipped[i + 1]]
        const cross = (face[1].x - face[0].x) * (face[2].y - face[0].y) - (face[1].y - face[0].y) * (face[2].x - face[0].x)
        if (cross > 0) face.reverse()
        face.forEach(p => emit(p, roofY(p)))
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.computeVertexNormals()
  return geometry
}