import test from 'node:test';
import assert from 'node:assert/strict';
import {filterVenues, venues} from './venues.ts';

test('borough results exclude nearby clubs and do not inflate bookable inventory',()=>{
  const borough=filterVenues(venues,'','all',false);
  assert.equal(borough.length,6);
  const bookable=borough.filter(v=>v.action==='book');
  assert.equal(bookable.length,4);
  assert.equal(bookable.reduce((sum,v)=>sum+(v.courts??0),0),23);
  assert.equal(new Set(venues.map(v=>v.id)).size,venues.length);
});

test('public and restricted filters preserve access boundaries',()=>{
  const publicCourts=filterVenues(venues,'','public',true);
  assert.ok(publicCourts.every(v=>v.access==='public'));
  assert.ok(!publicCourts.some(v=>v.id==='elizabeth-garrett-anderson'));
  assert.equal(filterVenues(venues,'','restricted',false).length,1);
  assert.equal(filterVenues(venues,'','restricted',true).length,3);
  assert.ok(venues.filter(v=>v.access!=='public').every(v=>v.action!=='book'));
});

test('search supports multiple case-insensitive terms and nearby opt-in',()=>{
  assert.deepEqual(filterVenues(venues,' HIGHBURY fields ','all',false).map(v=>v.id),['highbury-fields']);
  assert.deepEqual(filterVenues(venues,'Caledonian','all',false).map(v=>v.id),['islington-tennis-centre']);
  assert.equal(filterVenues(venues,'coolhurst','all',false).length,0);
  assert.equal(filterVenues(venues,'coolhurst','all',true).length,1);
  assert.equal(filterVenues(venues,'imaginary tennis court','all',true).length,0);
});

test('every listing has an external source and appropriate handoff',()=>{
  for(const venue of venues){
    assert.equal(new URL(venue.actionUrl).protocol,'https:');
    assert.ok(venue.sources.length>0);
    venue.sources.forEach(source=>assert.equal(new URL(source.url).protocol,'https:'));
    assert.ok(venue.lat>51.50&&venue.lat<51.60);
    assert.ok(venue.lng>-.17&&venue.lng<-.06);
  }
  const shared=venues.find(v=>v.id==='spa-fields')!;
  assert.equal(shared.courts,null);
  assert.equal(shared.action,'visit');
});
