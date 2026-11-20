import * as THREE from 'three'
import {containsPoint,buildingHeight,type BoroughCell,type GeoFeature} from './boroughGeometry.ts'
import {places} from '../data/places.ts'
import {stationEntrances} from '../data/stationEntrances.ts'

// Label anchors clear the illustrative crowns rather than covering the lift,
// clock or artwork. These are scene coordinates, not measured building heights.
const labelHeights:Record<string,number>={
 'kings-cross-station':3.55,'st-pancras-station':3.2,'british-library':1.65,
 'standard-hotel':3.45,'bt-tower':9.15,'newton-sculpture':.65,'paradigm-sculpture':1.55,
}
export function destinationLabelHeight(point:{name:string;lat:number;lng:number;wildlife?:boolean}){
 if(point.wildlife)return .3
 if(stationEntrances.some(e=>e.name===point.name&&Math.abs(e.lat-point.lat)<1e-6&&Math.abs(e.lng-point.lng)<1e-6))return .9
 const place=places.find(p=>p.name===point.name&&Math.abs(p.lat-point.lat)<1e-6&&Math.abs(p.lng-point.lng)<1e-6)
 return place?labelHeights[place.id]??.3:.3
}

/** Select a recorded footprint only; never approximate a missing building. */
export function destinationFeature(data:BoroughCell,x:number,z:number,park=false):GeoFeature|undefined {
 return (park?data.parks:data.buildings).find(f=>containsPoint(x,z,f.points)&&!f.holes?.some(h=>containsPoint(x,z,h)))
}
export function destinationGeometry(feature:GeoFeature,park=false){
 const shape=new THREE.Shape(feature.points.slice(0,-1).map(([x,z])=>new THREE.Vector2(x,-z)))
 for(const hole of feature.holes??[])shape.holes.push(new THREE.Path(hole.slice(0,-1).map(([x,z])=>new THREE.Vector2(x,-z))))
 const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);geometry.translate(0,park?.025:perimeterHeight(feature)+.035,0);return geometry
}
/** Architectural massing can end below a tower crown. Attach selection to the
 * perimeter's eaves, instead of floating the entire outline at the tallest point. */
function perimeterHeight(feature:GeoFeature){
 const scale=Number(feature.id)===-72165470?.36:Number(feature.id)===4256246?.54:Number(feature.id)===4680891?.46:Number(feature.id)===5022282?.95:1;
 return buildingHeight(feature.tags,feature.points)*scale;
}
/** Perimeter only: roof texture and ridge detail remain visible after arrival. */
export function destinationOutline(feature:GeoFeature,park=false){
 const y=park?.03:perimeterHeight(feature)+.04,points:THREE.Vector3[]=[]
 for(const ring of [feature.points,...feature.holes??[]])for(let i=1;i<ring.length;i++)points.push(new THREE.Vector3(ring[i-1][0],y,ring[i-1][1]),new THREE.Vector3(ring[i][0],y,ring[i][1]))
 return new THREE.BufferGeometry().setFromPoints(points)
}
