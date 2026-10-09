import { Icon } from './Icon';
import type { Filter, Venue } from '../data/venues';

interface Props {
  facility:string;onFacility:(value:string)=>void;
  favourites:string[];onFavourite:(id:string)=>void;savedOnly:boolean;onSavedOnly:(value:boolean)=>void;saveError:boolean;
  results: Venue[]; allVenues: Venue[]; query:string; onQuery:(value:string)=>void;
  filter:Filter; onFilter:(value:Filter)=>void;
  onSelect:(id:string)=>void; onAbout:()=>void;
}
export function CourtDirectory({facility,onFacility,results,allVenues,query,onQuery,filter,onFilter,onSelect,onAbout,favourites,onFavourite,savedOnly,onSavedOnly,saveError}:Props) {
  return <>
    <div className="directory-heading">
      <h1 tabIndex={-1}>Find your <br/>next court.</h1>
      <p>A little world of tennis,<br className="desktop-break"/> right on your doorstep.</p>
    </div>
    <div className="directory-tools">
      <label className="search-box"><Icon name="search" size={19}/><input aria-label="Search courts or neighbourhoods" placeholder="Search courts or neighbourhoods" value={query} onChange={e=>onQuery(e.target.value)}/>{query && <button aria-label="Clear search" className="clear-search" onClick={()=>onQuery('')}><Icon name="close" size={15}/></button>}</label>
      <div className="filters" aria-label="Court access filters">
        {([['all','All courts'],['public','Public'],['restricted','Other access']] as const).map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>onFilter(id)}>{label}</button>)}
      </div>

      <fieldset className="facility-options"><legend>Facilities</legend><div>{[['all','Any'],['indoor','Indoor'],['floodlit','Floodlit']].map(([value,label])=><label key={value}><input type="radio" name="court-facility" value={value} checked={facility===value} onChange={()=>onFacility(value)}/><span>{label}</span></label>)}</div></fieldset>
      <label className="saved-filter"><input type="checkbox" checked={savedOnly} onChange={e=>onSavedOnly(e.target.checked)}/> Favourite courts only</label><small className="saved-note">{saveError?'Browser storage unavailable — saved for this visit only.':'Favourites saved on this browser.'}</small>
    </div>
    <div className="results-heading"><span>{results.length} {results.length===1?'place':'places'} to play</span><span>Explore <Icon name="arrow" size={13}/></span></div>
    <div className="court-list" aria-label="Tennis court results" aria-live="polite">
      {results.map(venue=><div className="saved-court-row" key={venue.id}><button className="court-row" key={venue.id} data-venue-id={venue.id} onClick={()=>onSelect(venue.id)}>
        <span className={`court-icon ${venue.access!=='public'?'restricted':''}`}><Icon name="court" size={27}/></span>
        <span className="court-row-copy"><span className="court-name">{venue.name}</span><span className="court-summary">{venue.summary}</span>{venue.nearby&&<span className="outside-label">{venue.area}</span>}</span>
        <span className="court-row-number">{String(allVenues.indexOf(venue)+1).padStart(2,'0')}</span>
        <Icon name="arrow" size={18}/>
      </button><button className="save-court" aria-pressed={favourites.includes(venue.id)} aria-label={`${favourites.includes(venue.id)?'Unsave':'Save'} ${venue.name}`} onClick={()=>onFavourite(venue.id)}>{favourites.includes(venue.id)?'★':'☆'}</button></div>)}
      {!results.length&&<div className="empty-state"><Icon name="search" size={26}/><h2>No courts found</h2><p>Try another place or reset your filters.</p><button className="text-button" onClick={()=>{onQuery('');onFilter('all');onFacility('all');onSavedOnly(false);}}>Reset search <Icon name="arrow" size={16}/></button></div>}
    </div>
    <div className="directory-footer"><span>Good places. More play.</span><button onClick={onAbout} aria-label="About directory coverage"><Icon name="info" size={16}/></button></div>
  </>;
}
