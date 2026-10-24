import * as THREE from 'three'

/** Front-facing unit arch, with its base at y=0 and top at y=1. */
export function archedOpeningGeometry() {
  const shape=new THREE.Shape()
  shape.moveTo(-.5,0);shape.lineTo(.5,0);shape.lineTo(.5,.6)
  shape.absarc(0,.6,.5,0,Math.PI,false);shape.lineTo(-.5,0)
  const geometry=new THREE.ShapeGeometry(shape,10)
  geometry.scale(1,1/1.1,1)
  const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv')
  for(let i=0;i<uv.count;i++)uv.setXY(i,positions.getX(i)+.5,positions.getY(i))
  return geometry
}

/** Unit roof silhouettes sharing the gable's footprint and eaves height. */
export function townRoofGeometry(kind:'hipped'|'mansard') {
  type Point=[number,number,number]
  const positions:number[]=[],uvs:number[]=[]
  const face=(points:Point[])=>{
    for(let i=1;i<points.length-1;i++){
      const triangle=[points[0],points[i],points[i+1]].map(p=>new THREE.Vector3(...p))
      const normal=triangle[1].clone().sub(triangle[0]).cross(triangle[2].clone().sub(triangle[0]))
      const centre=triangle.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(1/3).sub(new THREE.Vector3(0,.35,0))
      if(normal.dot(centre)<0)[triangle[1],triangle[2]]=[triangle[2],triangle[1]]
      for(const p of triangle){positions.push(p.x,p.y,p.z);uvs.push(p.x+.5,p.z+.5+p.y*.5)}
    }
  }
  const ring=(x:number,y:number,z:number):Point[]=>[[-x,y,-z],[x,y,-z],[x,y,z],[-x,y,z]]
  if(kind==='hipped'){
    const base=ring(.5,0,.5),left:Point=[-.32,1,0],right:Point=[.32,1,0]
    face([base[0],base[1],right,left]);face([base[1],base[2],right])
    face([base[2],base[3],left,right]);face([base[3],base[0],left])
  }else{
    const rings=[ring(.5,0,.5),ring(.48,.72,.35),ring(.4,1,.16)]
    for(let level=0;level<2;level++)for(let i=0;i<4;i++){
      const next=(i+1)%4
      face([rings[level][i],rings[level][next],rings[level+1][next],rings[level+1][i]])
    }
    face(rings[2])
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.computeVertexNormals();geometry.computeBoundingSphere()
  return geometry
}
