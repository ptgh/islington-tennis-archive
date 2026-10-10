import { Fragment, Suspense, lazy, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from './Icon';
import { AtlasMiniature } from './AtlasMiniature';
const IconicCourtView = lazy(() => import('./IconicCourtView').then(module => ({ default: module.IconicCourtView })));
import { ATLAS_CHECKED, LTA_CALENDAR, iconicClubs, upcomingTournaments, tournamentDates, tournamentStatus, type IconicClubId, type Tournament, type TournamentFilter } from '../data/tennisAtlas';
import type { WeatherSceneKind } from '../scene/createWeather';
import './TennisAtlas.css';

type AtlasView = 'london' | 'season' | 'court';
const position=(x:number,y:number):CSSProperties=>({left:`${x}%`,top:`${y}%`});
const project=(lng:number,lat:number)=>[(lng+180)*2,(90-lat)*2];

function LondonMap({clubId,onClub,onExplore,onHome}:{clubId:IconicClubId;onClub:(id:IconicClubId)=>void;onExplore:(id:IconicClubId)=>void;onHome:()=>void}) {
  return <div className="atlas-london" aria-label="London tennis destinations, separate from the local court directory">
    <svg className="atlas-london-ground" viewBox="0 0 660 440" preserveAspectRatio="none" aria-hidden="true">
      <defs><pattern id="atlas-streets" width="58" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)"><path d="M0 14H58M13 0V48" fill="none" stroke="#fffcef" strokeWidth="2"/></pattern></defs>
      <path d="M-10 0H670V440H-10Z" fill="url(#atlas-streets)"/>
      <path d="M0 261C72 272 50 338 134 308S222 202 273 251 296 326 359 287 353 211 432 245 492 285 535 245 587 219 660 242" fill="none" stroke="#c1d2cc" strokeWidth="19"/>
      <path d="M0 261C72 272 50 338 134 308S222 202 273 251 296 326 359 287 353 211 432 245 492 285 535 245 587 219 660 242" fill="none" stroke="#f7f8eb" strokeWidth="1"/>
      <path className="atlas-journey" d={clubId==='wimbledon'?'M494 100Q305 84 250 331':'M494 100Q358 59 217 192'}/>
      <text x="439" y="306" transform="rotate(-13 439 306)" className="atlas-river-label">River Thames</text>
    </svg>
    <span className="atlas-compass" aria-hidden="true">N<span>↑</span></span>
    <button className="atlas-home-place" style={position(75,21)} onClick={onHome} aria-label="Return to Islington map">
      <AtlasMiniature place="islington"/><strong>Islington</strong><span>Our home court</span>
    </button>
    {iconicClubs.map(club=><button key={club.id} className={`atlas-club-place ${club.id}`} style={position(club.id==='queens'?30:39,club.id==='queens'?44:76)} aria-pressed={club.id===clubId} onClick={()=>club.id===clubId?onExplore(club.id):onClub(club.id)}>
      <AtlasMiniature place={club.id}/><strong>{club.name}</strong><span>{club.id==='queens'?'West Kensington':'SW19'}</span>
    </button>)}
    <p className="atlas-map-caption">London, a little further afield.<span>Illustrated positions · not a travel route</span></p>
  </div>;
}

