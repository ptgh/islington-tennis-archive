import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import geography from '../data/iconic-geography.json' with { type: 'json' }
import type { createMiniatureMaterials } from './miniatureMaterials'
import { createFootprintRoof } from './footprintRoof.ts'
import { clubCourtSurface, type ClubCourtSurface } from './clubSurfaces.ts'

type Point = number[]
type Feature = { id: number; tags: Record<string, string>; points: Point[]; outlines?: Point[][] }
type Venue = 'wimbledon' | 'queens'
type Box = (x:number,y:number,z:number,w:number,h:number,d:number,colour:string,shadow?:boolean)=>void
export type VenuePrimitives = {
  scene: THREE.Scene; finishes: ReturnType<typeof createMiniatureMaterials>; box: Box
  place: (x:number,z:number,angle:number,scale:number,draw:()=>void)=>void
  tree: (x:number,z:number,size:number,shade:string)=>void
  court: (x:number,z:number,width?:number,depth?:number,apron?:number,surface?:ClubCourtSurface)=>void
  bowl: (x:number,z:number,tiers:number)=>void
  centreStand: (x:number,z:number,tiers:number)=>void
  smallerStand: (x:number,z:number,tiers:number)=>void
  queensStand: ()=>void
}
export const venueGeography = geography
const closed = (p:Point[])=>p.length>3 && p[0][0]===p[p.length-1][0] && p[0][1]===p[p.length-1][1]
export function inside(p:Point, polygon:Point[]) {
  let hit=false
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j]
    if((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit
  }
  return hit
}
export function footprint(points:Point[]) {
  const p=closed(points)?points.slice(0,-1):points
  let best={x:0,z:0,width:Infinity,depth:Infinity,angle:0,area:Infinity}
  for(let i=0;i<p.length;i++) {
    const next=p[(i+1)%p.length], angle=-Math.atan2(next[1]-p[i][1],next[0]-p[i][0]),c=Math.cos(angle),s=Math.sin(angle)
    const xs=p.map(([x,z])=>x*c-z*s),zs=p.map(([x,z])=>x*s+z*c)
    const l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...zs),b=Math.max(...zs),area=(r-l)*(b-t)
    if(area<best.area)best={x:(l+r)/2*c+(t+b)/2*s,z:-(l+r)/2*s+(t+b)/2*c,width:r-l,depth:b-t,angle,area}
  }
  if(best.width>best.depth) [best.width,best.depth,best.angle]=[best.depth,best.width,best.angle+Math.PI/2]
  return best
}
const random=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)}
const paint=['#b39a79','#c7b090','#b0876e','#d1bba0','#ad8269','#c4ad90','#9e775f']
const roofs=['#66736c','#52625c','#727d73','#5c6964']
const foliage=['#64814a','#769354','#8da260','#a0ad6e','#6d8b4d']

