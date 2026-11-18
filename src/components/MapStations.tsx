import { useEffect, useId, useRef, useState } from 'react';
import { mapStations } from '../data/transit';
import { boroughGeography } from '../scene/boroughGeometry';
import { CloseButton } from './CloseButton';
import { Icon } from './Icon';
import './MapStations.css';

const [west,south,east,north]=boroughGeography.bbox;
const stops=mapStations.filter(s=>s.lng>=west&&s.lng<=east&&s.lat>=south&&s.lat<=north).sort((a,b)=>a.name.localeCompare(b.name));
export function MapStations({open,onOpenChange,labels,onLabels,onLocate}:{open:boolean;onOpenChange:(open:boolean)=>void;labels:boolean;onLabels:()=>void;onLocate:(lat:number,lng:number,name:string)=>void}){
 const id=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [query,setQuery]=useState('');
 const terms=query.toLocaleLowerCase('en-GB').trim().replace(/[’']/g,'').split(/\s+/);
 const results=stops.filter(s=>terms.every(term=>`${s.name} ${s.lines}`.toLocaleLowerCase('en-GB').replace(/[’']/g,'').includes(term)));
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))onOpenChange(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open,onOpenChange]);
 const close=()=>{onOpenChange(false);trigger.current?.focus({preventScroll:true});};
 return <div ref={root} className="map-stations" onKeyDown={e=>{if(open&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}}>
  <button ref={trigger} className="pill" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>{if(!open)setQuery('');onOpenChange(!open);}}><span className="roundel tiny"/> Stations</button>
  {open&&<section className="map-stations__panel" id={id} aria-labelledby={`${id}-title`}>
   <div className="map-stations__header"><div><h2 id={`${id}-title`}>Stations nearby</h2><CloseButton label="Close stations" onClick={close}/></div><p>Tube and rail stops within this map. Choose one to explore.</p>
   <label className="map-stations__search"><Icon name="search" size={16}/><input type="search" aria-label="Search stations or lines" placeholder="Station or line" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <button className="map-stations__labels" aria-pressed={labels} onClick={onLabels}>Station labels <span>{labels?'On':'Off'}</span></button></div>
   <ul>{results.map(stop=><li key={stop.name}><button onClick={()=>onLocate(stop.lat,stop.lng,stop.name)}><span><strong>{stop.name}</strong><small>{stop.lines}</small></span><Icon name="arrow" size={15}/></button></li>)}{!results.length&&<li className="map-stations__empty" role="status">No stations match your search.</li>}</ul>
   <a className="map-stations__journey" href="https://tfl.gov.uk/plan-a-journey/" target="_blank" rel="noreferrer">Plan a journey with TfL <Icon name="external" size={13}/></a>
  </section>}
 </div>;
}