function TourMap({events,selected,onSelect,onHome}:{events:Tournament[];selected?:Tournament;onSelect:(t:Tournament)=>void;onHome:()=>void}) {
  const [region,setRegion]=useState<'world'|'europe'>('world');
  useEffect(()=>{if(selected)setRegion(['UK','France','Italy'].includes(selected.country)?'europe':'world');},[selected?.id,selected?.country]);
  // Europe gets its own closer view so London, Paris and the Italian venues stay selectable.
  const bounds=region==='world'?[0,0,720,360]:[320,48,100,60];
  const screen=(lng:number,lat:number)=>{const [x,y]=project(lng,lat);return [(x-bounds[0])/bounds[2]*100,(y-bounds[1])/bounds[3]*100];};
  const europe=events.filter(t=>['UK','France','Italy'].includes(t.country));
  const others=events.filter(t=>!europe.includes(t));
  const cities=[...new Set((region==='world'?others:europe).map(t=>t.city))];
  const labelOffsets:Record<string,[number,number]>=region==='europe'
    ? {London:[0,-25],Paris:[-25,24],Turin:[-17,36],Bologna:[18,-18]}
    : {'Indian Wells':[-4,20],'New York':[4,-18]};
  const home=project(-0.102,51.546),destination=selected?project(selected.lng,selected.lat):home;
  return <div className={`atlas-tour-map ${region}`}>
    <div className="atlas-map-tools"><button onClick={onHome}><span className="atlas-home-dot"/> Islington · home</button><button onClick={()=>{if(region==='world'&&europe.length&&(!selected||!europe.some(event=>event.id===selected.id)))onSelect(europe[0]);setRegion(region==='world'?'europe':'world');}}>{region==='world'?'Europe close-up':'Whole world'} <Icon name="layers" size={15}/></button></div>
    <div className="atlas-world-canvas" aria-label={region==='world'?'Tournament destinations around the world':'Tournament destinations in Europe'}>
      <img className="atlas-land" src="/atlas-world.svg" alt="" />
      <svg viewBox={bounds.join(' ')} preserveAspectRatio="none" aria-hidden="true">
        {region==='world'&&[60,120,180,240,300].map(y=><path key={y} d={`M0 ${y}H720`} stroke="#b8c7b5" strokeWidth=".4" strokeDasharray="2 6"/>)}
        {selected&&<path className="atlas-world-journey" d={`M${home.join(' ')} Q${(home[0]+destination[0])/2} ${Math.min(home[1],destination[1])-Math.abs(home[0]-destination[0])*.24-12} ${destination.join(' ')}`} fill="none" vectorEffect="non-scaling-stroke"/>}
      </svg>
      {region==='world'&&europe.length>0&&<button className="atlas-city europe-cluster" style={position(...screen(3,49) as [number,number])} onClick={()=>setRegion('europe')} aria-label={`Explore ${europe.length} tournaments in Europe`}><span className="atlas-city-dot">{europe.length}</span><strong>Europe</strong></button>}
      {cities.map(city=>{
        const options=events.filter(t=>t.city===city),event=options.find(t=>t.id===selected?.id)??options[0];
        const [x,y]=screen(event.lng,event.lat);
        const [dx,dy]=labelOffsets[city]??[0,0];
        return <Fragment key={city}>
          {(dx!==0||dy!==0)&&<span className="atlas-city-anchor" aria-hidden="true" style={position(x,y)}><i style={{width:Math.hypot(dx,dy),transform:`rotate(${Math.atan2(dy,dx)}rad)`}}/></span>}
          <button className="atlas-city" style={{...position(x,y),marginLeft:dx,marginTop:dy}} aria-label={`Explore ${city} tournaments`} aria-pressed={selected?.city===city} onClick={()=>onSelect(event)}><span className="atlas-city-dot">{options.length>1?options.length:<Icon name="ball" size={15}/>}</span><strong>{city}</strong></button>
        </Fragment>;
      })}
    </div>
    <p className="atlas-map-caption">A tennis season, seen from Islington.<span>Choose a place or an event below.</span></p>
    <a className="atlas-geography-credit" href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Map: Natural Earth</a>
  </div>;
}

function EventDetails({event,today,onClub}:{event:Tournament;today:string;onClub:(id:IconicClubId)=>void}) {
  return <article className="atlas-event-detail" aria-label="Selected tournament">
    <span className={`atlas-surface ${event.surface.toLowerCase()}`}><span/>{event.surface} · {event.category}</span>
    <h3>{event.name}</h3><p className="atlas-event-venue">{event.venue}<br/>{event.city}, {event.country}</p>
    <p className="atlas-event-dates">{tournamentDates(event)}</p>
    <span className={`atlas-status ${event.status}`}>{tournamentStatus(event,today)}</span>
    <p>{event.dateNote}</p>
    <a className="primary-button" href={event.url} target="_blank" rel="noreferrer">Official tournament <Icon name="external" size={16}/></a>
    {event.clubId&&<button className="text-button" onClick={()=>{if(event.clubId)onClub(event.clubId);}}>Explore the club miniature <Icon name="arrow" size={16}/></button>}
    <a className="atlas-source" href={event.source} target="_blank" rel="noreferrer">Date source <Icon name="external" size={13}/></a>
  </article>;
}

