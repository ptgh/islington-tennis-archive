import { Icon } from './Icon';
import type { Filter, Venue } from '../data/venues';
import { CourtPlanner, CourtComparison, listedTimeLabel } from './CourtPlanner';
import type { CourtAvailability } from './useCourtAvailability';
import type { PlannerPreferences } from '../data/courtPlanner';

interface Props {
  planner:PlannerPreferences;onPlanner:(value:PlannerPreferences)=>void;plannerError:boolean;availability:CourtAvailability;compareIds:string[];onCompare:(id:string)=>void;onClearCompare:()=>void;
  facility:string;onFacility:(value:string)=>void;
  favourites:string[];onFavourite:(id:string)=>void;savedOnly:boolean;onSavedOnly:(value:boolean)=>void;saveError:boolean;
  results: Venue[]; allVenues: Venue[]; query:string; onQuery:(value:string)=>void;
  filter:Filter; onFilter:(value:Filter)=>void;
  onSelect:(id:string)=>void; onAbout:()=>void;
}
export function CourtDirectory({facility,onFacility,results,allVenues,query,onQuery,filter,onFilter,onSelect,onAbout,favourites,onFavourite,savedOnly,onSavedOnly,saveError,planner,onPlanner,plannerError,availability,compareIds,onCompare,onClearCompare}:Props) {
  return <>
    <div className="directory-heading">
      <h1 tabIndex={-1}>Find your <br/>next court.</h1>
      <p>A local guide to your next hit.<br/>One connected map of Islington.</p>
    </div>
    <div className="directory-tools">
      <label className="search-box"><Icon name="search" size={19}/><input aria-label="Search courts or neighbourhoods" placeholder="Search courts or neighbourhoods" value={query} onChange={e=>onQuery(e.target.value)}/>{query && <button aria-label="Clear search" className="clear-search" onClick={()=>onQuery('')}><Icon name="close" size={15}/></button>}</label>
      <div className="filters" aria-label="Court access filters">
        {([['all','All courts'],['public','Public'],['restricted','Other access']] as const).map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>onFilter(id)}>{label}</button>)}
      </div>

      <fieldset className="facility-options"><legend>Facilities</legend><div>{[['all','Any'],['indoor','Indoor'],['floodlit','Floodlit']].map(([value,label])=><label key={value}><input type="radio" name="court-facility" value={value} checked={facility===value} onChange={()=>onFacility(value)}/><span>{label}</span></label>)}</div></fieldset>
      {facility!=='all'&&<small className="saved-note">Facilities describe the venue. Listed times may include other court types; confirm your chosen court with the operator.</small>}
      <CourtPlanner preferences={planner} onChange={onPlanner} storageError={plannerError} availability={availability} savedCount={favourites.length} savedWithTimes={favourites.filter(id=>availability.next[id]).length}/>
      <label className="saved-filter"><input type="checkbox" checked={savedOnly} onChange={e=>onSavedOnly(e.target.checked)}/> Favourite courts only</label><small className="saved-note">{saveError?'Browser storage unavailable — saved for this visit only.':'Favourites saved on this browser.'}</small>
    </div>
    <CourtComparison venues={allVenues.filter(venue=>compareIds.includes(venue.id))} availability={availability} onClear={onClearCompare} onDetails={onSelect}/>
    <div className="results-heading"><span>{results.length} {results.length===1?'place':'places'} to play</span><span>{compareIds.length>0?<button className="text-button" onClick={()=>document.querySelector('.court-comparison')?.scrollIntoView({block:'start'})}>View comparison ({compareIds.length})</button>:<>Explore <Icon name="arrow" size={13}/></>}</span></div>
    <div className="court-list" aria-label="Tennis court results" aria-live="polite">
      {results.map(venue=><div className="saved-court-row" key={venue.id}><button className="court-row" key={venue.id} data-venue-id={venue.id} onClick={()=>onSelect(venue.id)}>
        <span className={`court-icon ${venue.access!=='public'?'restricted':''}`}><Icon name="court" size={27}/></span>
        <span className="court-row-copy"><span className="court-name">{venue.name}</span><span className="court-summary">{venue.summary}</span><span className="court-row-time">{listedTimeLabel(venue,availability)}</span>{venue.nearby&&<span className="outside-label">{venue.area}</span>}</span>
        <span className="court-row-number">{String(allVenues.indexOf(venue)+1).padStart(2,'0')}</span>
        <Icon name="arrow" size={18}/>
      </button><div className="court-row-tools"><button className="save-court" aria-pressed={favourites.includes(venue.id)} aria-label={`${favourites.includes(venue.id)?'Unsave':'Save'} ${venue.name}`} onClick={()=>onFavourite(venue.id)}>{favourites.includes(venue.id)?'★':'☆'}</button><button className="compare-court" aria-pressed={compareIds.includes(venue.id)} aria-label={`${compareIds.includes(venue.id)?'Remove':'Compare'} ${venue.name}`} disabled={compareIds.length>=3&&!compareIds.includes(venue.id)} onClick={()=>onCompare(venue.id)}>{compareIds.includes(venue.id)?'Added':'Compare'}</button></div></div>)}
      {!results.length&&<div className="empty-state"><Icon name="search" size={26}/><h2>{planner.listedOnly?availability.loading?'Checking listed times…':'No listed times matched':'No courts found'}</h2><p>{planner.listedOnly?'This does not confirm that courts are full. Try a different window or check the operator.':'Try another place or reset your filters.'}</p><button className="text-button" onClick={()=>{onQuery('');onFilter('all');onFacility('all');onSavedOnly(false);onPlanner({...planner,listedOnly:false});}}>Reset search <Icon name="arrow" size={16}/></button></div>}
    </div>
    <div className="directory-footer"><span>Good places. More play.</span><button onClick={onAbout} aria-label="About directory coverage"><Icon name="info" size={16}/></button></div>
  </>;
}
