import test from 'node:test';
import assert from 'node:assert/strict';
import {mapStations,stationNetwork} from './transit.ts';

test('station symbols distinguish rail operators from similarly named Tube lines',()=>{
 assert.equal(stationNetwork('Great Northern · National Rail'),'rail');
 assert.equal(stationNetwork('Northern · National Rail'),'underground');
 for(const name of ['Essex Road','Drayton Park','Harringay'])assert.equal(stationNetwork(mapStations.find(s=>s.name===name)!.lines),'rail');
});
test('Overground-only stations keep their mode while Tube interchanges retain Underground',()=>{
 for(const name of ['Canonbury','Dalston Kingsland','Caledonian Road & Barnsbury'])assert.equal(stationNetwork(mapStations.find(s=>s.name===name)!.lines),'overground');
 for(const name of ['Highbury & Islington','Euston','Liverpool Street'])assert.equal(stationNetwork(mapStations.find(s=>s.name===name)!.lines),'underground');
 assert.equal(stationNetwork('Elizabeth line · National Rail'),'elizabeth');
});
