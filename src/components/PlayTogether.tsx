import { SelectField } from './SelectField';
import { useEffect, useRef, useState } from 'react';
import { PLAY_VERIFIED_DATE, type PlayFilter, type PlayOpportunity } from '../data/play';
import { Icon } from './Icon';

type CourtChoice = {id:string;name:string};
const filterLabels: Record<PlayFilter,string> = {all:'All',social:'Social sessions',partners:'Find a partner',today:'Play today'};

export function PlayDirectory({results,filter,onFilter,venueId,onVenue,venues,onSelect}:{results:PlayOpportunity[];filter:PlayFilter;onFilter:(filter:PlayFilter)=>void;venueId:string|null;onVenue:(id:string|null)=>void;venues:CourtChoice[];onSelect:(id:string)=>void}) {
  const [week,setWeek]=useState(false);
  return <>
    <div className="directory-heading play-heading"><h1 tabIndex={-1}>Play<br/> together.</h1><p>A familiar court.<br/>A few new faces.</p></div>
    <p className="play-intro">Choose a people pin to discover local groups and ways to find an opponent.</p>
    <div className="play-tools">
      <div className="filters play-filters" role="group" aria-label="Ways to play">{(['all','social','partners','today'] as const).map(kind=><button key={kind} aria-pressed={kind===filter} onClick={()=>onFilter(kind)}>{filterLabels[kind]}</button>)}</div>
      <div className="play-court-filter"><SelectField label="Court" value={venueId??''} onChange={value=>onVenue(value||null)} options={[{value:'',label:'All courts'},...venues.map(venue=>({value:venue.id,label:venue.name}))]}/></div>
    </div>
    {filter==='today'&&<p className="play-intro">Published weekly sessions for today in London, including earlier sessions. Confirm times, weather and spaces with the organiser.</p>}
    <button className="text-button play-intro" aria-expanded={week} onClick={()=>setWeek(!week)}>{week?'Hide weekly sessions':'Weekly social calendar →'}</button>
    {week&&<div className="weekly-calendar" aria-label="Published weekly social calendar"><p className="play-context">Usual weekly programme for your current filters · confirm with organisers.</p>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><details key={day}><summary>{day} · {results.filter(item=>item.weekdays?.includes(day)).length} {results.filter(item=>item.weekdays?.includes(day)).length===1?'session':'sessions'}</summary>{results.filter(item=>item.weekdays?.includes(day)).map(item=><button className="court-row" key={item.id} onClick={()=>onSelect(item.id)}><span className="court-row-copy"><span className="court-name">{item.name}</span><span className="court-summary">{item.when}</span><span className="outside-label">{item.area}</span></span><Icon name="arrow" size={15}/></button>)}</details>)}</div>}
    <div className="results-heading play-results"><span role="status">{results.length} {results.length===1?'way':'ways'} to play</span><span>Explore <Icon name="arrow" size={12}/></span></div>
    <div className="court-list play-list" aria-label="Social tennis and partner options">
      {results.map(item=><button className="court-row play-row" key={item.id} data-play-id={item.id} onClick={()=>onSelect(item.id)}><span className={`court-icon play-icon ${item.kind}`}><Icon name={item.kind==='social'?'people':'ball'} size={24}/></span><span className="court-row-copy"><span className="play-kind">{item.kind==='social'?'Social session':'Find a partner'}</span><span className="court-name">{item.name}</span><span className="court-summary">{item.summary}</span><span className="outside-label">{item.area}</span></span><Icon name="arrow" size={15}/></button>)}
      {!results.length&&<div className="empty-state"><Icon name="people" size={30}/><h2>No listed options here yet.</h2><p>Try another court or see all the ways to play.</p><button className="text-button" onClick={()=>{onFilter('all');onVenue(null);}}>Show all options <Icon name="arrow" size={15}/></button></div>}
    </div>
    <div className="play-footnote">Pins show programmes, not live players.<br/>Checked {PLAY_VERIFIED_DATE} · Join with the organiser.</div>
  </>;
}

export function PlayDetail({opportunity,onBack,onCourt,onLocate,venues}:{opportunity:PlayOpportunity;onBack:()=>void;onCourt:(id:string)=>void;onLocate:(id:string)=>void;venues:CourtChoice[]}) {
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[opportunity.id]);
  const courts=venues.filter(venue=>opportunity.venueIds.includes(venue.id));
  return <div className="court-detail play-detail">
    <button className="back-button" onClick={onBack}><Icon name="back" size={17}/> All play options</button>
    <div className="detail-scroll">
      <div className="access-label"><span/>{opportunity.kind==='social'?'Social session':'Find a partner'}</div>
      <h1 ref={heading} tabIndex={-1}>{opportunity.name}</h1><p className="detail-area">{opportunity.area}</p>
      <div className="play-welcome"><Icon name="people" size={32}/><span>{opportunity.summary}</span></div>
      <p className="detail-description">{opportunity.description}</p>
      <dl className="play-facts"><div><dt>Who it suits</dt><dd>{opportunity.level}</dd></div><div><dt>When</dt><dd>{opportunity.when}</dd></div><div><dt>Joining</dt><dd>{opportunity.access}</dd></div></dl>
      <h2 className="small-heading">Find it on the map</h2><p className="play-context">{opportunity.venueContext}</p>
      {courts.map(court=><div className="play-court-actions" key={court.id}><button className="service-map-link" onClick={()=>onLocate(court.id)}><Icon name="pin" size={17}/><span>{court.name}<small>Show on the map</small></span><Icon name="arrow" size={15}/></button><button className="play-court-detail-link" onClick={()=>onCourt(court.id)}>Explore {court.name} <Icon name="arrow" size={12}/></button></div>)}
      <p className="access-note">{opportunity.note}</p>
      <details className="sources"><summary>Sources & details</summary><p>Checked {opportunity.checkedAt}. Published programmes are not a live availability calendar.</p>{opportunity.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<Icon name="external" size={12}/></a>)}</details>
    </div>
    <div className="detail-actions"><a className="primary-button" href={opportunity.url} target="_blank" rel="noreferrer">{opportunity.actionLabel}<Icon name="external" size={17}/></a><span>Opens the organiser · Joining and availability checked there</span></div>
  </div>;
}