export function TennisAtlas({onClose,onHome,today,night,motionRunning,weather,onNight,onMotion,lightingTime,onLightingTime}:{onClose:()=>void;onHome:()=>void;today:string;lightingTime:number|null;onLightingTime:(time:number|null)=>void;night:boolean;motionRunning:boolean;weather:WeatherSceneKind;onNight:()=>void;onMotion:()=>void}) {
  const dialogRef=useRef<HTMLDialogElement>(null), contentRef=useRef<HTMLDivElement>(null);
  const [view,setView]=useState<AtlasView>('london'),[clubId,setClubId]=useState<IconicClubId>('wimbledon');
  const [courtOpened,setCourtOpened]=useState(false);
  const [filter,setFilter]=useState<TournamentFilter>('all');
  const [eventId,setEventId]=useState(()=>upcomingTournaments(today)[0]?.id??'');
  const events=upcomingTournaments(today,filter);
  const selected=events.find(t=>t.id===eventId)??events[0];
  const club=iconicClubs.find(c=>c.id===clubId)??iconicClubs[0];
  const clubEvent=upcomingTournaments(today).find(t=>t.id===club.eventId);
  useEffect(()=>{
    const dialog=dialogRef.current,returnFocus=document.activeElement;
    dialog?.showModal();
    return()=>{dialog?.close();if(returnFocus instanceof HTMLElement&&returnFocus.isConnected)returnFocus.focus({preventScroll:true});};
  },[]);
  function switchView(next:AtlasView){if(next==='court')setCourtOpened(true);setView(next);contentRef.current?.scrollTo({top:0});}
  function showClub(id:IconicClubId){setClubId(id);switchView('london');}
  function showEvent(id:string){setEventId(id);setFilter('all');switchView('season');}
  function chooseEvent(event:Tournament){setEventId(event.id);contentRef.current?.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  return <dialog ref={dialogRef} className={`tennis-atlas${view==='court'?' is-court-view':''}`} aria-labelledby="atlas-heading" onCancel={onClose} onKeyDown={e=>e.stopPropagation()} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="atlas-header"><div><span className="atlas-eyebrow">ISLINGTON TENNIS / FURTHER AFIELD</span><h2 id="atlas-heading">A wider world of tennis.</h2></div><button className="icon-button" aria-label="Close tennis atlas" onClick={onClose}><Icon name="close"/></button></div>
    <div className="atlas-navigation"><div className="atlas-view-options" aria-label="Atlas view"><button aria-pressed={view==='london'} onClick={()=>switchView('london')}>London icons</button><button aria-pressed={view==='season'} onClick={()=>switchView('season')}>On tour <span>{upcomingTournaments(today).length}</span></button>{view==='court'&&<button aria-pressed={true} onClick={()=>switchView('court')}>Court view</button>}</div><button className="atlas-return" onClick={onHome}><Icon name="back" size={16}/> Back to Islington</button></div>
    <div className="atlas-content" ref={contentRef}>
      {courtOpened&&<div className="atlas-court-container" hidden={view!=='court'}><Suspense fallback={<p role="status" className="atlas-court-loading">Opening the courts…</p>}><IconicCourtView active={view==='court'} clubId={clubId} onHome={onHome} lightingTime={lightingTime} onLightingTime={onLightingTime} event={clubEvent} night={night} motionRunning={motionRunning} weather={weather} onNight={onNight} onMotion={onMotion} onBack={()=>switchView('london')} onSwitch={setClubId}/></Suspense></div>}
      {view==='court'?null:view==='london'?<>
        <div className="atlas-feature"><LondonMap clubId={clubId} onClub={setClubId} onExplore={id=>{setClubId(id);switchView('court');}} onHome={onHome}/><article className="atlas-club-detail" key={clubId}>
          <span className="atlas-eyebrow">LONDON ICON / {club.id==='wimbledon'?'01':'02'}</span><h3>{club.name}</h3><p className="atlas-event-venue">{club.area}</p><p>{club.description}</p>
          {clubEvent&&<button className="atlas-next-event" onClick={()=>showEvent(clubEvent.id)}><span>Next on the calendar</span><strong>{tournamentDates(clubEvent)}</strong><span>{clubEvent.status==='provisional'?'Provisional dates':'The Championships'} <Icon name="arrow" size={16}/></span></button>}
          <p className="atlas-access">{club.access}</p>
          <button className="atlas-explore-courts" onClick={()=>switchView('court')}>Explore the courts <Icon name="arrow" size={17}/><small>Move around a court-side miniature</small></button>
          <a className="primary-button" href={club.url} target="_blank" rel="noreferrer">{club.linkLabel} <Icon name="external" size={16}/></a>
          <a className="atlas-source" href={club.source} target="_blank" rel="noreferrer">Visitor & location information <Icon name="external" size={13}/></a>
        </article></div>
        <div className="atlas-season-invite"><div><span className="atlas-eyebrow">FOLLOW THE SEASON</span><h3>From our courts to the world stage.</h3><p>Grand Slams, summer grass and the season finales. Explore what’s coming next.</p></div><button className="atlas-round-link" onClick={()=>switchView('season')} aria-label="Explore upcoming tournaments"><Icon name="arrow" size={24}/></button></div>
      </>:<>
        <div className="atlas-feature"><TourMap events={events} selected={selected} onSelect={setEventIdFromTournament} onHome={onHome}/>{selected?<EventDetails event={selected} today={today} onClub={showClub}/>:<div className="atlas-empty"><h3>More tennis to come.</h3><p>No upcoming dates in this selection. Check the LTA calendar for the latest announcements.</p><a href={LTA_CALENDAR} target="_blank" rel="noreferrer">Explore the LTA calendar ↗</a></div>}</div>
        <section className="atlas-calendar" aria-label="Upcoming tournament calendar"><div className="atlas-calendar-heading"><div><span className="atlas-eyebrow">THE TENNIS DIARY</span><h3>Dates for your radar.</h3></div><div className="atlas-filters" aria-label="Tournament filters">{(['all','slams','london'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'All events':f==='slams'?'Grand Slams':'London'}</button>)}</div></div>
          <div className="atlas-event-list">{events.map((event,i)=><button key={event.id} aria-pressed={selected?.id===event.id} onClick={()=>chooseEvent(event)}><span className={`atlas-event-index ${event.surface.toLowerCase()}`}>{String(i+1).padStart(2,'0')}</span><span className="atlas-event-copy"><strong>{event.name}</strong><span>{event.city} · {event.category}</span></span><span className="atlas-event-when">{tournamentDates(event)}<span>{tournamentStatus(event,today)}</span></span><Icon name="arrow" size={17}/></button>)}</div>
          <p className="atlas-calendar-note">A curated calendar, checked {ATLAS_CHECKED}. Completed events leave this view automatically. Dates can change; follow each event’s official source.</p>
        </section>
      </>}
      {view!=='court'&&<footer className="atlas-lta"><div><span className="atlas-eyebrow">MORE TENNIS WITH THE LTA</span><p>Discover ways to play, improve your game and follow the British tennis season.</p></div><div><a href="https://www.lta.org.uk/play/" target="_blank" rel="noreferrer">Explore the LTA <Icon name="external" size={15}/></a><a href={LTA_CALENDAR} target="_blank" rel="noreferrer">Full tournament calendar <Icon name="external" size={15}/></a><span>Independent guide · not affiliated with the LTA</span></div></footer>}
    </div>
  </dialog>;
  function setEventIdFromTournament(event:Tournament){setEventId(event.id);}
}
