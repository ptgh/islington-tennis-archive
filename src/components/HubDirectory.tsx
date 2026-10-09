import { SelectField } from './SelectField';
import { CentreProgramme } from './CentreProgramme';
import { useEffect, useRef, useState } from 'react';
import { hubServices, HUB_VERIFIED_DATE, type HubSection, type HubService } from '../data/hub';
import { busRoutes, BUS_ROUTES_VERIFIED_DATE, type BusRoute } from '../data/busRoutes';
import { Icon } from './Icon';

export function HubNavigation({section,onChange}:{section:HubSection;onChange:(value:HubSection)=>void}) {
  return <nav className="hub-navigation" aria-label="Explore the tennis hub">{(['courts','play','coaching','gear','buses'] as const).map(id=><button key={id} data-section={id} aria-current={section===id?'page':undefined} onClick={()=>onChange(id)}>{id==='courts'?'Courts':id==='play'?'Play together':id==='coaching'?'Coaching':id==='gear'?'Gear':'Bus routes'}</button>)}</nav>;
}

export function HubDirectory({section,onService,onRoute,onRacquets,venueId,onClearVenue}:{venueId?:string|null;onClearVenue?:()=>void;section:Exclude<HubSection,'courts'|'play'>;onService:(id:string)=>void;onRoute:(id:string)=>void;onRacquets:()=>void}) {
  const [search,setSearch]=useState('');
  const [level,setLevel]=useState('');
  const matchesLevel=(s:HubService)=>!level||new RegExp(level,'i').test(s.description+' '+s.summary);
  const coaching=section==='coaching', buses=section==='buses';
  return <>
    <div className="directory-heading hub-heading"><h1 tabIndex={-1}>{buses?<>The scenic<br/>route.</>:coaching?<>Find your <br/>next level.</>:<>Ready<br/>for the court.</>}</h1><p>{buses?'A few familiar red buses, a little London magic.':coaching?'Good guidance. More confidence. More play.':'Rackets, restringing and the little essentials.'}</p></div>
    <p className="hub-intro">{buses?'Choose a route to trace its journey across the map. Buses are animated models, not live vehicles.':coaching?'Find a coach or programme, then explore its court and joining details.':'Select a shop to find it on the map, or arrange a local racket collection.'}</p>
    {coaching&&<div className="coaching-search"><label htmlFor="coach-search">Find a coach or programme</label><input id="coach-search" type="search" placeholder="Name, court or specialism" value={search} onChange={e=>setSearch(e.target.value)}/></div>}
    {coaching&&<div className="coaching-search"><SelectField label="Coaching level" value={level} onChange={setLevel} options={[{value:'',label:'All levels'},{value:'beginner|all levels|all standards',label:'Beginner'},{value:'intermediate|improver|all levels|all standards',label:'Improver / intermediate'},{value:'advanced|performance|all levels|all standards',label:'Advanced'}]}/></div>}
    {coaching&&venueId&&<button className="text-button coaching-search" onClick={onClearVenue}>Showing this court · Show all coaching →</button>}
    {section==='gear'&&<button className="gear-racquet-entry" onClick={onRacquets} aria-haspopup="dialog"><span className="gear-racquet-mark" aria-hidden="true">◉</span><span><strong>The racquet room</strong><small>Wilson frames, their stories & your own setup</small></span><Icon name="arrow" size={16}/></button>}
    <div className="court-list hub-list" aria-label={buses?'Bus routes':coaching?'Coaching providers':'Tennis shops and services'}>
      {buses?busRoutes.map(route=><button className="court-row" data-route-id={route.id} key={route.id} onClick={()=>onRoute(route.id)}><span className="route-number" style={{background:route.color}}>{route.id}</span><span className="court-row-copy"><span className="court-name">{route.name}</span><span className="court-summary">{route.stops.slice(0,3).join(' · ')}</span></span><Icon name="arrow" size={16}/></button>):hubServices.filter(s=>s.kind===section&&(!coaching||matchesLevel(s))&&(!coaching||!venueId||s.venueId===venueId)&&(!coaching||`${s.name} ${s.area} ${s.summary} ${s.description}`.toLowerCase().includes(search.toLowerCase().trim()))).map(service=><button className="court-row" data-service-id={service.id} key={service.id} onClick={()=>onService(service.id)}><span className="court-icon"><Icon name={coaching?'ball':'bag'} size={24}/></span><span className="court-row-copy"><span className="court-name">{service.name}</span><span className="court-summary">{service.summary}</span><span className="outside-label">{service.area}</span></span><Icon name="arrow" size={16}/></button>)}
    </div>
    {coaching&&!hubServices.some(s=>s.kind==='coaching'&&matchesLevel(s)&&(!venueId||s.venueId===venueId)&&`${s.name} ${s.area} ${s.summary} ${s.description}`.toLowerCase().includes(search.toLowerCase().trim()))&&<p className="hub-intro" role="status">No matching coaches. Try a name or court.</p>}
    <div className="hub-footnote">{buses?`Route snapshot · ${BUS_ROUTES_VERIFIED_DATE}`:coaching?'Centre coaches · Checked 22 September 2026':`Independent local guide · Checked ${HUB_VERIFIED_DATE}`}</div>
  </>;
}

