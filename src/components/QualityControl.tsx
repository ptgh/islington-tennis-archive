import { useEffect, useId, useRef } from 'react'
import { Icon } from './Icon'
import { QUALITY_PRESETS, type QualityPreset, type ViewSettings } from '../data/viewQuality'
import './QualityControl.css'

type Props = { settings: ViewSettings; onChange: (settings: ViewSettings) => void; open: boolean; onOpenChange: (open: boolean) => void }

export function QualityControl({ settings, onChange, open, onOpenChange }: Props) {
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement>(null)
  const id = useId()
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLInputElement>('input:checked')?.focus()
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, onOpenChange])
  const close = () => { onOpenChange(false); trigger.current?.focus() }
  return <div ref={root} className="quality-control" onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close() }
  }}>
    <button ref={trigger} className="icon-button quality-trigger" aria-label="Picture quality" title="Picture quality" aria-expanded={open} aria-controls={id} onClick={() => onOpenChange(!open)}><Icon name="layers" size={17}/><span>Quality</span></button>
    {open && <section ref={panel} id={id} className="quality-panel" aria-label="Picture quality settings">
      <div className="quality-heading"><h2>Picture quality</h2><button aria-label="Close picture quality" onClick={close}><Icon name="close" size={17}/></button></div>
      <p>For Islington, Wimbledon and Queen’s.</p>
      <fieldset><legend>Rendering</legend>{(Object.keys(QUALITY_PRESETS) as QualityPreset[]).map(preset => <label className="quality-option" key={preset}>
        <input type="radio" name={`${id}-preset`} value={preset} checked={settings.preset === preset} onChange={() => onChange({ ...settings, preset })}/>
        <span><strong>{QUALITY_PRESETS[preset].label}</strong><small>{QUALITY_PRESETS[preset].description}</small></span>
      </label>)}</fieldset>
      <label className="quality-focus"><input type="checkbox" checked={settings.sharp} onChange={event => onChange({ ...settings, sharp: event.target.checked })}/><span><strong>Sharper focus</strong><small>Less photographic blur across the scene.</small></span></label>
    </section>}
  </div>
}
