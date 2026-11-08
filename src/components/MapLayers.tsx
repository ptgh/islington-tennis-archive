import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import './MapLayers.css';

/** On desktop the map layers fold behind one launcher. On phones the launcher is
 * hidden by CSS and the same layer buttons stay in their existing row. */
export function MapLayers({ open, onOpenChange, onCameras, onQuality, children }: { open: boolean; onOpenChange: (open: boolean) => void; onCameras: () => void; onQuality: () => void; children: ReactNode }) {
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onOpenChange]);
  return <div ref={root} className="map-layers" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); onOpenChange(false); trigger.current?.focus({ preventScroll: true }); } }}>
    <button ref={trigger} className="pill map-layers__trigger" aria-expanded={open} aria-controls={id} onClick={() => onOpenChange(!open)}><Icon name="layers" size={14}/> Map</button>
    <div id={id} className={`map-layers__panel${open ? ' map-layers__panel--open' : ''}`}>
      <h2 className="map-layers__title">On the map</h2>
      {children}
      <div className="map-layers__links">
        <button className="pill" onClick={onCameras}><Icon name="camera" size={15}/> Traffic cameras<Icon name="arrow" size={13}/></button>
        <button className="pill" onClick={onQuality}><Icon name="layers" size={15}/> Picture quality<Icon name="arrow" size={13}/></button>
      </div>
    </div>
  </div>;
}
