import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchForecast,parseForecast} from './weather.ts';
const payload=()=>({hourly:{time:[Math.floor(Date.now()/1000)],temperature_2m:[12],precipitation_probability:[25],weather_code:[3],wind_speed_10m:[8]}});
test('forecast retries a provider failure and bypasses stale HTTP cache',async()=>{
 let calls=0;
 const request:typeof fetch=async(_url,init)=>{assert.equal(init?.cache,'no-store');calls++;return calls===1?new Response('',{status:503}):Response.json(payload());};
 const rows=await fetchForecast(new AbortController().signal,request);
 assert.equal(calls,2);assert.equal(rows[0].temperature,12);
});
test('forecast rejects invalid or expired data and bounds retry count',async()=>{
 assert.throws(()=>parseForecast({hourly:{time:[1],temperature_2m:[12],precipitation_probability:[25],weather_code:[3],wind_speed_10m:[8]}}));
 let calls=0;
 await assert.rejects(fetchForecast(new AbortController().signal,async()=>{calls++;return Response.json({hourly:{time:[]}});}));
 assert.equal(calls,2);
});
test('forecast cancellation prevents retries',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(fetchForecast(controller.signal,async()=>{calls++;controller.abort();throw Error('aborted');}));
 assert.equal(calls,1);
});
