import { useEffect, useId, useRef } from 'react';
import { Icon } from './Icon';
import './MapLayers.css';
import type { WatchableCourt } from '../scene/boroughGeometry';

/** Every court on the map in one list. Choosing one goes straight to its rally. */
export function MapCourts({ open, onOpenChange, groups, onWatch }: { open: boolean; onOpenChange: (open: boolean) => void; groups: { islington: WatchableCourt[]; nearby: WatchableCourt[] }; onWatch: (id: string) => void }) {
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onOpenChange]);
  const list = (label: string, courts: WatchableCourt[]) => <section aria-label={label}>
    <h3>{label}</h3>
    <ul>{courts.map(court => <li key={court.id}><button onClick={() => onWatch(court.id)}>
      <span>{court.name}</span>{court.courts !== null && <small>{court.courts}</small>}<Icon name="play" size={11}/>
    </button></li>)}</ul>
  </section>;
  return <div ref={root} className="map-courts" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); onOpenChange(false); trigger.current?.focus({ preventScroll: true }); } }}>
    <button ref={trigger} className="pill map-courts__trigger" aria-expanded={open} aria-controls={id} onClick={() => onOpenChange(!open)}><Icon name="court" size={14}/> Courts</button>
    {open && <div id={id} className="map-courts__panel">
      <h2>Watch a rally</h2>
      {list('In Islington', groups.islington)}
      {list('Beyond Islington', groups.nearby)}
    </div>}
  </div>;
}
