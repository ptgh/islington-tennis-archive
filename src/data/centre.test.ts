import test from 'node:test';
import assert from 'node:assert/strict';
import {centreCoaches,centreSessions} from './centre.ts';
import {parseForecast,weatherKind,weatherLabel} from './weather.ts';
test('centre directory preserves all 14 distinct registered coaches and usable UK contact numbers',()=>{
 assert.equal(centreCoaches.length,14);assert.equal(new Set(centreCoaches.map(c=>c.name)).size,14);
 for(const c of centreCoaches){assert.match(c.phone.replace(/\s/g,''),/^07\d{9}$/);assert.ok([3,4].includes(c.level));}
 assert.equal(centreSessions.length,4);
});

test('fresh current conditions take precedence over an older hourly forecast',()=>{
 const now=Date.UTC(2026,9,24,16,50),hour=Math.floor(now/3600000)*3600000;
 const hourly={time:[hour/1000,(hour+3600000)/1000],temperature_2m:[14,13],precipitation_probability:[80,90],wind_speed_10m:[5,9],weather_code:[2,61]};
 const current={time:(now-300000)/1000,temperature_2m:12.6,wind_speed_10m:18.1,weather_code:61};
 const rows=parseForecast({hourly,current},now);
 assert.equal(rows[0].code,61);assert.equal(rows[0].wind,18.1);assert.equal(rows[0].time,now-300000);
 assert.equal(rows[1].time,hour+3600000);
 assert.equal(parseForecast({hourly,current:{...current,time:(now-7200000)/1000}},now)[0].code,2,'stale current conditions do not override the hourly forecast');
 assert.equal(parseForecast({hourly,current:{...current,wind_speed_10m:null}},now)[0].code,2,'missing readings are not coerced into calm conditions');
});
test('forecast rejects missing values and stale data rather than showing fabricated clear weather',()=>{
 const now=Date.UTC(2026,8,22,10);
 const h={time:[now/1000-7200,now/1000,now/1000+3600],temperature_2m:[17,18,null],precipitation_probability:[0,70,20],wind_speed_10m:[4,7,9],weather_code:[0,61,2]};
 assert.deepEqual(parseForecast({hourly:h},now),[{time:now,temperature:18,rain:70,wind:7,code:61}]);
 assert.throws(()=>parseForecast({},now));assert.throws(()=>parseForecast({hourly:h},now+86400000));
 assert.equal(weatherKind(61),'rain');assert.equal(weatherKind(51),'rain');assert.equal(weatherLabel(51),'Drizzle');assert.equal(weatherLabel(61),'Rain / showers');assert.equal(weatherKind(75),'snow');assert.equal(weatherKind(3),'cloud');assert.equal(weatherKind(0),'clear');
});
