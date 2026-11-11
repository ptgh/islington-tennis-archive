import * as THREE from 'three'

/** Lay membrane seams along the long axis of the footprint at a six-metre repeat. */
export function setFlatRoofUVs(geometry: THREE.BufferGeometry, bounds: { x: number; z: number; angle: number }, worldScale = 1) {
  const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv')
  const c = Math.cos(bounds.angle), s = Math.sin(bounds.angle), span = 6 * worldScale
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) - bounds.x, z = positions.getZ(i) - bounds.z
    uv.setXY(i, (x * c - z * s) / span, (x * s + z * c) / span)
  }
}

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

/** Close the roof perimeter against its source wall, including edges crossing
 * the ridge. A rectangular gable would overhang concave/angled footprints. */
export function createFootprintGables(points:number[][],bounds:{x:number;z:number;width:number;angle:number},height:number,rise:number){
 const vertices:number[]=[],uv:number[]=[],c=Math.cos(bounds.angle),s=Math.sin(bounds.angle)
 const across=([x,z]:number[])=>(x-bounds.x)*c-(z-bounds.z)*s
 const top=(p:number[])=>height+rise*Math.max(0,1-Math.abs(across(p))/(bounds.width/2))
 const signed=points.slice(1).reduce((sum,b,i)=>sum+points[i][0]*b[1]-b[0]*points[i][1],0)
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],ax=across(a),bx=across(b),cuts=[a]
  if(ax*bx<0){const t=ax/(ax-bx);cuts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}
  cuts.push(b)
  for(let j=1;j<cuts.length;j++){
   const p=cuts[j-1],q=cuts[j],py=top(p),qy=top(q),length=Math.hypot(q[0]-p[0],q[1]-p[1])
   if(Math.max(py,qy)-height<.000001||length<.000001)continue
   const face=[[p[0],height,p[1],0],[q[0],height,q[1],length],[q[0],qy,q[1],length],[p[0],py,p[1],0]]
   for(const triangle of [[0,1,2],[0,2,3]]){
    if((triangle[1]===1?qy:py)-height<.000001)continue
    if(signed>0)triangle.reverse()
    for(const index of triangle){const [x,y,z,u]=face[index];vertices.push(x,y,z);uv.push(u/6,y/6)}
   }
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();return geometry
}
