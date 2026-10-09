import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFavourites} from './favourites.ts';
import {filterPlayOpportunities,playOpportunities} from './play.ts';
test('favourites tolerate corrupt storage and discard stale or duplicate court IDs',()=>{
 assert.deepEqual(parseFavourites('broken',['a']),[]);
 assert.deepEqual(parseFavourites('{"a":true}',['a']),[]);
 assert.deepEqual(parseFavourites('["a","a",null,"old"]',['a']),['a']);
});
test('today uses London date at the summer midnight boundary and preserves venue filtering',()=>{
 const friday=new Date('2026-09-25T22:59:00Z');
 const saturday=new Date('2026-09-25T23:01:00Z');
 assert.deepEqual(filterPlayOpportunities(playOpportunities,'today',null,friday).map(x=>x.id),['islington-social-adults']);
 assert.ok(filterPlayOpportunities(playOpportunities,'today',null,saturday).some(x=>x.id==='highbury-mix-ins'));
 assert.equal(filterPlayOpportunities(playOpportunities,'today','rosemary-gardens',friday).length,0);
 assert.ok(filterPlayOpportunities(playOpportunities,'today',null,saturday).every(x=>x.kind==='social'));
});
