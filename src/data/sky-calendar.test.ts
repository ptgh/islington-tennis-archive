import test from 'node:test'
import assert from 'node:assert/strict'
import { sunTimes,moonPhase,nextFullMoon,moonPosition } from './skyCalendar.ts'
import { lightCycle,skyPosition } from '../scene/sceneAtmosphere.ts'

// US Naval Observatory, Islington 51.54,-0.105, 2 November 2026:
// sunrise 06:56 UTC, sunset 16:32 UTC; waning crescent, 43% illuminated at noon.
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-11-02&coords=51.54,-0.105&tz=0
test('Islington sun times agree with the USNO reference to within three minutes',()=>{
 const date=new Date('2026-11-02T12:00:00Z'),sun=sunTimes(date)
 assert.ok(sun.sunrise&&sun.sunset)
 assert.ok(Math.abs(sun.sunrise-Date.parse('2026-11-02T06:56:00Z'))<180000)
 assert.ok(Math.abs(sun.sunset-Date.parse('2026-11-02T16:32:00Z'))<180000)
 const phase=moonPhase(date)
 assert.equal(phase.waxing,false);assert.equal(phase.name,'Waning crescent')
 assert.ok(Math.abs(phase.illumination-.43)<.02)
})
test('sunrise and sunset respect the London date at BST midnight and on DST changes',()=>{
 for(const iso of ['2026-07-12T23:30:00Z','2026-03-29T12:00:00Z','2026-10-25T12:00:00Z']){
  const date=new Date(iso),sun=sunTimes(date)
  const day=(value:number|Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(value)
  assert.ok(sun.sunrise&&sun.sunset);assert.equal(day(sun.sunrise),day(date));assert.equal(day(sun.sunset),day(date))
  assert.ok(sun.sunrise<sun.sunset)
 }
})
test('lunar cycle distinguishes new, waxing and full moon, and always finds a future full moon',()=>{
 assert.equal(moonPhase(new Date('2026-11-09T07:02:00Z')).name,'New moon')
 assert.equal(moonPhase(new Date('2026-11-12T12:00:00Z')).name,'Waxing crescent')
 assert.equal(moonPhase(new Date('2026-11-24T14:53:00Z')).name,'Full moon')
 const next=nextFullMoon(new Date('2026-11-02T12:00:00Z'))
 assert.equal(next.toISOString().slice(0,10),'2026-11-24')
 const after=nextFullMoon(new Date(next.getTime()+1000))
 assert.ok(after.getTime()>next.getTime()+27*86400000)
})
test('explicit sunrise and sunset previews retain low warm light rather than switching to noon',()=>{
 const sunrise=sunTimes(new Date('2026-11-02T12:00:00Z')).sunrise!
 const date=new Date(sunrise),cycle=lightCycle(date,false,'clear',true),noon=lightCycle(new Date('2026-11-02T12:00:00Z'),false,'clear',true)
 assert.ok(skyPosition(date).sun.y<0,'apparent sunrise includes atmospheric refraction')
 assert.equal(cycle.preview,false);assert.ok(cycle.direct<noon.direct);assert.ok(cycle.warmth>noon.warmth)
 assert.ok(cycle.ambient<noon.ambient)
 assert.equal(lightCycle(date,false,'clear').preview,true,'explicit Day still supports a noon preview')
})
test('moon bearings use north clockwise and report whether the moon is above the horizon',()=>{
 let above=false,below=false
 for(let hour=0;hour<24;hour++){
  const date=new Date(Date.UTC(2026,10,3,hour)),p=moonPosition(date),moon=skyPosition(date,{lat:51.54,lng:-.105}).moon
  assert.ok(p.bearing>=0&&p.bearing<360)
  assert.ok(Math.abs(Math.cos(p.bearing*Math.PI/180)*Math.cos(p.elevation*Math.PI/180)+moon.z)<1e-8)
  assert.equal(p.aboveHorizon,moon.y>0)
  above||=p.aboveHorizon;below||=!p.aboveHorizon
 }
 assert.ok(above&&below)
})
