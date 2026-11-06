import test from 'node:test'
import assert from 'node:assert/strict'
import {connectRoadRun,sampleRoadRun} from '../scene/connectedRoadRuns.ts'
import {roadLifePose,type LifeRoute} from '../scene/boroughLifePaths.ts'
const seed:LifeRoute={a:[.33,0],b:[4.67,0],width:.75,length:4.34,seed:0,sourceId:'1'}
const roads=[{id:'1:0',points:[[0,0],[5,0]]},{id:'1:1',points:[[5,0],[5,5]]},{id:'2:0',points:[[5,5],[20,5]]}]
test('connected runs follow consecutive source vertices, round within the carriageway and never change road',()=>{
 const run=connectRoadRun(seed,roads,()=>true);assert.ok(run.length>9&&run.points!.length>10);assert.ok(run.points!.every(([x,z])=>x<=5&&z<=5));
 let previous=sampleRoadRun(run,0)
 for(let d=.01;d<=run.length;d+=.01){const p=sampleRoadRun(run,d);assert.ok(Math.min(Math.abs(p.z),Math.abs(p.x-5))<.12);assert.ok(Math.hypot(p.x-previous.x,p.z-previous.z)<.012);const yaw=Math.atan2(p.dx,p.dz)-Math.atan2(previous.dx,previous.dz);assert.ok(Math.abs(Math.atan2(Math.sin(yaw),Math.cos(yaw)))<.1);previous=p}
 const middle=roadLifePose(run,run.length, .5);assert.ok(Number.isFinite(middle.heading));
})
test('missing road vertices and blocked junctions retain the safe original run',()=>{
 assert.equal(connectRoadRun(seed,[roads[0],roads[2]],()=>true),seed)
 assert.equal(connectRoadRun(seed,roads,(_x,z)=>z<.1),seed)
 assert.equal(connectRoadRun({...seed,sourceId:undefined},roads,()=>true).points,undefined)
})
