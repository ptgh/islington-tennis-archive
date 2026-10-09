import { useEffect, useRef } from 'react';
import { accessLabels, type Venue } from '../data/venues';
import { Icon } from './Icon';
import { LiveCourtTimes } from './LiveCourtTimes';

/** Hours, prices and the official booking link for one court, in the court panel style. */
export function CourtBooking({venue,onBack}:{venue:Venue;onBack:()=>void}) {
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[venue.id]);
  const url=venue.bookingUrl??venue.actionUrl;
  return <div className="court-detail">
    <button className="back-button" onClick={onBack}><Icon name="back" size={17}/> {venue.name}</button>
    <div className="detail-scroll">
      <div className={`access-label ${venue.access!=='public'?'restricted':''}`}><span/>{accessLabels[venue.access]}</div>
      <h1 ref={heading} tabIndex={-1}>Book {venue.name}</h1>
      <p className="detail-area">{venue.area}</p>
      <section className="court-approach" aria-label="Opening hours">
        <span className="court-approach__eyebrow">OPENING HOURS</span>
        <p>{venue.hours??'Opening hours are not published. Check the official site.'}</p>
      </section>
      <section className="court-approach" aria-label="Prices">
        <span className="court-approach__eyebrow">PRICES</span>
        <p>{venue.fees??'Prices are not published. Check the official site.'}</p>
        {venue.pricesUrl&&<a className="court-approach__source" href={venue.pricesUrl} target="_blank" rel="noreferrer">Official prices{venue.pricesChecked?` · checked ${venue.pricesChecked}`:''} <Icon name="external" size={12}/></a>}
      </section>
      <LiveCourtTimes venueId={venue.id}/>
      <p className="access-note">{venue.accessNote}</p>
    </div>
    <div className="detail-actions"><a className="primary-button" href={url} target="_blank" rel="noreferrer">{venue.bookingLabel??venue.actionLabel}<Icon name="external" size={17}/></a><span>Bookings and live availability are handled on the official site</span></div>
  </div>;
}
