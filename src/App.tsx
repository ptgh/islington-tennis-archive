import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TownMap, type TownMapHandle } from './components/TownMap';
import { CourtDirectory } from './components/CourtDirectory';
import { CourtDetail } from './components/CourtDetail';
import { AboutDialog } from './components/AboutDialog';
import { HubDirectory, HubNavigation, ServiceDetail, BusRouteDetail } from './components/HubDirectory';
import { Icon } from './components/Icon';
import { filterVenues, type Filter } from './data/venues';
import { hubServices, servicesForVenue, type HubSection } from './data/hub';
import { busRoutes } from './data/busRoutes';
import { PlayDirectory, PlayDetail } from './components/PlayTogether';
import { playOpportunities, filterPlayOpportunities, playVenueCounts, type PlayFilter } from './data/play';
import './hub.css';
import './play.css';
import './living-map.css';
import type { WeatherSceneKind } from './scene/createWeather';
import { borough } from './data/borough';
import { parseFavourites } from './data/favourites';
const venues=borough.venues;
import { MapPlaces } from './components/MapPlaces';
import { Weather } from './components/Weather';
import { TennisAtlas } from './components/TennisAtlas';
import { RacquetStudio } from './components/RacquetStudio';
import { CourtPractice } from './components/CourtPractice';
import { londonDate } from './data/tennisAtlas';
import { LightingControl } from './components/LightingControl';
import { skyPosition } from './scene/sceneAtmosphere';
import { AskIslington } from './components/AskIslington';
import { threadIdFromHash } from './data/askThreads';
import { LoadingScreen } from './components/LoadingScreen';
import { AccountCircle } from './components/AccountCircle';

type MapCard='places'|'forecast'|'time';

