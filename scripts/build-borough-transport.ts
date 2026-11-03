import fs from 'node:fs'
import { busRoutes } from '../src/data/busRoutes.ts'
import { boroughGeography, boroughBounds, type BoroughCell } from '../src/scene/boroughGeometry.ts'
import { boroughRoadProfile } from '../src/scene/boroughStreetEdges.ts'
import { projectPoint } from '../src/scene/courtGeometry.ts'

// Derive illustrative transport geometry from the same carriageways as the tiles.
// Published TfL points guide the corridor; shortest road links replace chords
// between stops. No footways, service alleys or unsupported geography are joined.
type Point=[number,number]
const points:Point[]=[],edges:Map<number,number>[]=[] ,ids=new Map<string,number>()
function node(p:number[]){const key=p.map(v=>v.toFixed(3)).join(',');let id=ids.get(key);if(id===undefined){id=points.length;ids.set(key,id);points.push([p[0],p[1]]);edges.push(new Map())}return id}
for(const cell of boroughGeography.cells){
 const data=JSON.parse(fs.readFileSync('public/'+cell.url,'utf8')) as BoroughCell
 for(const road of data.roads){const profile=boroughRoadProfile(road.kind);if(profile.walking||profile.width<.5||!['primary','secondary','tertiary','trunk','primary_link','secondary_link','residential','unclassified','living_street'].includes(road.kind??''))continue
  for(let i=1;i<road.points.length;i++){const a=node(road.points[i-1]),b=node(road.points[i]),d=Math.hypot(points[a][0]-points[b][0],points[a][1]-points[b][1]);if(d>0){edges[a].set(b,d);edges[b].set(a,d)}}
 }
}
function nearest(p:Point){let id=0,best=Infinity;points.forEach((q,i)=>{const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<best){best=d;id=i}});return id}
function shortest(a:number,b:number){
 const costs=new Map([[a,0]]),previous=new Map<number,number>(),open=new Set([a])
 while(open.size){let current=-1,best=Infinity;for(const id of open){const cost=costs.get(id)!+Math.hypot(points[id][0]-points[b][0],points[id][1]-points[b][1]);if(cost<best){best=cost;current=id}}
  if(current===b){const result=[b];while(result[0]!==a)result.unshift(previous.get(result[0])!);return result}
  open.delete(current)
  for(const [next,length] of edges[current]){const cost=costs.get(current)!+length;if(cost<(costs.get(next)??Infinity)){costs.set(next,cost);previous.set(next,current);open.add(next)}}
 }
 throw Error(`Disconnected carriageway ${a} -> ${b}`)
}
const result:Record<string,Point[]>={}
for(const route of busRoutes){
 const stops=route.points.map(([lng,lat])=>projectPoint(lng,lat) as Point).filter(([x,z])=>x>boroughBounds.minX+1&&x<boroughBounds.maxX-1&&z>boroughBounds.minZ+1&&z<boroughBounds.maxZ-1)
 const path:number[]=[]
 for(const stop of stops){const id=nearest(stop);if(!path.length)path.push(id);else if(path.at(-1)!==id)path.push(...shortest(path.at(-1)!,id).slice(1))}
 result[route.id]=path.map(id=>points[id])
 console.log(route.id,result[route.id].length,'source road vertices')
}
fs.writeFileSync('src/data/borough-transport.json',JSON.stringify(result)+'\n')
