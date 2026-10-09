import { CentreProgramme } from './CentreProgramme';
import { useEffect, useRef, useState } from 'react';
import { CourtBooking } from './CourtBooking';
import { accessLabels, VERIFIED_DATE, type Venue } from '../data/venues';
import { courtApproaches, walkingDirections } from '../data/courtApproaches';
import { Icon } from './Icon';
import './CourtApproach.css';

export function CourtDetail({venue,onBack,onVisit,coaching,onCoaching,onPlay}:{venue:Venue;onBack:()=>void;onVisit:()=>void;coaching:{id:string;name:string;registeredCoach?:boolean}[];onCoaching:(id:string)=>void;onPlay?:()=>void}) {
  const heading=useRef<HTMLHeadingElement>(null);
  const [booking,setBooking]=useState(false);
  useEffect(()=>{setBooking(false);heading.current?.focus({preventScroll:true});},[venue.id]);
  const directions=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.name+' '+venue.address)}&travelmode=transit`;
  const approach=courtApproaches[venue.id];
  if(booking) return <CourtBooking venue={venue} onBack={()=>setBooking(false)}/>;
  return <div className="court-detail">
    <button className="back-button" onClick={onBack}><Icon name="back" size={17}/> All courts</button>
    <div className="detail-scroll">
      <div className={`access-label ${venue.access!=='public'?'restricted':''}`}><span/>{accessLabels[venue.access]}{venue.nearby?' · Outside Islington':''}</div>
      <h1 ref={heading} tabIndex={-1}>{venue.name}</h1>
      <p className="detail-area">{venue.area}</p>
      <button className="court-illustration court-visit-button" onClick={onVisit} aria-label={(venue.access==='public'||venue.id==='barbican')?`Watch a miniature rally at ${venue.name}`:`Explore the miniature at ${venue.name}`}><div className="drawn-court" aria-hidden="true"><div className="singles"><div className="service-box"/></div><div className="court-net"/></div><span className="watch-label"><Icon name="play" size={14}/>{(venue.access==='public'||venue.id==='barbican')?'Watch a rally':'Explore the miniature'}</span></button>
      {venue.id==='islington-tennis-centre'&&<CentreProgramme/>}
      {coaching.filter(provider=>!provider.registeredCoach).map(provider=><button key={provider.id} className="coaching-link" onClick={()=>onCoaching(provider.id)}><Icon name="ball" size={16}/> {provider.name} <Icon name="arrow" size={15}/></button>)}
      {onPlay&&<button className="play-court-cta" onClick={onPlay}><Icon name="people" size={18}/> Find people to play with <Icon name="arrow" size={15}/></button>}
      <p className="detail-description">{venue.description}</p>
      <dl className="court-facts"><div><dt>Courts</dt><dd>{venue.courts??'Shared ball court'}</dd></div><div><dt>Surface</dt><dd>{venue.surface}</dd></div><div><dt>Lighting</dt><dd>{venue.lighting}</dd></div></dl>
      <div className="station-detail"><span className="roundel" aria-hidden="true"/><div><strong>{venue.station}</strong><span>{venue.stationLines}</span></div></div>
      {approach&&<section className="court-approach" aria-label="Arriving on foot">
        <span className="court-approach__eyebrow">FROM THE STATION</span>
        <div className="court-approach__route"><strong>{approach.station}</strong><span aria-hidden="true">→</span><strong>{approach.arrival}</strong></div>
        {approach.guidance.map(item=><p key={item}>{item}</p>)}
        <a className="court-approach__directions" href={walkingDirections(approach)} target="_blank" rel="noreferrer">Open walking directions <Icon name="external" size={13}/></a>
        <a className="court-approach__source" href={approach.source.url} target="_blank" rel="noreferrer">{approach.source.label} <Icon name="external" size={12}/></a>
        <small>Directions open in Google Maps. Check your booked court number and the current entrance before travelling.</small>
      </section>}
      <p className="address-line"><Icon name="pin" size={16}/>{venue.address}</p>
      <p className="access-note">{venue.accessNote}</p>
      {venue.id==='islington-tennis-centre'&&<details className="sources"><summary>When to play · off-peak guide</summary><p>Adult tennis off-peak: weekdays 09:00–12:00 and 14:00–16:00; Friday–Sunday 19:00–22:00.</p><p>Junior tennis off-peak: weekdays 07:00–18:00 and all weekend. Outside these hours, adult prices apply.</p><p>These are the operator’s pricing bands, not measured busy times or a guarantee of free courts. Live availability remains with Better.</p><a href="https://www.better.org.uk/leisure-centre/london/islington/islingtontc/prices" target="_blank" rel="noreferrer">Better’s published times · checked 25 September 2026 <Icon name="external" size={12}/></a></details>}
      <details className="sources"><summary>Sources & details</summary><p>Checked {VERIFIED_DATE}. Map positions are approximate. Confirm access and facilities with the venue before travelling.</p>{venue.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<Icon name="external" size={12}/></a>)}</details>
    </div>
    <div className="detail-actions"><button className="primary-button" onClick={()=>setBooking(true)}><Icon name="ball" size={17}/> Hours, prices & booking</button><a className="directions-button" href={directions} target="_blank" rel="noreferrer"><Icon name="pin" size={16}/> Get directions <Icon name="external" size={13}/></a><span>Hours, prices and the official booking link</span></div>
  </div>;
}