export default function App() {
  const [weather,setWeather]=useState<WeatherSceneKind>('clear');
  const map=useRef<TownMapHandle>(null);
  const [favourites,setFavourites]=useState<string[]>(()=>{try{return parseFavourites(localStorage.getItem('islington-tennis:favourites'),venues.map(v=>v.id));}catch{return [];}});
  const [savedOnly,setSavedOnly]=useState(false);
  const [saveError,setSaveError]=useState(false);
  const [todayClock,setTodayClock]=useState(()=>new Date());
  useEffect(()=>{const timer=setInterval(()=>setTodayClock(new Date()),60000);return()=>clearInterval(timer);},[]);
  function toggleFavourite(id:string){const next=favourites.includes(id)?favourites.filter(x=>x!==id):[...favourites,id];setFavourites(next);try{localStorage.setItem('islington-tennis:favourites',JSON.stringify(next));setSaveError(false);}catch{setSaveError(true);}}
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<Filter>('all');
  const nearby=true;
  const [facility,setFacility]=useState('all');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [section,setSection]=useState<HubSection>('courts');
  const [serviceId,setServiceId]=useState<string|null>(null);
  const [routeId,setRouteId]=useState<string|null>(null);
  const [coachVenue,setCoachVenue]=useState<string|null>(null);
  const coachCounts=Object.fromEntries(venues.map(v=>[v.id,hubServices.filter(s=>s.kind==='coaching'&&s.venueId===v.id).length]));
  const [playId,setPlayId]=useState<string|null>(null);
  const [playFilter,setPlayFilter]=useState<PlayFilter>('all');
  const [playVenueId,setPlayVenueId]=useState<string|null>(null);
  const [playFocusId,setPlayFocusId]=useState<string|null>(null);
  const [visitId,setVisitId]=useState<string|null>(null);
  const [practiceOpen,setPracticeOpen]=useState(false);
  const [manualNight,setNight]=useState(false);
  const [lightingTime,setLightingTime]=useState<number|null>(null);
  const night=lightingTime===null?manualNight:skyPosition(new Date(lightingTime)).sun.y<=0;
  const toggleNight=()=>{setLightingTime(null);setNight(!night);};
  const [stations,setStations]=useState(false);
  const [showBuses,setShowBuses]=useState(true);
  const [motionRunning,setMotionRunning]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [about,setAbout]=useState(false);
  const [atlas,setAtlas]=useState(false);
  const [racquetRoom,setRacquetRoom]=useState(false);
  const [racquetView,setRacquetView]=useState<'collection'|'my-frame'>('collection');
  const [partnersOpen,setPartnersOpen]=useState(false);
  function openMyFrame(){setRacquetView('my-frame');setRacquetRoom(true);}
  const [askHash,setAskHash]=useState(()=>threadIdFromHash(window.location.hash));
  useEffect(()=>{const sync=()=>setAskHash(threadIdFromHash(window.location.hash));window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  const closeAsk=useCallback(()=>{history.pushState(null,'',window.location.pathname+window.location.search);setAskHash(undefined);},[]);
  const [panelOpen,setPanelOpen]=useState(true);
  const [isMobile,setIsMobile]=useState(()=>window.matchMedia('(max-width:760px)').matches);
  // One floating map card at a time. On phones a card retracts the hub sheet so
  // the map shows beneath it; closing restores the sheet unless the card moved
  // the map on purpose. Opening the sheet closes the card.
  const [card,setCard]=useState<MapCard|null>(null);
  const restoreSheet=useRef(false);
  const cardProps=(name:MapCard)=>({open:card===name,onOpenChange:(open:boolean)=>{
    if(open){
      if(card===null){restoreSheet.current=isMobile&&panelOpen;if(isMobile)setPanelOpen(false);}
      setCard(name);
    }else if(card===name){
      setCard(null);
      if(restoreSheet.current)setPanelOpen(true);
      restoreSheet.current=false;
    }
  }});
  useEffect(()=>{if(isMobile&&panelOpen){setCard(null);restoreSheet.current=false;}},[isMobile,panelOpen]);
  const [ready,setReady]=useState(false);
  const previousDetail=useRef<string|null>(null);
  const previousVisit=useRef<string|null>(null);
  const leaveVisitButton=useRef<HTMLButtonElement>(null);
  const practiceButton=useRef<HTMLButtonElement>(null);
  const results=useMemo(()=>filterVenues(venues,query,filter,nearby).filter(v=>(facility==='all'||(facility==='indoor'?v.setting.toLowerCase().includes('indoors'):v.lighting.toLowerCase().includes('flood')))&&(!savedOnly||favourites.includes(v.id))),[query,filter,nearby,savedOnly,favourites,facility]);
  const playResults=useMemo(()=>filterPlayOpportunities(playOpportunities,playFilter,playVenueId,todayClock),[playFilter,playVenueId,todayClock]);
  const playCounts=useMemo(()=>playVenueCounts(filterPlayOpportunities(playOpportunities,playFilter,null,todayClock)),[playFilter,todayClock]);
  const opportunity=playOpportunities.find(item=>item.id===playId);
  const visibleIds=useMemo(()=>section==='play'?Object.keys(playCounts):section==='gear'?[]:section==='coaching'?[...new Set(hubServices.flatMap(s=>s.venueId?[s.venueId]:[]))]:results.map(v=>v.id),[results,section,playCounts]);
  const selected=venues.find(v=>v.id===selectedId);
  const service=hubServices.find(s=>s.id===serviceId);
  const route=busRoutes.find(r=>r.id===routeId);
  const visited=venues.find(v=>v.id===visitId);
  const hasDetail=!!(selected||service||route||opportunity||(section==='play'&&partnersOpen));
  function changeSection(next:HubSection){setPartnersOpen(false);setCoachVenue(null);if(visitId||next==='play')map.current?.reset();setPlayId(null);setPlayVenueId(null);setPlayFocusId(null);setPlayFilter('all');setSection(next);setSelectedId(null);setServiceId(null);setRouteId(null);setVisitId(null);setPracticeOpen(false);setPanelOpen(true);if(next==='buses')setShowBuses(true);}
  function select(id:string){setPlayId(null);setSelectedId(id);setServiceId(null);setRouteId(null);setVisitId(null);setSection('courts');setPanelOpen(true);}
  function selectService(id:string){const item=hubServices.find(s=>s.id===id);if(!item)return;setPlayId(null);setSection(item.kind);setServiceId(id);setSelectedId(null);setRouteId(null);setVisitId(null);setPanelOpen(true);}
  function selectRoute(id:string){setPlayId(null);setRouteId(id);setShowBuses(true);setVisitId(null);setPanelOpen(true);}
  function browsePlayAtVenue(id:string|null){
    if(section!=='play')setPlayFilter('all');
    setSection('play');setPlayVenueId(id);setPlayFocusId(id);setPlayId(null);
    setSelectedId(null);setServiceId(null);setRouteId(null);setVisitId(null);setPanelOpen(true);
    if(!id)map.current?.reset();
  }
  function selectPlay(id:string){
    const item=playOpportunities.find(option=>option.id===id);if(!item)return;
    setPlayId(id);setPlayFocusId(playVenueId&&item.venueIds.includes(playVenueId)?playVenueId:item.venueIds[0]??null);setPanelOpen(true);
  }
  function locatePlayCourt(id:string){
    setPlayFocusId(id);const venue=venues.find(v=>v.id===id);if(venue)map.current?.locate(venue.lat,venue.lng);
  }
  function visitCourt(id:string){setVisitId(id);setPracticeOpen(false);setMotionRunning(true);setPanelOpen(false);}
  function leaveVisit(){setVisitId(null);setPracticeOpen(false);setPanelOpen(true);map.current?.reset();}
  function home(){changeSection('courts');setQuery('');setFilter('all');setSavedOnly(false);map.current?.reset();}
  useEffect(()=>{
    const media=window.matchMedia('(max-width:760px)');
    const update=()=>setIsMobile(media.matches);
    media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    const detail=selectedId||serviceId||routeId||playId;
    if(!detail&&previousDetail.current){
      const origin=document.querySelector<HTMLButtonElement>(`[data-venue-id="${previousDetail.current}"],[data-service-id="${previousDetail.current}"],[data-route-id="${previousDetail.current}"],[data-play-id="${previousDetail.current}"]`);
      (origin??document.querySelector<HTMLHeadingElement>('.directory-heading h1'))?.focus({preventScroll:true});
    }
    previousDetail.current=detail;
  },[selectedId,serviceId,routeId,playId]);
  useEffect(()=>{
    if(visitId){map.current?.visitCourt(visitId);leaveVisitButton.current?.focus({preventScroll:true});}
    else if(previousVisit.current)document.querySelector<HTMLButtonElement>('.court-visit-button')?.focus({preventScroll:true});
    previousVisit.current=visitId;
  },[visitId,isMobile]);
  useEffect(()=>{if(service?.id==='sweet-spot-stringer')map.current?.visitVan();if(service?.lat!==undefined&&service.lng!==undefined)map.current?.locate(service.lat,service.lng);},[service]);
  useEffect(()=>{if(section==='play'&&playFocusId){const venue=venues.find(v=>v.id===playFocusId);if(venue)map.current?.locate(venue.lat,venue.lng);}},[playFocusId,playId,section]);
  useEffect(()=>{if(routeId)map.current?.followRoute(routeId);},[routeId]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!about&&!atlas&&!racquetRoom&&askHash===undefined){if(practiceOpen){setPracticeOpen(false);practiceButton.current?.focus({preventScroll:true});}else if(visitId)leaveVisit();else{setSelectedId(null);setServiceId(null);setRouteId(null);setPlayId(null);}}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[about,atlas,racquetRoom,visitId,practiceOpen,askHash]);
  return <main className={`app ${night?'night':''} ${panelOpen?'panel-open':'panel-closed'} ${visitId?'court-visit':''} ${card?'card-open':''} hub-section-${section}`}>
    <a className="skip-link" href="#court-browser" onClick={()=>setPanelOpen(true)}>Skip to tennis hub</a>
    <TownMap ref={map} suspended={atlas} venues={venues} selectedId={section==='play'?playFocusId:section==='coaching'?service?.venueId??coachVenue:selectedId??service?.venueId??null} playCounts={section==='play'?playCounts:section==='coaching'?coachCounts:undefined} coachingPins={section==='coaching'} visibleIds={visibleIds} onSelect={id=>{if(section==='coaching'){setCoachVenue(id);setServiceId(null);setPanelOpen(true);}else if(section==='play')browsePlayAtVenue(id);else select(id);}} night={night} lightingTime={lightingTime} weather={weather} showTransit={stations} trainRunning={motionRunning&&!atlas} activityRunning={motionRunning&&!atlas} showBuses={showBuses} busRouteId={routeId} showShops={section==='gear'} selectedServiceId={serviceId} activeVisitId={visitId} onSelectService={selectService} onReset={leaveVisit} onReady={()=>setReady(true)}/>
    <div className="map-vignette"/><Weather onWeather={setWeather} {...cardProps('forecast')}/><MapPlaces {...cardProps('places')} onLocate={(lat,lng)=>{restoreSheet.current=false;setPanelOpen(false);setStations(true);map.current?.locate(lat,lng);}}/>
    <button className="pill atlas-launch" onClick={()=>setAtlas(true)} aria-haspopup="dialog">Atlas</button>
    <button className="pill ask-launch" onClick={()=>{window.location.hash='#/ask';}} aria-haspopup="dialog">Ask</button>
    <AccountCircle venues={venues} onRacquets={openMyFrame} onPartners={()=>{changeSection('play');setPartnersOpen(true);}}/>
    <header className="app-header"><button className="brand" onClick={home} aria-label="Islington Tennis home"><Icon name="ball" size={35}/><span>Islington Tennis</span></button><div className="header-actions"><button className="pill about-button" onClick={()=>setAbout(true)} aria-label="About"><span>About</span><Icon name="info" size={17}/></button><LightingControl night={night} time={lightingTime} onTime={setLightingTime} onNight={toggleNight} {...cardProps('time')}/></div></header>
    <aside id="court-browser" className={`directory-panel ${hasDetail?'has-detail':''}`} aria-label="Explore the tennis hub" inert={!panelOpen} aria-hidden={!panelOpen?true:undefined}>
      <button className="mobile-handle" onClick={()=>setPanelOpen(!panelOpen)} aria-controls="court-browser" aria-expanded={panelOpen} aria-label={panelOpen?'Minimise tennis hub':'Open tennis hub'}><span/></button>
      <HubNavigation section={section} onChange={changeSection}/>
      {selected?<CourtDetail venue={selected} onBack={()=>setSelectedId(null)} onVisit={()=>visitCourt(selected.id)} coaching={servicesForVenue(selected.id)} onCoaching={selectService} onPlay={playOpportunities.some(item=>item.venueIds.includes(selected.id))?()=>browsePlayAtVenue(selected.id):undefined}/>:service?<ServiceDetail service={service} onBack={()=>setServiceId(null)} onCourt={select} onLocate={()=>{if(service.id==='sweet-spot-stringer')map.current?.visitVan();if(service.lat!==undefined&&service.lng!==undefined)map.current?.locate(service.lat,service.lng);}}/>:route?<BusRouteDetail route={route} onBack={()=>setRouteId(null)} onView={()=>map.current?.followRoute(route.id)}/>:opportunity?<PlayDetail opportunity={opportunity} onBack={()=>setPlayId(null)} onCourt={select} onLocate={locatePlayCourt} venues={venues}/>:section==='play'?<PlayDirectory results={playResults} filter={playFilter} onFilter={setPlayFilter} venueId={playVenueId} onVenue={browsePlayAtVenue} venues={venues} onSelect={selectPlay} onRacquets={openMyFrame} partners={partnersOpen} onPartners={setPartnersOpen}/>:section==='courts'?<CourtDirectory facility={facility} onFacility={setFacility} favourites={favourites} onFavourite={toggleFavourite} savedOnly={savedOnly} onSavedOnly={setSavedOnly} saveError={saveError} results={results} allVenues={venues} query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} onSelect={select} onAbout={()=>setAbout(true)}/>:<HubDirectory venueId={coachVenue} onClearVenue={()=>setCoachVenue(null)} section={section} onService={selectService} onRoute={selectRoute} onRacquets={()=>{setRacquetView('collection');setRacquetRoom(true);}}/>}
    </aside>
    {!visitId&&<button className="mobile-panel-toggle pill" onClick={()=>setPanelOpen(!panelOpen)} aria-controls="court-browser" aria-expanded={panelOpen}><Icon name={panelOpen?'layers':'court'} size={18}/>{panelOpen?'Explore map':'Tennis hub'}</button>}
    {visited&&<div className="visit-bar"><div><strong>{visited.name}</strong><span>Miniature animation · not live court use</span></div><button ref={practiceButton} className="practice-launch" aria-expanded={practiceOpen} onClick={()=>setPracticeOpen(!practiceOpen)}><Icon name="ball" size={15}/> Practice</button><button ref={leaveVisitButton} onClick={leaveVisit}><Icon name="back" size={16}/> Back to map</button></div>}
    {visited&&practiceOpen&&<CourtPractice venueId={visited.id} venueName={visited.name} onClose={()=>{setPracticeOpen(false);practiceButton.current?.focus({preventScroll:true});}}/>}
    <div className="place-title"><h2>Islington</h2><p>London, at play.</p><span className="title-rule"/></div>
    <div className="map-toolbar" aria-label="Map controls"><div className="zoom-buttons"><button aria-label="Zoom in" title="Zoom in" onClick={()=>map.current?.zoomIn()}><Icon name="plus"/></button><button aria-label="Zoom out" title="Zoom out" onClick={()=>map.current?.zoomOut()}><Icon name="minus"/></button></div><button className="icon-button" aria-label="Rotate map" title="Rotate map" onClick={()=>map.current?.rotate()}><Icon name="rotate"/></button><button className="icon-button" aria-label="Reset map view" title="Reset map view" onClick={()=>visitId?leaveVisit():map.current?.reset()}><Icon name="reset"/></button></div>
    <footer className="map-footer"><div className="layer-controls"><button className="pill" aria-pressed={stations} onClick={()=>setStations(!stations)}><span className="roundel tiny"/> Stations</button><button className="pill" aria-pressed={showBuses} onClick={()=>setShowBuses(!showBuses)}><Icon name="bus" size={14}/> Buses</button><button className="pill" aria-pressed={motionRunning} onClick={()=>setMotionRunning(!motionRunning)}><Icon name={motionRunning?'pause':'play'} size={13}/><span>{motionRunning?'Pause world':'Play world'}</span></button></div><button className="map-note" onClick={()=>setAbout(true)}>An illustrated neighbourhood <Icon name="info" size={13}/></button></footer>
    <LoadingScreen ready={ready}/>
    <button className="map-attribution" onClick={()=>setAbout(true)} aria-haspopup="dialog">Map credits</button>
    {atlas&&<TennisAtlas lightingTime={lightingTime} onLightingTime={setLightingTime} night={night} motionRunning={motionRunning} weather={weather} onNight={toggleNight} onMotion={()=>setMotionRunning(!motionRunning)} today={londonDate(todayClock)} onClose={()=>setAtlas(false)} onHome={()=>{setAtlas(false);home();}}/>}
    {racquetRoom&&<RacquetStudio initialView={racquetView} onPartners={()=>{setRacquetRoom(false);changeSection('play');setPartnersOpen(true);}} onClose={()=>setRacquetRoom(false)}/>}
    {askHash!==undefined&&<AskIslington threadId={askHash} onNavigate={id=>{window.location.hash=`#/ask/${id}`;}} onClose={closeAsk}/>}
    {about&&<AboutDialog onClose={()=>setAbout(false)}/>}
  </main>;
}
