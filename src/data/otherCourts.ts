/** Tennis courts on the source map that no listed venue covers. Names come from the
 * OpenStreetMap park, school or street each court sits in (checked 8 November 2026).
 * They are labelled so nothing on the map is anonymous, not checked for public use. */
export type OtherCourtSite={id:string;name:string;note?:string;courtIds:number[]}
export const otherCourtSites:OtherCourtSite[]=[
 {id:"parliament-hill",name:"Parliament Hill",courtIds:[369759632,369759634,369759636,369759638,369759639,369759640,369759643,369759645,369759647,369759649]},
 {id:"clissold-park",name:"Clissold Park",courtIds:[375152873,375152875,375152876,375152878,375152879,375152880,375152881,375152882,375152884,375152887]},
 {id:"finsbury-park",name:"Finsbury Park",courtIds:[376166099,376166101,376166103,376166860,376166861,376166862,376166863,706583704]},
 {id:"waterlow-park",name:"Waterlow Park",courtIds:[375395533,375395534,375395535,375395536,375395537,375395538]},
 {id:"channing-school",name:"Channing School",note:"School courts",courtIds:[447921160,447921161,1368073603,1368073604,1368073605]},
 {id:"cartwright-gardens",name:"Cartwright Gardens",courtIds:[803099055,803099056,1024496319,1024496320]},
 {id:"regents-park",name:"The Regent's Park",courtIds:[1339500076,1339500085,1339500086,1339500087]},
 {id:"la-sainte-union",name:"La Sainte Union School",note:"School courts",courtIds:[1384560789,1384560792,1384560794,1384560796]},
 {id:"camden-street",name:"Camden Street",courtIds:[1392165419,1392165420,1392165421,1392165422]},
 {id:"golden-lane",name:"Golden Lane Estate",courtIds:[191261853,1182277530]},
 {id:"parliament-hill-school",name:"Parliament Hill School",note:"School courts",courtIds:[371353113,1417528882,1417528881]},
 {id:"broadlands-close",name:"Broadlands Close",courtIds:[848197892,1364730979]},
 {id:"stationers-park",name:"Stationers Park",courtIds:[1377238737,1377238738]},
 {id:"aske-gardens",name:"Aske Gardens",courtIds:[26980315]},
 {id:"lewis-street",name:"Lewis Street",courtIds:[416095810]},
 {id:"mecklenburgh-square",name:"Mecklenburgh Square",note:"Private garden",courtIds:[804380092]},
 {id:"maria-fidelis",name:"Maria Fidelis School",note:"School courts",courtIds:[1423690318]},
]
