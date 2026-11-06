import {useState} from 'react'
import {boroughAmenities,findBusStops,notedParks} from '../data/boroughAmenities'
import {SelectField} from './SelectField'
import './BoroughDiscovery.css'

export function BoroughDiscovery({onLocate}:{onLocate:(lat:number,lng:number,zoom?:number,name?:string)=>void}){
 const [allParks,setAllParks]=useState(false),[parkId,setParkId]=useState(''),[stopId,setStopId]=useState(''),[query,setQuery]=useState('')
 const parks=allParks?boroughAmenities.parks:notedParks,stops=findBusStops(query)
 const park=boroughAmenities.parks.find(p=>p.id===parkId),stop=boroughAmenities.busStops.find(p=>p.id===stopId)
 return <div className="borough-discovery">
  <details open><summary>Parks & green spaces</summary>
   <div className="discovery-filters"><button aria-pressed={!allParks} onClick={()=>setAllParks(false)}>Noted parks</button><button aria-pressed={allParks} onClick={()=>setAllParks(true)}>All green spaces</button></div>
   <SelectField label={`Explore ${parks.length} parks and gardens`} placeholder="Choose a green space" value={parkId} options={parks.map(p=>({value:p.id,label:`${p.name}${p.area==='Nearby'?' · Nearby':''}`}))} onChange={id=>{setParkId(id);const p=boroughAmenities.parks.find(p=>p.id===id);if(p)onLocate(p.lat,p.lng,24,p.name)}}/>
   {park&&<p><a href={park.url} target="_blank" rel="noreferrer">{park.name} · map source ↗</a></p>}
   <p>Map points help you explore; they are not marked entrances. Access and opening times vary. <a href="https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks" target="_blank" rel="noreferrer">Council park information ↗</a></p>
  </details>
  <details><summary>Bus stops</summary>
   <label className="discovery-search">Find a stop or street<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try Highbury, Angel or Holloway"/></label>
   <SelectField label="Visit a recorded bus stop" placeholder="Choose a stop" value={stopId} options={stops.map(p=>({value:p.id,label:`${p.name}${p.letter?' · '+p.letter:''}${p.area==='Nearby'?' · Nearby':''}`}))} onChange={id=>{setStopId(id);const p=boroughAmenities.busStops.find(p=>p.id===id);if(p)onLocate(p.lat,p.lng,40,`${p.name}${p.letter?' · Stop '+p.letter:''}`)}}/>
   <p role="status">{stops.length?`Showing up to ${stops.length} matches. Search for a name or street.`:'No recorded stops match. Try another street.'}</p>
   {stop&&<p><a href={stop.url} target="_blank" rel="noreferrer">{stop.url.includes('tfl.gov.uk')?'Routes & arrivals on TfL':'View stop map source'} ↗</a></p>}
   <p>Recorded stop locations, not live arrivals. <a href="https://tfl.gov.uk/maps/bus" target="_blank" rel="noreferrer">TfL bus map ↗</a></p>
  </details>
  <p className="discovery-source">OSM snapshot · {boroughAmenities.checked}. Nearby places are labelled. Street furniture and emergency miniatures are illustrative.</p>
 </div>
}
