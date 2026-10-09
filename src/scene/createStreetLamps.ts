import * as THREE from 'three'
import { inCourtArea, type CourtArea } from './courtGeometry.ts'

type Street = { points: [number, number][]; width: number }

/** Small curbside lamps; only the night layer glows. */
export function createStreetLamps(streets: Street[], exclusions: CourtArea[]) {
  const root = new THREE.Group()
  const night = new THREE.Group()
  root.add(night)
  night.visible = false
  const postMaterial = new THREE.MeshStandardMaterial({ color:'#4c5b51', roughness:.85 })
  const bulbMaterial = new THREE.MeshStandardMaterial({ color:'#eee8d2', emissive:'#ffe6aa', emissiveIntensity:0 })
  const box = new THREE.BoxGeometry(1,1,1)
  const parts: { x:number; y:number; z:number; sx:number; sy:number; sz:number; angle:number; material:'post'|'bulb' }[] = []
  const positions: THREE.Vector3[] = []

  for (const street of streets) {
    let onStreet=0
    for (let i=1; i<street.points.length; i++) {
    const [ax,az]=street.points[i-1], [bx,bz]=street.points[i]
    const length=Math.hypot(bx-ax,bz-az), dx=(bx-ax)/length, dz=(bz-az)/length
    if (!Number.isFinite(length) || length < 20) continue
    for (let along=24; along<length-8; along+=38) {
      if (positions.length>=35 || onStreet>=5) break
      const side=(Math.floor(along/38)+i)%2?1:-1
      const x=ax+dx*along-dz*(street.width/2+.85)*side
      const z=az+dz*along+dx*(street.width/2+.85)*side
      if (Math.hypot(x-95,z+25)>255 || inCourtArea(x,z,exclusions,3.5)) continue
      if (positions.some(p=>Math.hypot(p.x-x,p.z-z)<25)) continue
      positions.push(new THREE.Vector3(x-dz*.83*side,3.75,z+dx*.83*side))
      onStreet++
      const angle=-Math.atan2(dz,dx)
      parts.push({x,y:1.95,z,sx:.13,sy:3.9,sz:.13,angle,material:'post'})
      parts.push({x:x-dz*.43*side,y:3.84,z:z+dx*.43*side,sx:.9,sy:.1,sz:.12,angle,material:'post'})
      parts.push({x:x-dz*.83*side,y:3.75,z:z+dx*.83*side,sx:.39,sy:.13,sz:.32,angle,material:'bulb'})
    }
  }
  }

  for (const kind of ['post','bulb'] as const) {
    const batch=parts.filter(part=>part.material===kind)
    const mesh=new THREE.InstancedMesh(box,kind==='post'?postMaterial:bulbMaterial,batch.length)
    const transform=new THREE.Object3D()
    batch.forEach((part,index)=>{
      transform.position.set(part.x,part.y,part.z)
      transform.rotation.y=part.angle
      transform.scale.set(part.sx,part.sy,part.sz)
      transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix)
    })
    mesh.castShadow=kind==='post';mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh)
  }

  const size=32, pixels=new Uint8Array(size*size*4)
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const d=Math.hypot(x-size/2,y-size/2)/(size/2),j=(y*size+x)*4
    pixels[j]=255;pixels[j+1]=235;pixels[j+2]=179;pixels[j+3]=Math.round(150*Math.pow(Math.max(0,1-d),2))
  }
  const texture=new THREE.DataTexture(pixels,size,size);texture.needsUpdate=true;texture.magFilter=THREE.LinearFilter
  const halo=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})
  positions.forEach((p,i)=>{
    const glow=new THREE.Sprite(halo);glow.position.copy(p).setY(3.75);glow.scale.set(4.5,4.5,1);night.add(glow)
    if(i%6===0){const light=new THREE.PointLight('#ffdf9e',.75,15,2);light.position.copy(p).setY(3.6);night.add(light)}
  })
  return { root, count:positions.length, setNight(value:boolean){night.visible=value;bulbMaterial.emissiveIntensity=value?3.2:0}, dispose(){texture.dispose()} }
}
