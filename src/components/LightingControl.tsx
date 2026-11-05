import { CloseButton } from './CloseButton';
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { clockLabel, londonMinutes, londonPreviewTime } from '../data/lightingTime'
import { moonPhase, moonPosition, nextFullMoon, sunTimes } from '../data/skyCalendar'
import './LightingControl.css'

type Props = { night: boolean; time: number | null; onTime: (time: number | null) => void; onNight: () => void; open: boolean; onOpenChange: (open: boolean) => void }
export function LightingControl({ night, time, onTime, onNight, open, onOpenChange: setOpen }: Props) {
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId()
  const [now,setNow]=useState(()=>new Date())
  useEffect(()=>{if(!open)return;setNow(new Date());const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer)},[open])
  const date=time===null?now:new Date(time)
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
  const sun=useMemo(()=>sunTimes(date),[day])
  const moonSlot=Math.floor(date.getTime()/(6*3600000))
  const nextFull=useMemo(()=>nextFullMoon(date),[moonSlot])
  const phase=moonPhase(date)
  const position=moonPosition(date),moonId=useId(),terminator=Math.abs(1-2*phase.illumination)*16
  const eventTime=(value:number|null)=>value===null?'—':new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}).format(value)
  const previewEvent=(value:number|null)=>{if(value!==null)onTime(value)}
  const minutes = time === null ? Math.min(1425, Math.round(londonMinutes(new Date()) / 15) * 15) : londonMinutes(new Date(time))
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, setOpen])
  return <div className="lighting-control" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus() }
  }}>
    <button className="pill day-button" onClick={onNight} aria-label={night ? 'Switch to day' : 'Switch to night'}><Icon name={night ? 'moon' : 'sun'} size={17}/><span>{night ? 'Night' : 'Day'}</span></button>
    <button ref={trigger} className="pill lighting-trigger" aria-expanded={open} aria-controls={id} aria-label="Preview time of day" onClick={() => setOpen(!open)}>Time</button>
    {open && <div id={id} className="lighting-popover" role="group" aria-label="Time of day preview">
      <div className="lighting-heading"><strong>Follow the light.</strong><CloseButton label="Close time preview" onClick={() => { setOpen(false); trigger.current?.focus() }}/></div>
      <label htmlFor={`${id}-date`}>London date</label>
      <input id={`${id}-date`} className="lighting-date" aria-label="Preview date" type="date" min="1800-01-01" max="2100-12-31" value={day} onChange={event=>{if(event.target.validity.valid&&/^\d{4}-\d{2}-\d{2}$/.test(event.target.value))onTime(londonPreviewTime(new Date(`${event.target.value}T12:00:00Z`),minutes))}}/>
      <label htmlFor={`${id}-time`}>London time <output>{clockLabel(minutes)}</output></label>
      <input id={`${id}-time`} aria-label="London time" type="range" min="0" max="1425" step="15" value={Math.min(1425, minutes)} onChange={event => onTime(londonPreviewTime(date, Number(event.target.value)))}/>
      <div className="lighting-presets">{[['Morning', 480], ['Noon', 720], ['Evening', 1080], ['Night', 1320]].map(([label, value]) => <button key={label} aria-pressed={time !== null && minutes === value} onClick={() => onTime(londonPreviewTime(date, Number(value)))}>{label}</button>)}</div>
      <dl className="lighting-almanac"><div><dt>Sunrise</dt><dd><button onClick={()=>previewEvent(sun.sunrise)} disabled={sun.sunrise===null} aria-label="Preview sunrise">{eventTime(sun.sunrise)}</button></dd></div><div><dt>Sunset</dt><dd><button onClick={()=>previewEvent(sun.sunset)} disabled={sun.sunset===null} aria-label="Preview sunset">{eventTime(sun.sunset)}</button></dd></div></dl>
      <div className="lighting-moon"><svg className="lighting-moon-icon" viewBox="0 0 40 40" aria-hidden="true"><defs><clipPath id={moonId}><circle cx="20" cy="20" r="16"/></clipPath></defs><circle cx="20" cy="20" r="16" fill="#ccd3bf"/><g clipPath={`url(#${moonId})`} transform={phase.waxing?'':'translate(40 0) scale(-1 1)'}><path d="M20 4 A16 16 0 0 1 20 36 Z" fill="#f0dfaa"/><ellipse cx="20" cy="20" rx={terminator} ry="16" fill={phase.illumination>.5?'#f0dfaa':'#ccd3bf'}/></g><circle cx="20" cy="20" r="16" fill="none" stroke="#8a9b81" strokeWidth=".7"/></svg><div><strong>{phase.name}</strong><small>{Math.round(phase.illumination*100)}% illuminated · Next full moon around {new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short'}).format(nextFull)}</small><small className="lighting-moon-position"><span aria-hidden="true" style={{display:'inline-block',transform:`rotate(${position.bearing}deg)`}}>↑</span> {position.compass} · {Math.round(position.bearing)}° from north<br/>{Math.round(Math.abs(position.elevation))}° {position.aboveHorizon?'above':'below'} the horizon</small></div></div>
      <p className="lighting-estimate">Estimated for Islington · London local time.</p>
      <p>{time === null ? 'Day / Night view' : 'Previewing this date'} · sunlight and moonlight change with the season and lunar phase.</p>
      <button className="lighting-reset" onClick={() => onTime(null)} disabled={time === null}>Reset time preview</button>
    </div>}
  </div>
}
