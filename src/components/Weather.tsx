import { SelectField } from './SelectField';
import { Icon } from './Icon';
import {useEffect,useState} from 'react';
import type {WeatherSceneKind} from '../scene/createWeather';
import {parseForecast,WEATHER_URL,weatherKind,weatherLabel,type ForecastHour} from '../data/weather';
const hourLabel=(time:number)=>new Intl.DateTimeFormat('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(time);
export function Weather({onWeather,open,onOpenChange:setOpen}:{onWeather:(kind:WeatherSceneKind)=>void;open:boolean;onOpenChange:(open:boolean)=>void}){
  const [enabled,setEnabled]=useState(true),[hours,setHours]=useState<ForecastHour[]>([]),[status,setStatus]=useState(''),[refresh,setRefresh]=useState(0),[selected,setSelected]=useState(0),[effects,setEffects]=useState(false),[demo,setDemo]=useState(true),[fetched,setFetched]=useState(0);
  useEffect(()=>{if(!open)return;const controller=new AbortController();let alive=true;const timeout=setTimeout(()=>controller.abort(),12000);setStatus('Loading forecast…');
    fetch(WEATHER_URL,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(alive){setHours(parseForecast(data));setSelected(0);setFetched(Date.now());setStatus('');}}).catch(()=>{if(alive){setHours([]);setEffects(false);setStatus('Forecast unavailable. Try again shortly.');}}).finally(()=>clearTimeout(timeout));return()=>{alive=false;controller.abort();clearTimeout(timeout);};
  },[open,refresh]);
  const hour=hours[selected],kind=demo?'rain':hour?weatherKind(hour.code):'clear';
  const show=enabled&&(demo||(effects&&!!hour));
  useEffect(()=>{onWeather(show?kind:'clear');},[show,kind,onWeather]);
  return <>
    <div className="weather-widget"><div className="weather-actions"><button className="pill" aria-expanded={open} aria-controls="weather-panel" onClick={()=>setOpen(!open)}><span>Forecast</span></button></div>
    {open&&<section id="weather-panel" className="weather-panel" aria-label="Islington weather forecast"><div className="weather-heading"><h2>Court weather</h2><button aria-label="Close weather" onClick={()=>setOpen(false)}>×</button></div><p>Islington area · Next 48 hours</p><label className="weather-check"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Weather effects on map</label><p role="status">{status}</p>
    {hour&&<><SelectField label="Forecast time" value={String(selected)} onChange={value=>{setSelected(Number(value));setDemo(false);}} options={hours.map((h,i)=>({value:String(i),label:hourLabel(h.time)}))}/><strong>{Math.round(hour.temperature)}°C · {weatherLabel(hour.code)}</strong><dl><div><dt>Chance of precipitation</dt><dd>{hour.rain}%</dd></div><div><dt>Wind</dt><dd>{Math.round(hour.wind)} mph</dd></div></dl><label className="weather-check"><input type="checkbox" checked={effects} onChange={e=>{setEffects(e.target.checked);setDemo(false);setEnabled(true);}}/> Show forecast on map</label></>}
    <button className="text-button" aria-pressed={demo} onClick={()=>{setDemo(!demo);setEnabled(true);}}>{demo?'Stop rain preview':'Preview rain animation'}</button><button className="text-button" onClick={()=>setRefresh(refresh+1)}>Refresh forecast</button><p>Area forecast, not court-level radar or a playing-surface report. Rain preview is decorative.</p><p><a className="weather-source" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo <Icon name="external" size={12}/></a>{fetched?` · Fetched ${hourLabel(fetched)}`:''}</p></section>}
    </div>
  </>;
}