export function ServiceDetail({service,onBack,onCourt,onLocate}:{service:HubService;onBack:()=>void;onCourt:(id:string)=>void;onLocate:()=>void}) {
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[service.id]);
  return <div className="court-detail"><button className="back-button" onClick={onBack}><Icon name="back" size={17}/> {service.kind==='coaching'?'All coaching':'Gear'}</button><div className="detail-scroll">
    <div className="access-label"><span/>{service.summary}</div><h1 ref={heading} tabIndex={-1}>{service.name}</h1><p className="detail-area">{service.area}</p>
    <div className="service-art" aria-hidden="true"><Icon name={service.kind==='coaching'?'ball':'bag'} size={57}/><span>{service.kind==='coaching'?'A little help goes a long way.':'A fresh start for your racket.'}</span></div>
    <p className="detail-description">{service.description}</p>
    {service.id==='wigmore-sports'&&<p className="access-note">Nearby rail: Bond Street · Central, Jubilee and Elizabeth lines. Bus 139 serves Selfridges, followed by a walk to Wigmore Street. <a href="https://tfl.gov.uk/bus/route/139/" target="_blank" rel="noreferrer">View route 139</a></p>}
    {service.id==='hackney-tennis-shop'&&<p className="access-note">Manor House · Piccadilly line, followed by a walk or onward bus. Route 393 serves Clissold Road on the south side of the park; walk through the park to the pavilion. <a href="https://tfl.gov.uk/bus/route/393/" target="_blank" rel="noreferrer">View route 393</a></p>}{service.phone&&<a className="coach-phone" href={`tel:+44${service.phone.replace(/\s/g,'').slice(1)}`}>Call {service.name} · {service.phone}</a>}{service.id==='better-courses'&&<CentreProgramme/>}
    {service.venueId&&<button className="service-map-link" onClick={()=>onCourt(service.venueId!)}><Icon name="court" size={19}/><span>Explore the court<small>Take a closer look at this venue</small></span><Icon name="arrow" size={17}/></button>}
    {(service.lat!==undefined||service.id==='sweet-spot-stringer')&&<button className="service-map-link" onClick={onLocate}><Icon name="pin" size={19}/><span>{service.id==='sweet-spot-stringer'?'Follow the miniature van':service.kind==='gear'?'Visit the shop on the map':'Find on the map'}<small>{service.id==='sweet-spot-stringer'?'Illustrated collection service · not live tracking':service.kind==='gear'?'Fly to the shop’s approximate position':service.area}</small></span><Icon name="arrow" size={17}/></button>}
    {service.address&&<p className="address-line"><Icon name="pin" size={16}/>{service.address}</p>}
    <p className="access-note">{service.note}</p><details className="sources"><summary>Sources & details</summary><p>Checked {service.registeredCoach||service.id==='better-courses'?'22 September 2026':HUB_VERIFIED_DATE}. Confirm current services and arrangements with the provider.</p>{service.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<Icon name="external" size={12}/></a>)}</details>
  </div><div className="detail-actions"><a className="primary-button" href={service.url} target="_blank" rel="noreferrer">{service.actionLabel}<Icon name="external" size={17}/></a>{service.address&&<a className="directions-button" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(service.address)}&travelmode=transit`} target="_blank" rel="noreferrer"><Icon name="pin" size={16}/> Get directions <Icon name="external" size={13}/></a>}<span>Opens the provider’s website</span></div></div>;
}

export function BusRouteDetail({route,onBack,onView}:{route:BusRoute;onBack:()=>void;onView:()=>void}) {
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[route.id]);
  return <div className="court-detail"><button className="back-button" onClick={onBack}><Icon name="back" size={17}/> All bus routes</button><div className="detail-scroll"><div className="route-banner"><span className="route-number" style={{background:route.color}}>{route.id}</span><span>Hop aboard</span></div><h1 ref={heading} tabIndex={-1}>{route.name}</h1><p className="detail-description">{route.description}</p><button className="service-map-link" onClick={onView}><Icon name="bus" size={22}/><span>Follow the route<small>See the local section on the map</small></span><Icon name="arrow" size={16}/></button><h2 className="small-heading">Stops along the way</h2><ol className="route-stops">{route.stops.map(stop=><li key={stop}>{stop}</li>)}</ol><p className="access-note">An illustrative local section using TfL route and stop data. The model buses do not show real-time locations, arrival times or diversions.</p></div><div className="detail-actions"><a className="primary-button" href={route.url} target="_blank" rel="noreferrer">Live travel information on TfL<Icon name="external" size={17}/></a><span>Route snapshot checked {BUS_ROUTES_VERIFIED_DATE}</span></div></div>;
}