/** Draw mapped ground geometry; architectural decoration deliberately remains a miniature. */
export function createMappedVenue(id:Venue, api:VenuePrimitives) {
  const {scene,finishes,box,place,tree,court}=api
  const data=geography[id], features=data.features as unknown as Feature[]
  const venue=features.find(f=>id==='queens'?f.id===55149713:f.id===-4268203)!
  const buildings=features.filter(f=>f.tags.building && closed(f.points) && f.tags.building!=='roof')
  const roads=features.filter(f=>f.tags.highway && !['steps','platform','corridor'].includes(f.tags.highway))
  const pitches=features.filter(f=>f.tags.leisure==='pitch' && (f.tags.sport==='tennis'||/^Court No/.test(f.tags.name||'')) && closed(f.points))
  const grounds=venue?.points||[]
  const outlines=venue?.outlines||[grounds]
  const withinVenue=(p:Point)=>outlines.some(outline=>inside(p,outline))
  const geometryBatches=new Map<THREE.Material,THREE.BufferGeometry[]>()
  const mats=new Map<string,THREE.MeshStandardMaterial>()
  const mat=(colour:string,kind:'brick'|'roof'|'paving'|'grass'|'plain'='plain')=>{
    const key=kind+colour
    if(!mats.has(key)){
      const m=kind==='plain'?new THREE.MeshStandardMaterial({roughness:.9}):finishes[kind==='roof'?'slate':kind==='grass'?'parkGrass':kind].clone()
      m.color.set(colour); m.userData.castsShadow = kind === 'brick' || kind === 'roof'; mats.set(key,m)
    }
    return mats.get(key)!
  }
  function collect(g:THREE.BufferGeometry,m:THREE.Material) {
    const flat=g.index?g.toNonIndexed():g
    if(flat!==g)g.dispose()
    if(!geometryBatches.has(m))geometryBatches.set(m,[])
    geometryBatches.get(m)!.push(flat)
  }
  function shape(points:Point[],y:number,colour:string,kind:'paving'|'grass'|'roof'|'plain'='plain') {
    if(!closed(points))return
    const g=new THREE.ShapeGeometry(new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z))))
    g.rotateX(-Math.PI/2);g.translate(0,y,0)
    const uv=g.getAttribute('uv'), pos=g.getAttribute('position')
    for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/(kind==='grass'?220:kind==='roof'?3:24),pos.getZ(i)/(kind==='grass'?220:kind==='roof'?3:24))
    collect(g,mat(colour,kind))
  }
  function segment(a:Point,b:Point,width:number,y:number,colour:string,height=.06) {
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)
    if(length<.05)return
    place((a[0]+b[0])/2,(a[1]+b[1])/2,-Math.atan2(dz,dx),1,()=>box(0,y,0,length,height,width,colour,false))
  }
  const allGround=[[-1100,-1100],[1100,-1100],[1100,1100],[-1100,1100],[-1100,-1100]]
  shape(allGround,-.24,'#8fa777','grass')
  // Area geometry supplies the real park/garden/venue outlines, rather than a rectangular island.
  for(const f of features) {
    if(!closed(f.points)||f.tags.building||f.tags.leisure==='pitch'||f.tags.leisure==='stadium')continue
    if(f.tags.landuse==='residential')shape(f.points,-.18,'#abb396','grass')
    else if(['park','garden','recreation_ground'].includes(f.tags.leisure)||['grass','forest','cemetery','meadow'].includes(f.tags.landuse)||['wood','scrub','grassland'].includes(f.tags.natural))shape(f.points,-.12,f.tags.natural==='wood'?'#788e60':'#91a774','grass')
    else if(f.tags.natural==='water')shape(f.points,-.10,'#7d9e9a')
  }
  for(const outline of outlines)if(outline.length)shape(outline,-.14,id==='wimbledon'?'#c5c2aa':'#a1b180',id==='wimbledon'?'paving':'grass')
  const roadSegments:{a:Point;b:Point;width:number;path:boolean}[]=[]
  for(const f of roads) {
    if(f.tags.area==='yes') { shape(f.points,.01,'#c7c5b0','paving'); continue }
    const path=['footway','path','pedestrian','cycleway'].includes(f.tags.highway)
    const width=path?2.4:f.tags.highway==='service'?4.2:['primary','secondary','tertiary'].includes(f.tags.highway)?8:5.5
    for(let i=1;i<f.points.length;i++) {
      const a=f.points[i-1],b=f.points[i]
      segment(a,b,width+(path?.3:3.6),.01,'#ccc5b0')
      if(!path)segment(a,b,width,.065,'#85897e')
      roadSegments.push({a,b,width,path})
      const length=Math.hypot(b[0]-a[0],b[1]-a[1])
      if(!path && width>=8)for(let d=4;d<length-4;d+=9) {
        const point=(t:number)=>[a[0]+(b[0]-a[0])*t/length,a[1]+(b[1]-a[1])*t/length]
        segment(point(d),point(d+2.7),.14,.11,'#e4dfcb',.015)
      }
    }
  }
  // Mapped garden walls and fences tie the blocks to their actual plots.
  for (const f of features.filter(f=>f.tags.barrier)) {
    const kind=f.tags.barrier
    if(!['wall','retaining_wall','fence','hedge'].includes(kind))continue
    for(let i=1;i<f.points.length;i++) {
      const a=f.points[i-1],b=f.points[i]
      if(kind==='fence') {
        segment(a,b,.07,.8,'#536653',.07)
        segment(a,b,.07,1.5,'#536653',.07)
        const length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(1,Math.ceil(length/3))
        for(let n=0;n<=steps;n++)box(a[0]+(b[0]-a[0])*n/steps,.8,a[1]+(b[1]-a[1])*n/steps,.09,1.6,.09,'#536653',false)
      } else {
        segment(a,b,kind==='hedge'?.8:.28,.4,kind==='hedge'?'#64814a':'#b39a79',.8)
        if(kind!=='hedge')segment(a,b,.34,.83,'#d1c8b4',.08)
      }
    }
  }
  // Real building footprints, individually detailed with the same sash windows,
  // stone cornices, dormers and chimney pots as the Highbury miniature.
  for(const f of buildings) {
    if([698577938,698577939,225547271].includes(f.id))continue // Tournament stand models below.
    const b=footprint(f.points)
    if(b.area<9 || b.area>26000)continue
    const inVenue=withinVenue([b.x,b.z])
    const floors=Math.min(6,Math.max(1,Number(f.tags['building:levels'])||(f.tags.building==='apartments'?4:inVenue?2:id==='queens'?3:2)))
    const height=Math.min(24,Number.parseFloat(f.tags.height)||floors*2.8)
    const clubhouse=id==='queens' && f.id===698577941
    // Clubhouse colours and balcony detail reference the club's own About photograph:
    // https://www.queensclub.co.uk/About_the_Club.aspx
    const colour=clubhouse?'#ad7759':paint[Math.floor(random(f.id)*paint.length)], roofTone=clubhouse?'#796c59':roofs[Math.abs(f.id)%roofs.length]
    const sh=new THREE.Shape(f.points.slice(0,-1).map(([x,z])=>new THREE.Vector2(x,-z)))
    const g=new THREE.ExtrudeGeometry(sh,{depth:height,bevelEnabled:false,steps:1})
    g.rotateX(-Math.PI/2)
    const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/6,uv.getY(i)/6)
    collect(g,mat(colour,'brick'))
    shape(f.points,height+.035,roofTone,'roof')
    let polygonArea=0
    for(let i=1;i<f.points.length;i++)polygonArea+=f.points[i-1][0]*f.points[i][1]-f.points[i][0]*f.points[i-1][1]
    const coverage=Math.abs(polygonArea)/2/b.area
    for(let i=1;i<f.points.length;i++) {
      const a=f.points[i-1],c=f.points[i],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz)
      if(len<2)continue
      const sign=polygonArea>0?1:-1, nx=dz/len*sign,nz=-dx/len*sign
      segment(a,c,.26,height-.15,'#ded6c4',.28)
      segment(a,c,.22,.23,'#c2baa6',.46)
      for(let level=1;level<floors;level++)segment(a,c,.12,level*height/floors-.15,'#c2baa6',.12)
      // The long east-facing elevation overlooks the arena. Keep additions tied
      // to this mapped facade, rather than decorating neighbouring homes.
      if(clubhouse && len>20 && nx>.5) {
        place((a[0]+c[0])/2+nx*.65,(a[1]+c[1])/2+nz*.65,-Math.atan2(dz,dx),1,()=>{
          box(0,2.7,0,len,.18,1.5,'#d7d0ba')
          box(0,3.65,-sign*.7,len,.08,.08,'#344740',false)
          for(let rail=-len/2+.3;rail<len/2;rail+=.7)box(rail,3.2,-sign*.7,.045,.9,.045,'#344740',false)
          for(let bay=-len/2+2;bay<len/2;bay+=4) {
            box(bay,1.35,0,.15,2.7,.15,'#344740')
            box(bay,2.91,-sign*.7,1.7,.28,.36,'#3d5048')
            box(bay,3.15,-sign*.7,1.9,.32,.5,'#698454')
          }
        })
      }
      if(len<3.2)continue
      const columns=Math.max(1,Math.floor(len/3.0)),angle=-Math.atan2(dz,dx)
      for(let j=0;j<columns;j++) {
        const x=a[0]+dx*(j+.5)/columns+nx*.14,z=a[1]+dz*(j+.5)/columns+nz*.14
        place(x,z,angle,1,()=>{
          for(let level=0;level<floors;level++) {
            const y=1.5+level*(height/floors)
            box(0,y,0,1.1,1.55,.13,'#e4ddcd',false)
            box(0,y,0,.83,1.28,.20,'#456b63',false)
            box(0,y,0,.045,1.31,.25,'#e4ddcd',false)
            box(0,y,0,.88,.055,.25,'#e4ddcd',false)
            box(0,y-.8,0,1.27,.12,.38,'#ded6c4',false)
            box(-.58,y,0,.09,1.68,.30,'#ded6c4',false)
            box(.58,y,0,.09,1.68,.30,'#ded6c4',false)
            box(0,y+.84,0,1.3,.14,.32,'#ded6c4',false)
          }
          if(j%3===0){box(0,1.05,0,.86,2.1,.29,'#344c44');box(0,.12,0,1.4,.24,.9,'#ded6c4')}
        })
      }
    }
    if(coverage>.60 && b.width<32 && f.tags['roof:shape']!=='flat' && (!inVenue || clubhouse)) {
      const roofRise=Math.min(3.3,b.width*.30)
      collect(createFootprintRoof(f.points,b,height+.04,roofRise),mat(roofTone,'roof'))
      // Roof ridge runs along the long axis of each real footprint.
      place(b.x,b.z,b.angle+Math.PI/2,1,()=>{
        const width=b.depth,depth=b.width,rise=Math.min(3.3,depth*.36)
        for(const side of [-1,1]) {
          // A triangular prism closes both gable ends; roof surfaces carry slate relief.
          const roofShape=new THREE.Shape([new THREE.Vector2(-depth/2,0),new THREE.Vector2(0,rise),new THREE.Vector2(depth/2,0)])
          if(side===1 && coverage>.94){
            const gable=new THREE.ExtrudeGeometry(roofShape,{depth:.18,bevelEnabled:false})
            gable.rotateY(Math.PI/2);gable.translate(-width/2,height,0)
            const m=new THREE.Matrix4().makeRotationY(b.angle+Math.PI/2);m.setPosition(b.x,0,b.z);gable.applyMatrix4(m)
            collect(gable,mat(colour,'brick'))
          }
          box(0,height-.02,side*(depth/2+.15),width+.3,.12,.18,'#4d5e56')
          for(let d=-width/2+3;d<width/2-2;d+=6) {
            box(d,height+1.0,side*depth*.26,1.2,1.3,1.4,'#d6d0bf')
            box(d,height+1.0,side*(depth*.26+.73),.76,.92,.12,'#456b63')
            box(d,height+1.72,side*depth*.26,1.42,.18,1.65,roofTone)
          }
        }
        const chimneys=Math.max(1,Math.floor(width/9))
        for(let j=0;j<chimneys;j++) {
          const x=-width/2+(j+.5)*width/chimneys
          box(x,height+rise*.8,-depth*.15,.85,2.1,1.0,colour)
          box(x,height+rise*.8+1.08,-depth*.15,1.05,.16,1.2,'#d6d0bf')
          for(const dx of [-.23,.23])box(x+dx,height+rise*.8+1.43,-depth*.15,.18,.56,.18,'#aa7355')
        }
      })
    } else {
      // Complex mansion blocks retain their exact outline and get a restrained roof/parapet.
      for(let i=1;i<f.points.length;i++)segment(f.points[i-1],f.points[i],.35,height+.3,roofTone,.65)
      // Flat-roofed blocks get chimney stacks and lift housings so no roof reads as a bare slab.
      if(!inVenue&&b.width>6&&b.depth>6)place(b.x,b.z,b.angle,1,()=>{
        const r=random(f.id+7)
        box((r-.5)*b.width*.4,height+.9,(r*3%1-.5)*b.depth*.4,1.8,1.5,1.4,'#c9c2b2')
        for(const sx of [-1,1]){box(sx*b.width*.3,height+1.1,b.depth*.28,.8,1.9,.9,colour);for(const dx of [-.2,.2])box(sx*b.width*.3+dx,height+2.25,b.depth*.28,.16,.5,.16,'#aa7355')}
      })
      if(inVenue)place(b.x,b.z,b.angle,1,()=>{
        for(let z=-b.depth/2+5;z<b.depth/2-3;z+=9)for(const x of [-b.width*.18,b.width*.18]) {
          box(x,height+.22,z,1.65,.28,2.65,'#9aa89b')
          box(x,height+.38,z,1.35,.08,2.35,'#536d68')
        }
      })
    }
  }
  // Courts use mapped playing rectangles, including their actual orientation.
  const courtById=new Map<number,ReturnType<typeof footprint>>()
  for(const f of pitches) {
    const b=footprint(f.points)
    if(b.width>15||b.depth>29||b.width<8||b.depth<18)continue
    courtById.set(f.id,b)
    const featured=id==='wimbledon'?[1370859959,1370859960,1370859961,1370859962].includes(f.id):f.id===225547287
    place(b.x,b.z,b.angle,1,()=>{
      if(featured)box(0,.065,0,id==='wimbledon'?(f.id===1370859960?38:34):28,.08,id==='wimbledon'?(f.id===1370859960?60:52):44,'#3b6e4b',false)
      court(0,0,b.width/.88,b.depth/.88,featured?5:2.5,clubCourtSurface(f.tags.surface))
    })
  }
  const show=(pitchId:number,scale:number,draw:()=>void)=>{
    const b=courtById.get(pitchId);if(b)place(b.x,b.z,b.angle,scale,draw)
  }
  if(id==='wimbledon') {
    show(1370859960,1.45,()=>api.centreStand(0,0,5))
    show(1370859959,1.32,()=>api.bowl(0,0,5))
    show(1370859961,1.02,()=>api.smallerStand(0,0,3))
    show(1370859962,1.12,()=>api.smallerStand(0,0,3))
  } else show(225547287,.78,api.queensStand)
  const distance=(p:Point,a:Point,b:Point)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)))
    return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)
  }
  const stadiums=features.filter(f=>f.tags.leisure==='stadium' && closed(f.points))
  const blocked=(p:Point,r:number)=>stadiums.some(f=>inside(p,f.points)) || buildings.some(b=>inside(p,b.points)||b.points.some((a,i)=>i>0&&distance(p,b.points[i-1],a)<r)) || pitches.some(f=>inside(p,f.points)||f.points.some((a,i)=>i>0&&distance(p,f.points[i-1],a)<r+3)) || roadSegments.some(s=>distance(p,s.a,s.b)<s.width/2+r)
  const trees:Point[]=[]
  const plant=(p:Point,size:number,seed:number)=>{
    if(trees.some(t=>Math.hypot(p[0]-t[0],p[1]-t[1])<4.2))return
    trees.push(p);tree(p[0],p[1],size,foliage[seed%foliage.length])
  }
  for(const t of data.trees)plant(t.point,3.2+random(t.id)*1.7,t.id)
  // Supplementary garden/park planting is decorative; mapped buildings/roads/courts stay clear.
  const green=features.filter(f=>closed(f.points)&&(['park','garden'].includes(f.tags.leisure)||['wood','scrub'].includes(f.tags.natural)||['grass','forest','cemetery'].includes(f.tags.landuse)))
  for(let i=0;i<8000;i++) {
    const p=[(random(i+401)*2-1)*data.extent[0],(random(i+19001)*2-1)*data.extent[1]]
    const inGrounds=withinVenue(p),inGreen=green.some(g=>inside(p,g.points))
    if(inGrounds&&!inGreen)continue
    if(!inGreen && random(i+57)>.20)continue
    if(blocked(p,1.8))continue
    plant(p,2.6+random(i+94)*2.0,i)
    if(trees.length>=650)break
  }
  // Benches, street lamps and parked cars give the mapped streets a lived-in scale.
  for(const [index,s] of roadSegments.entries()) {
    const length=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]);if(s.path||length<18)continue
    const dx=(s.b[0]-s.a[0])/length,dz=(s.b[1]-s.a[1])/length
    for(let d=9;d<length-6;d+=24) {
      const side=index%2?1:-1,x=s.a[0]+d*dx-dz*(s.width/2+1)*side,z=s.a[1]+d*dz+dx*(s.width/2+1)*side
      box(x,2.5,z,.12,5,.12,'#4b5b50');box(x,5.05,z,.7,.18,.48,'#ded8c3')
      if(length>32)place(s.a[0]+(d+3)*dx-dz*(s.width/2-1)*side,s.a[1]+(d+3)*dz+dx*(s.width/2-1)*side,-Math.atan2(dz,dx),1,()=>{
        box(0,.65,0,3.8,1.0,1.55,['#767b70','#b5ad96','#4b686c','#92614f'][index%4]);box(0,1.3,0,2.1,.55,1.36,'#50686a')
        for(const x of [-1.15,1.15])for(const z of [-.78,.78])box(x,.34,z,.48,.48,.18,'#39433c')
      })
    }
  }
  // Merge irregular ground/building meshes by material; facade details remain instanced.
  for(const [m,geometries] of geometryBatches) {
    const merged=mergeGeometries(geometries,false)
    geometries.forEach(g=>g.dispose())
    if(merged){const mesh=new THREE.Mesh(merged,m);mesh.castShadow=Boolean(m.userData.castsShadow);mesh.receiveShadow=true;scene.add(mesh)}
  }
  const paths=roads.filter(f=>['footway','path','pedestrian'].includes(f.tags.highway)&&f.points.length>1&&f.points.every(p=>withinVenue(p))).sort((a,b)=>b.points.length-a.points.length).slice(0,4).map(f=>{
    const route=f.points.map(([x,z])=>new THREE.Vector3(x,0,z))
    // Walk back along the same mapped path instead of cutting across the closing chord.
    return [...route,...route.slice(1,-1).reverse()]
  })
  return {paths}
}

export function mappedCourtPosition(id:Venue,stop:string) {
  const ids:Record<Venue,Record<string,number>>={wimbledon:{centre:1370859960,'number-one':1370859959,'number-two':1370859962,'number-three':1370859961,outer:118182282},queens:{arena:225547287,'court-one':698577932,outer:698577930,practice:698577935}}
  const f=(geography[id].features as unknown as Feature[]).find(f=>f.id===ids[id][stop])
  return f?footprint(f.points):{x:0,z:0}
}
