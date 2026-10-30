import { useEffect, useRef } from 'react';
import { VERIFIED_DATE } from '../data/venues';
import { Icon } from './Icon';

export function AboutDialog({onClose}:{onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} className="about-dialog" aria-labelledby="about-heading" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <button className="dialog-close icon-button" onClick={onClose} aria-label="Close about the map"><Icon name="close"/></button>
    <Icon name="ball" size={38}/><h2 id="about-heading">A small world.<br/>A lot of tennis.</h2>
    <p>A local guide to finding your next hit, with a miniature Islington to wander around along the way.</p>
    <h3>What’s in the directory?</h3><p>Six researched venues in Islington: four public bookable venues, a shared free-play court at Spa Fields, and the school courts at Elizabeth Garrett Anderson. Coolhurst and Barbican are also included, both outside the borough.</p>
    <p>We include restricted courts when their existence is publicly documented. This is a growing directory, not a guarantee of every private or residential court. Clubs sharing a public venue are not counted as extra courts.</p>
    <h3>Booking your next game</h3><p>Booking links take you to the operator. Check current times, prices and eligibility there, and complete your reservation and payment on their website.</p>
    <h3>The map and its coverage</h3><p>The opening map follows Highbury’s stored OpenStreetMap snapshot checked 25 September 2026. Park polygons, building footprints, street centre-lines and all eleven court footprints share one geographic scale, with the tennis directory and court marker over the map.</p>
    <p>Heights, façades, road widths and planting appearance are illustrated. The Tennis Centre neighbourhood uses an additional OSM extract checked 30 October 2026, including the hall and two outdoor courts; indoor court positions are not mapped. Destinations outside these extracts, bus routes and miniature rallies use clearly labelled illustrated context, where courts are enlarged for clarity. Players and vehicles are animations, not live tracking. The home button returns to mapped Highbury; use official directions for your journey.</p>
    <p className="transport-credit">Highbury, Islington Tennis Centre, Wimbledon and Queen’s Club geometry © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, available under the Open Database Licence.</p>
    <h3>More ways to play</h3><p>The coaching and gear guides link to independently operated services. Current sessions, stock and prices are checked on their websites. Bus routes use a simplified TfL route snapshot checked on 21 September 2026; visit TfL for live travel information.</p>
    <p className="transport-credit">Powered by <a href="https://tfl.gov.uk/info-for/open-data-users/" target="_blank" rel="noreferrer">TfL Open Data</a>. Contains OS data © Crown copyright and database rights 2016. Geomni UK Map data © and database rights [2019].</p>
    <h3>Follow the wider game</h3><p>The Tennis atlas brings Wimbledon, The Queen’s Club and a curated tournament calendar into view, with Islington always our home. Visit the <a href="https://www.lta.org.uk/play/" target="_blank" rel="noreferrer">LTA</a> for ways to play and improve, or explore its <a href="https://www.lta.org.uk/fan-zone/event-calendar/" target="_blank" rel="noreferrer">official tournament calendar</a>. Event dates carry their own source and review date.</p>
    <p className="about-credit">Inspired by <a href="https://avon.town/" target="_blank" rel="noreferrer">Avon’s miniature world</a>. Built as an independent local guide, with no affiliation to venues, the LTA or TfL.</p>
    <footer>Venue sources are linked in each listing.<br/>Research checked {VERIFIED_DATE}.</footer>
  </dialog>;
}
