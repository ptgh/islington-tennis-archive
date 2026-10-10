import { useEffect, useId, useRef } from 'react'
import { Icon } from './Icon'
import { clockLabel, londonMinutes, londonPreviewTime } from '../data/lightingTime'
import './LightingControl.css'

type Props = { night: boolean; time: number | null; onTime: (time: number | null) => void; onNight: () => void; open: boolean; onOpenChange: (open: boolean) => void }
export function LightingControl({ night, time, onTime, onNight, open, onOpenChange: setOpen }: Props) {
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId()
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
      <div className="lighting-heading"><strong>Follow the light.</strong><button aria-label="Close time preview" onClick={() => { setOpen(false); trigger.current?.focus() }}><Icon name="close" size={16}/></button></div>
      <label htmlFor={`${id}-time`}>London time <output>{clockLabel(minutes)}</output></label>
      <input id={`${id}-time`} aria-label="London time" type="range" min="0" max="1425" step="15" value={Math.min(1425, minutes)} onChange={event => onTime(londonPreviewTime(new Date(), Number(event.target.value)))}/>
      <div className="lighting-presets">{[['Morning', 480], ['Noon', 720], ['Evening', 1080], ['Night', 1320]].map(([label, value]) => <button key={label} aria-pressed={time !== null && minutes === value} onClick={() => onTime(londonPreviewTime(new Date(), Number(value)))}>{label}</button>)}</div>
      <p>{time === null ? 'Day / Night view' : 'Previewing today'} · sunlight and moonlight change with the season and lunar phase.</p>
      <button className="lighting-reset" onClick={() => onTime(null)} disabled={time === null}>Reset time preview</button>
    </div>}
  </div>
}
