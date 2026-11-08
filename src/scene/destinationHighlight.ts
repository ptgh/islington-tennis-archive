import * as THREE from 'three'
import {containsPoint,buildingHeight,type BoroughCell,type GeoFeature} from './boroughGeometry.ts'

/** Select a recorded footprint only; never approximate a missing building. */
export function destinationFeature(data:BoroughCell,x:number,z:number,park=false):GeoFeature|undefined {
 return (park?data.parks:data.buildings).find(f=>containsPoint(x,z,f.points)&&!f.holes?.some(h=>containsPoint(x,z,h)))
}
export function destinationGeometry(feature:GeoFeature,park=false){
 const shape=new THREE.Shape(feature.points.slice(0,-1).map(([x,z])=>new THREE.Vector2(x,-z)))
 for(const hole of feature.holes??[])shape.holes.push(new THREE.Path(hole.slice(0,-1).map(([x,z])=>new THREE.Vector2(x,-z))))
 const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);geometry.translate(0,park?.025:buildingHeight(feature.tags,feature.points)+.035,0);return geometry
}
/** Perimeter only: roof texture and ridge detail remain visible after arrival. */
export function destinationOutline(feature:GeoFeature,park=false){
 const y=park?.03:buildingHeight(feature.tags,feature.points)+.04,points:THREE.Vector3[]=[]
 for(const ring of [feature.points,...feature.holes??[]])for(let i=1;i<ring.length;i++)points.push(new THREE.Vector3(ring[i-1][0],y,ring[i-1][1]),new THREE.Vector3(ring[i][0],y,ring[i][1]))
 return new THREE.BufferGeometry().setFromPoints(points)
}
