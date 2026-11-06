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
    {open && <section id={id} className="map-view-panel" aria-label="Map view & gestures"><div className="map-view-heading"><h2>Find your angle</h2><CloseButton label="Close map view" onClick={close}/></div><p className="map-view-desktop-help">Hold Shift and scroll with two fingers to tilt or turn. You can also right-drag, or use these controls.</p><p className="map-view-touch-help">Choose an angle below, or use two fingers to tilt and turn.</p><div className="map-view-actions"><button ref={first} onClick={() => onOrbit(0, .12)}>Tilt lower</button><button onClick={() => onOrbit(0, -.12)}>Look down</button><button onClick={() => onOrbit(-Math.PI / 8, 0)}>Turn left</button><button onClick={() => onOrbit(Math.PI / 8, 0)}>Turn right</button></div><button className="text-button" onClick={onReset}>Reset view</button><p className="map-view-note">Scroll or pinch to zoom. On a touchscreen, use two fingers to tilt and turn.</p></section>}
  </div>;
}
