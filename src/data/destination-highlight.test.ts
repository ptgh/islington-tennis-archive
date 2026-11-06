import test from 'node:test'
import assert from 'node:assert/strict'
import {destinationFeature,destinationGeometry} from '../scene/destinationHighlight.ts'
const feature={id:1,points:[[0,0],[4,0],[4,4],[0,4],[0,0]],holes:[[[1,1],[2,1],[2,2],[1,2],[1,1]]],tags:{height:'12'}}
const data={buildings:[feature],parks:[],roads:[],water:[],railways:[],trees:[]}
test('arrival highlight selects the actual containing footprint and respects courtyards',()=>{assert.equal(destinationFeature(data,.5,.5),feature);assert.equal(destinationFeature(data,1.5,1.5),undefined);assert.equal(destinationFeature(data,5,5),undefined);assert.equal(destinationFeature(data,.5,.5,true),undefined)})
test('arrival highlight geometry retains source coordinates and holes at roof height',()=>{const g=destinationGeometry(feature);try{g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox!.min.y-1.235)<1e-5);assert.equal(g.boundingBox!.min.x,0);assert.equal(g.boundingBox!.max.x,4);const p=g.getAttribute('position');for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i))&&Number.isFinite(p.getZ(i)))}finally{g.dispose()}})
