/** Public entrance nodes checked against OSM and TfL/National Rail, 19–20 Nov 2026.
 * Facing follows the matching stored facade; miniature portals are illustrative.
 * These are street arrivals, not an accessibility or opening-hours survey. */
export const stationEntrances = [
 {name:'Angel',node:1623696416,lat:51.5328099,lng:-.1058855,building:1092651671,edge:5,facing:2.7553783607601803,network:'underground',source:'https://tfl.gov.uk/tube/stop/940GZZLUAGL/angel-underground-station/'},
 {name:'Farringdon',node:5466543649,lat:51.5201248,lng:-.1047432,building:577276951,edge:69,facing:.46285799695222785,network:'underground',source:'https://tfl.gov.uk/tube/stop/940GZZLUFCN/farringdon-underground-station/'},
 {name:'Dalston Kingsland',node:2928924407,lat:51.5481612,lng:-.0756041,building:431106363,canopy:289338100,edge:22,facing:1.4795015190445349,network:'overground',source:'https://www.nationalrail.co.uk/stations/dalston-kingsland/'},
 {name:'Highbury & Islington',node:2162923164,lat:51.5461059,lng:-.1036336,building:684593883,edge:18,facing:1.830860410470193,width:.84,network:'underground',source:'https://tfl.gov.uk/hub/stop/HUBHHY/highbury-islington-station/'},
 {name:'Holloway Road',node:5482917772,lat:51.5528480,lng:-.1128039,building:152992923,edge:6,facing:2.172738547835721,width:.64,network:'underground',source:'https://tfl.gov.uk/tube/stop/940GZZLUHWY/holloway-road-underground-station/'},
] as const;

export function stationArrival(name:string|undefined,lat:number,lng:number,zoom?:number){
 const entrance=stationEntrances.find(e=>e.name===name);
 return entrance?{lat:entrance.lat,lng:entrance.lng,zoom:45}:{lat,lng,zoom};
}
