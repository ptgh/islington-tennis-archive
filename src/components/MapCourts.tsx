import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CloseButton } from './CloseButton';
import './MapLayers.css';
import type { WatchableCourt } from '../scene/boroughGeometry';

/** Every court on the map in one list. Choosing one goes straight to its rally. */
export function MapCourts({ open, onOpenChange, groups, onWatch }: { open: boolean; onOpenChange: (open: boolean) => void; groups: { islington: WatchableCourt[]; nearby: WatchableCourt[] }; onWatch: (id: string) => void }) {
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const terms = query.trim().toLocaleLowerCase('en-GB').split(/\s+/);
  const matches = (courts: WatchableCourt[]) => courts.filter(court => terms.every(term => court.name.toLocaleLowerCase('en-GB').includes(term)));
  const local = matches(groups.islington), nearby = matches(groups.nearby);
  const close = () => { onOpenChange(false); trigger.current?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onOpenChange]);
  const list = (label: string, courts: WatchableCourt[]) => courts.length > 0 && <section aria-label={label}>
    <h3>{label}</h3>
    <ul>{courts.map(court => <li key={court.id}><button onClick={() => onWatch(court.id)}>
      <span>{court.name}</span>{court.courts !== null && <small>{court.courts} {court.courts === 1 ? 'court' : 'courts'}</small>}<Icon name="play" size={13}/>
    </button></li>)}</ul>
  </section>;
  return <div ref={root} className="map-courts" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <button ref={trigger} className="pill map-courts__trigger" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { if (!open) setQuery(''); onOpenChange(!open); }}><Icon name="play" size={14}/> Rallies</button>
    {open && <section id={id} className="map-courts__panel" aria-labelledby={`${id}-title`}>
      <div className="map-courts__header">
        <div className="map-courts__heading"><h2 id={`${id}-title`}>Watch a rally</h2><CloseButton label="Close rallies" onClick={close}/></div>
        <label className="map-courts__search"><Icon name="search" size={17}/><input type="search" aria-label="Search rally venues" placeholder="Search venues" value={query} onChange={event => setQuery(event.target.value)}/></label>
      </div>
      <div className="map-courts__results">
        {list('In Islington', local)}
        {list('Beyond Islington', nearby)}
        {!local.length && !nearby.length && <p role="status">No venues match your search.</p>}
      </div>
    </section>}
  </div>;
}
