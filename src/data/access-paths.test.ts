import test from 'node:test'
import assert from 'node:assert/strict'
import {connectAccessPaths,connectedWalkRoutes,crossingSegments,type AccessPath} from '../scene/accessPaths.ts'

test('short clear path gaps join at a split junction without moving source geometry',()=>{
 const paths:AccessPath[]=[
  {id:1,points:[[-10,0],[-2,0]],width:2.4,walkable:true},
  {id:2,points:[[0,-8],[0,8]],width:2.4,walkable:true},
 ]
 const before=structuredClone(paths),result=connectAccessPaths(paths,()=>true)
 assert.deepEqual(paths,before)
 assert.equal(result.links.length,1)
 assert.deepEqual(result.links[0].points,[[-2,0],[0,0]])
 assert.deepEqual(result.paths[1].points,[[0,-8],[0,0],[0,8]])
})

test('access links reject obstructions and long undocumented gaps',()=>{
 const paths:AccessPath[]=[
  {id:1,points:[[-20,0],[-2,0]],width:2.4,walkable:true},
  {id:2,points:[[0,-10],[0,10]],width:2.4,walkable:true},
 ]
 assert.equal(connectAccessPaths(paths,()=>false).links.length,0)
 assert.equal(connectAccessPaths(paths,()=>true,1).links.length,0)
 assert.ok(crossingSegments([-2,0],[0,0],[-1,-4],[-1,4]))
 assert.equal(crossingSegments([-2,0],[0,0],[1,-4],[1,4]),false)
})

test('access links to streets stop at the pavement instead of the traffic lane',()=>{
 const result=connectAccessPaths([
  {id:1,points:[[7,0],[20,0]],width:2.4,walkable:true},
  {id:2,points:[[0,-30],[0,30]],width:4,walkable:false},
 ],()=>true)
 assert.equal(result.links.length,1)
 assert.deepEqual(result.links[0].points[1],[2.4,0])
 assert.equal(result.paths[1].walkable,false)
})

test('pedestrian circuits use connected path edges at every junction and turnround',()=>{
 const {paths,links}=connectAccessPaths([
  {id:1,points:[[-10,0],[-2,0]],width:2.4,walkable:true},
  {id:2,points:[[0,-8],[0,0],[0,8]],width:2.4,walkable:true},
  {id:3,points:[[0,0],[10,0],[10,10]],width:2.4,walkable:true},
 ],()=>true)
 const network=[...paths,...links],routes=connectedWalkRoutes(network)
 const edge=(a:number[],b:number[])=>[a.join(','),b.join(',')].sort().join(':')
 const edges=new Set(network.flatMap(p=>p.points.slice(1).map((b,i)=>edge(p.points[i],b))))
 assert.equal(routes.length,4)
 for(const route of routes){
  assert.ok(route.length>4,'a walk reaches beyond one isolated path')
  for(let i=0;i<route.length;i++)assert.ok(edges.has(edge(route[i],route[(i+1)%route.length])),'every step, including closure, stays on a path')
 }
})
