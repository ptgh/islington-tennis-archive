import { useEffect, useId, useRef } from 'react';
import { Icon } from './Icon';
import { CloseButton } from './CloseButton';
import './MapViewControl.css';

export function MapViewControl({ open, onOpenChange, onOrbit, onReset }: { open: boolean; onOpenChange: (open: boolean) => void; onOrbit: (yaw: number, pitch: number) => void; onReset: () => void }) {
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), first = useRef<HTMLButtonElement>(null);
  const close = () => { onOpenChange(false); trigger.current?.focus(); };
  useEffect(() => { if (open) first.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onOpenChange]);
  return <div ref={root} className="map-view-control" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <button ref={trigger} className="icon-button" title="Map view & gestures" aria-label="Map view & gestures" aria-expanded={open} aria-controls={id} onClick={() => onOpenChange(!open)}><Icon name="rotate"/></button>
    {open && <section id={id} className="map-view-panel" aria-label="Map view & gestures">
      <div className="map-view-heading"><h2>Map angle</h2><CloseButton label="Close map view" onClick={close}/></div>
      <div className="map-view-actions">
        <button ref={first} aria-label="Tilt lower" title="Tilt lower" onClick={() => onOrbit(0, .12)}><Icon name="arrow" style={{ rotate: '-90deg' }}/></button>
        <button aria-label="Look down" title="Look down" onClick={() => onOrbit(0, -.12)}><Icon name="arrow" style={{ rotate: '90deg' }}/></button>
        <button aria-label="Turn left" title="Turn left" onClick={() => onOrbit(-Math.PI / 8, 0)}><Icon name="back"/></button>
        <button aria-label="Turn right" title="Turn right" onClick={() => onOrbit(Math.PI / 8, 0)}><Icon name="arrow"/></button>
      </div>
      <button className="map-view-reset" onClick={onReset}><Icon name="reset" size={15}/> Reset view</button>
    </section>}
  </div>;
}
