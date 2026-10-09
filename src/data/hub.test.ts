import test from 'node:test';
import assert from 'node:assert/strict';
import { hubServices, mappedServices, servicesForVenue } from './hub.ts';
import { venues } from './venues.ts';
import { busRoutes } from './busRoutes.ts';

test('coaching providers resolve to existing courts, including both centre options',()=>{
  for(const service of hubServices.filter(s=>s.kind==='coaching')){
    assert.ok(service.venueId);
    assert.ok(venues.some(v=>v.id===service.venueId),service.name);
  }
  assert.equal(servicesForVenue('islington-tennis-centre').filter(s=>s.registeredCoach).length,14);
  assert.ok(servicesForVenue('islington-tennis-centre').some(s=>s.id==='better-courses'));
  assert.equal(servicesForVenue('tufnell-park').length,0);
});

test('collection services never become shop pins and mapped shops have addresses',()=>{
  assert.ok(!mappedServices.some(s=>s.id==='sweet-spot-stringer'));
  for(const service of mappedServices){
    assert.ok(service.address);
    assert.ok(service.lat>51.50&&service.lat<51.60);
    assert.ok(service.lng>-.17&&service.lng<-.06);
  }
});

test('hub handoffs remain sourced external links',()=>{
  assert.equal(new Set(hubServices.map(s=>s.id)).size,hubServices.length);
  for(const service of hubServices){
    assert.equal(new URL(service.url).protocol,'https:');
    assert.ok(service.sources.length>0);
    assert.ok(service.note);
  }
});

test('bus paths can be rendered without invalid coordinates or duplicate segments',()=>{
  assert.equal(new Set(busRoutes.map(r=>r.id)).size,busRoutes.length);
  for(const route of busRoutes){
    assert.equal(new URL(route.url).hostname,'tfl.gov.uk');
    assert.ok(route.points.length>=2);
    route.points.forEach(([lng,lat],i)=>{
      assert.ok(Number.isFinite(lng)&&Number.isFinite(lat));
      assert.ok(lng>=-.17&&lng<=-.06&&lat>=51.51&&lat<=51.60);
      if(i)assert.notDeepEqual(route.points[i],route.points[i-1]);
    });
  }
});
