import { CloseButton } from './CloseButton';
import { SelectField } from './SelectField';
import { Icon } from './Icon';
import {useEffect,useState} from 'react';
import type {WeatherSceneKind} from '../scene/createWeather';
import {fetchForecast,weatherKind,weatherLabel,type ForecastHour} from '../data/weather';
const hourLabel=(time:number)=>new Intl.DateTimeFormat('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(time);
export function Weather({onWeather,open,onOpenChange:setOpen}:{onWeather:(kind:WeatherSceneKind,windMph?:number)=>void;open:boolean;onOpenChange:(open:boolean)=>void}){
  const [enabled,setEnabled]=useState(true),[hours,setHours]=useState<ForecastHour[]>([]),[status,setStatus]=useState(''),[refresh,setRefresh]=useState(0),[selected,setSelected]=useState(0),[effects,setEffects]=useState(true),[demo,setDemo]=useState(false),[fetched,setFetched]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let alive=true
    const timeout=setTimeout(()=>controller.abort(),24000)
    setStatus('Loading forecast…')
    fetchForecast(controller.signal).then(rows=>{
      if(!alive)return
      const fetchedAt=Date.now()
      setHours(rows);setSelected(0);setFetched(fetchedAt);setStatus('')
      try{localStorage.setItem('islington-tennis:forecast',JSON.stringify({hours:rows,fetchedAt}))}catch{/* Forecast works without storage. */}
    }).catch(()=>{
      if(!alive)return
      let cached:ForecastHour[]=[];let fetchedAt=0
      try{
        const value=JSON.parse(localStorage.getItem('islington-tennis:forecast')??'null')
        if(value&&Date.now()-value.fetchedAt>=0&&Date.now()-value.fetchedAt<3*3600000&&Array.isArray(value.hours)){
          cached=value.hours.filter((h:ForecastHour)=>h&&['time','temperature','rain','wind','code'].every(key=>typeof h[key as keyof ForecastHour]==='number'&&Number.isFinite(h[key as keyof ForecastHour]))&&h.time>=Date.now()-3600000)
          fetchedAt=value.fetchedAt
        }
      }catch{/* No usable saved forecast. */}
      setHours(cached);setSelected(0);setFetched(cached.length?fetchedAt:0)
      setStatus(cached.length?'Live refresh unavailable · Showing the last saved forecast.':'Forecast unavailable. Check your connection and refresh to try again.')
    }).finally(()=>clearTimeout(timeout))
    return()=>{alive=false;controller.abort();clearTimeout(timeout)}
  },[refresh])
  useEffect(()=>{
    const update=()=>{if(!document.hidden)setRefresh(value=>value+1);};
    const timer=window.setInterval(update,15*60*1000);
    document.addEventListener('visibilitychange',update);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',update);};
  },[]);
  const hour=hours[selected],kind=demo?'rain':hour?weatherKind(hour.code):'clear';
  const show=enabled&&(demo||(effects&&!!hour));
  useEffect(()=>{onWeather(show?kind:'clear',show&&!demo?hour?.wind:undefined);},[show,kind,hour?.wind,demo,onWeather]);
  return <>
    <div className="weather-widget"><div className="weather-actions"><button className="pill" aria-expanded={open} aria-controls="weather-panel" onClick={()=>setOpen(!open)}><span>Forecast</span></button></div>
    {open&&<section id="weather-panel" className="weather-panel" aria-label="Islington weather forecast"><div className="weather-heading"><h2>Court weather</h2><CloseButton label="Close weather" onClick={()=>setOpen(false)}/></div><p>Islington area · Next 48 hours</p><label className="weather-check"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Weather effects on map</label><p role="status">{status}</p>
    {hour&&<><SelectField label="Forecast time" value={String(selected)} onChange={value=>{setSelected(Number(value));setDemo(false);}} options={hours.map((h,i)=>({value:String(i),label:(i===0&&h.time<=Date.now()?'Now · ':'')+hourLabel(h.time)}))}/><strong>{Math.round(hour.temperature)}°C · {weatherLabel(hour.code)}</strong><dl><div><dt>Chance of precipitation</dt><dd>{hour.rain}%</dd></div><div><dt>Wind</dt><dd>{Math.round(hour.wind)} mph</dd></div></dl><label className="weather-check"><input type="checkbox" checked={effects} onChange={e=>{setEffects(e.target.checked);setDemo(false);setEnabled(true);}}/> Show forecast on map</label></>}
    <button className="text-button" aria-pressed={demo} onClick={()=>{setDemo(!demo);setEnabled(true);}}>{demo?'Stop rain preview':'Preview rain animation'}</button><button className="text-button" onClick={()=>setRefresh(refresh+1)}>Refresh forecast</button><p>Modelled area conditions and forecast, not court-level radar or a playing-surface report. Rain preview is decorative.</p><p><a className="weather-source" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo <Icon name="external" size={12}/></a>{fetched?` · Fetched ${hourLabel(fetched)}`:''}</p></section>}
    </div>
  </>;
}
