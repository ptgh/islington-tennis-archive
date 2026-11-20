/** Public entrance nodes checked against OSM and TfL/National Rail, 19–20 Nov 2026.
 * Facing follows the matching stored facade; miniature portals are illustrative.
 * These are street arrivals, not an accessibility or opening-hours survey. */
export const stationEntrances = [
 {name:'Angel',node:1623696416,lat:51.5328099,lng:-.1058855,building:1092651671,edge:5,facing:2.7553783607601803,network:'underground',source:'https://tfl.gov.uk/tube/stop/940GZZLUAGL/angel-underground-station/'},
 {name:'Farringdon',node:5466543649,lat:51.5201248,lng:-.1047432,building:577276951,edge:69,facing:.46285799695222785,network:'underground',source:'https://tfl.gov.uk/tube/stop/940GZZLUFCN/farringdon-underground-station/'},
 {name:'Dalston Kingsland',node:2928924407,lat:51.5481612,lng:-.0756041,building:431106363,canopy:289338100,canopyPosts:[0,6,7,8],edge:22,facing:1.4795015190445349,network:'overground',source:'https://www.nationalrail.co.uk/stations/dalston-kingsland/'},
 {name:'Highbury & Islington',node:2162923164,lat:51.5461059,lng:-.1036336,building:684593883,edge:18,facing:1.830860410470193,width:.84,network:'underground',source:'https://tfl.gov.uk/hub/stop/HUBHHY/highbury-islington-station/'},
 {name:'Holloway Road',node:5482917772,lat:51.5528480,lng:-.1128039,building:152992923,edge:6,facing:2.172738547835721,width:.64,network:'underground',source:'https://tfl.gov.uk/tube/stop/940GZZLUHWY/holloway-road-underground-station/'},
 {name:'Arsenal',node:186186683,lat:51.5584284,lng:-.1056554,building:170569184,canopy:170569182,canopyPosts:[0,4,5,6],edge:12,facing:.5008108801017448,width:.6,network:'underground',source:'https://tfl.gov.uk/tube/stop/940GZZLUASL/arsenal-underground-station/'},
 {name:'Canonbury',node:2438226689,lat:51.5486987,lng:-.0920636,building:198283373,edge:7,facing:1.657353632057896,width:.54,network:'overground',source:'https://www.nationalrail.co.uk/stations/canonbury/'},
 {name:'Essex Road',node:5678327576,lat:51.5406960,lng:-.0962645,building:68510590,edge:0,facing:2.502971109815146,width:.6,network:'rail',source:'https://www.nationalrail.co.uk/stations/essex-road/'},
] as const;

export function stationArrival(name:string|undefined,lat:number,lng:number,zoom?:number){
 const entrance=stationEntrances.find(e=>e.name===name);
 return entrance?{lat:entrance.lat,lng:entrance.lng,zoom:45}:{lat,lng,zoom};
}
